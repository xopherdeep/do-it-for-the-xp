import { defineStore } from "pinia";
import { computed, onScopeDispose, ref, watch } from "vue";
import { usesHashHistory } from "@/router/historyMode";
import { getProDb } from "@/lib/databases/ProDb";
import { compassSiteRoot } from "@/lib/api/apiHost";
import { CachedLicense, isPro as entitled, needsRecheck } from "@/lib/services/pro/entitlement";
import { adoptFamily, ensureIdentity } from "@/lib/services/pro/familyIdentity";
import * as proClient from "@/lib/services/pro/proClient";
import { ProClientError, ProStatus } from "@/lib/services/pro/proClient";
import { ProGate, ProPlanId } from "@/lib/services/pro/proPlans";
import { DEVICE_LIMIT_MESSAGE, openProUpsell, proToast } from "@/lib/services/pro/proUi";

/** Where Stripe sends the parent back, shaped for the router's history mode. */
const proReturnUrl = (): string =>
  usesHashHistory()
    ? `${window.location.origin}${window.location.pathname}#/pro/return`
    : `${window.location.origin}/pro/return`;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The XP Pro state of this install: the cached license, Pro or not, and the actions that change it. */
export const useProStore = defineStore("pro", () => {
  const license = ref<CachedLicense | null>(null);
  const familyId = ref("");
  const deviceId = ref("");
  const loading = ref(false);

  /** Ticks every hour so isPro and needsRecheck notice an expiry without a reload. */
  const now = ref(new Date());
  const isPro = computed(() => entitled(license.value, now.value, process.env.NODE_ENV === "production"));
  const plan = computed(() => license.value?.plan ?? null);
  const expiresAt = computed(() => license.value?.expiresAt ?? null);
  const licenseKey = computed(() => license.value?.key ?? "");

  async function persist() {
    await getProDb().saveState({ familyId: familyId.value, deviceId: deviceId.value, license: license.value });
  }

  function cacheFrom(status: ProStatus) {
    now.value = new Date();
    license.value = {
      key: status.licenseKey,
      plan: status.plan,
      expiresAt: status.expiresAt,
      env: status.env,
      pro: status.pro,
      lastValidatedAt: now.value.toISOString(),
    };
  }

  /** Ask the server again. A network or server error keeps what is cached; a 404 turns Pro off but keeps the key. */
  let rechecking: Promise<void> | null = null;
  function recheck(): Promise<void> {
    if (!rechecking) rechecking = doRecheck().finally(() => (rechecking = null));
    return rechecking;
  }

  async function doRecheck(): Promise<void> {
    loading.value = true;
    try {
      const key = license.value?.key;
      const status = key
        ? await proClient.validate(key, deviceId.value)
        : await proClient.claim(familyId.value, deviceId.value);
      if (status) {
        cacheFrom(status);
        await persist();
      } else if (license.value) {
        now.value = new Date();
        license.value = { ...license.value, pro: false, lastValidatedAt: now.value.toISOString() };
        await persist();
      }
    } catch (e) {
      if (!(e instanceof ProClientError)) throw e;
      // offline, rate limited or the server is down: the cached state stands
    } finally {
      loading.value = false;
    }
  }

  let disposed = false;
  let clockTimer: ReturnType<typeof setInterval> | null = null;
  let backgroundTimer: ReturnType<typeof setTimeout> | null = null;
  let backgroundRunning = false;

  onScopeDispose(() => {
    disposed = true;
    if (clockTimer) clearInterval(clockTimer);
    if (backgroundTimer) clearTimeout(backgroundTimer);
  });

  /** A recheck nobody waits for: a failure keeps the cached state, anything else is ignored. */
  function recheckInBackground() {
    recheck().catch(() => undefined);
  }

  function startClock() {
    if (clockTimer) return;
    clockTimer = setInterval(() => {
      now.value = new Date();
    }, 60 * 60 * 1000);
    (clockTimer as unknown as { unref?: () => void }).unref?.();
    watch(
      () => needsRecheck(license.value, now.value),
      (due) => {
        if (due && !disposed) recheckInBackground();
      }
    );
  }

  let initPromise: Promise<void> | null = null;

  /**
   * Load the identity and the cached license. With a cache this resolves at once and any recheck runs in the
   * background; with no cache at all the first claim is awaited, because there is nothing to show yet.
   */
  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        const identity = await ensureIdentity();
        familyId.value = identity.familyId;
        deviceId.value = identity.deviceId;
        const stored = await getProDb().getState();
        license.value = stored?.license ?? null;
        now.value = new Date();
        const due = needsRecheck(license.value, now.value);
        startClock();
        if (due) {
          if (license.value) recheckInBackground();
          else await recheck();
        }
      })().catch((e) => {
        initPromise = null;
        throw e;
      });
    }
    return initPromise;
  }

  /** One claim; true when it came back Pro (the license is cached). A lapsed family answers 200 with pro:false. */
  async function attemptClaim(): Promise<boolean> {
    try {
      const status = await proClient.claim(familyId.value, deviceId.value);
      if (status) {
        cacheFrom(status);
        await persist();
        return status.pro;
      }
    } catch (e) {
      if (!(e instanceof ProClientError)) throw e;
    }
    return false;
  }

  /** After the Return page gives up, keep asking every 15 s for up to 10 minutes and unlock when Pro arrives. */
  function claimInBackground() {
    if (backgroundRunning) return;
    backgroundRunning = true;
    const intervalMs = 15000;
    const attempts = (10 * 60 * 1000) / intervalMs;
    (async () => {
      for (let i = 0; i < attempts && !disposed; i++) {
        await new Promise<void>((resolve) => {
          backgroundTimer = setTimeout(resolve, intervalMs);
        });
        if (disposed) return;
        if (await attemptClaim().catch(() => false)) {
          await proToast("XP Pro unlocked!", "success");
          return;
        }
      }
    })()
      .catch(() => undefined)
      .finally(() => {
        backgroundRunning = false;
      });
  }

  /**
   * Poll claim until Pro arrives (a purchase's webhook lands within seconds).
   * Resolves true at the first 200 that is Pro (a lapsed family's pro:false keeps polling), false at the timeout.
   * With keepClaiming, a timeout hands over to a slower background claim.
   */
  async function claimWithRetry(
    opts: { intervalMs?: number; timeoutMs?: number; keepClaiming?: boolean } = {}
  ): Promise<boolean> {
    const intervalMs = opts.intervalMs ?? 2000;
    const timeoutMs = opts.timeoutMs ?? 30000;
    await init();
    const attempts = Math.floor(timeoutMs / intervalMs) + 1;
    loading.value = true;
    try {
      for (let i = 0; i < attempts; i++) {
        if (await attemptClaim()) return true;
        if (i < attempts - 1) await sleep(intervalMs);
      }
      if (opts.keepClaiming) claimInBackground();
      return false;
    } finally {
      loading.value = false;
    }
  }

  /** Web: send the browser to Bazaar's Stripe checkout. (Native purchases arrive with Task 16.) */
  async function purchase(planId: ProPlanId): Promise<void> {
    await init();
    const params = new URLSearchParams({
      family_id: familyId.value,
      device_id: deviceId.value,
      return_url: proReturnUrl(),
    });
    window.location.assign(`${compassSiteRoot()}/buy/doitforthexp/${planId}?${params.toString()}`);
  }

  /** Use a key on this device: adopt its family so later checks and store purchases credit the same family. */
  async function restoreWithKey(rawKey: string): Promise<void> {
    await init();
    const key = rawKey.trim().toUpperCase();
    loading.value = true;
    try {
      const status = await proClient.validate(key, deviceId.value);
      if (!status) {
        await proToast("No XP Pro license matches that key.");
        return;
      }
      await adoptFamily(status.familyId);
      familyId.value = status.familyId;
      cacheFrom(status);
      await persist();
      await proToast(status.pro ? "XP Pro restored!" : "That key is not active right now.", status.pro ? "success" : "warning");
    } catch (e) {
      if (e instanceof ProClientError && e.code === "device_limit") {
        await proToast(DEVICE_LIMIT_MESSAGE);
      } else if (e instanceof ProClientError && e.code === "invalid_input") {
        await proToast("That doesn't look like an XP Pro key.");
      } else if (e instanceof ProClientError) {
        await proToast("The shopkeeper could not check that key. Try again in a moment.");
      } else {
        throw e;
      }
    } finally {
      loading.value = false;
    }
  }

  /** Email every key on file for this address. The server never says whether one exists. */
  async function recover(email: string): Promise<void> {
    try {
      await proClient.recover(email.trim());
      await proToast("If that email has a key on file, it is on its way.", "success");
    } catch (e) {
      if (!(e instanceof ProClientError)) throw e;
      await proToast("Could not send the email right now. Try again in a moment.");
    }
  }

  /** Open the Stripe Billing Portal, or the store's subscription page for a store purchase. */
  async function manage(): Promise<void> {
    if (!licenseKey.value) return;
    try {
      const result = await proClient.manage(licenseKey.value, window.location.href);
      if (result.url) {
        window.location.assign(result.url);
      } else if (result.store === "APP_STORE") {
        window.open("https://apps.apple.com/account/subscriptions", "_blank");
      } else if (result.store === "PLAY_STORE") {
        window.open("https://play.google.com/store/account/subscriptions", "_blank");
      }
    } catch (e) {
      if (!(e instanceof ProClientError)) throw e;
      await proToast("Could not open subscription management right now.");
    }
  }

  /** True when Pro; otherwise shows the upsell for the feature that was tapped. */
  async function requirePro(gate: ProGate): Promise<boolean> {
    await init().catch(() => undefined);
    if (isPro.value) return true;
    await openProUpsell(gate);
    return false;
  }

  return {
    license,
    familyId,
    deviceId,
    loading,
    isPro,
    plan,
    expiresAt,
    licenseKey,
    init,
    recheck,
    claimWithRetry,
    purchase,
    restoreWithKey,
    recover,
    manage,
    requirePro,
  };
});

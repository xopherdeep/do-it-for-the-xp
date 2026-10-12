import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { getProDb } from "@/lib/databases/ProDb";
import { compassSiteRoot } from "@/lib/api/apiHost";
import { CachedLicense, isPro as entitled, needsRecheck } from "@/lib/services/pro/entitlement";
import { adoptFamily, ensureIdentity } from "@/lib/services/pro/familyIdentity";
import * as proClient from "@/lib/services/pro/proClient";
import { ProClientError, ProStatus } from "@/lib/services/pro/proClient";
import { ProGate, ProPlanId } from "@/lib/services/pro/proPlans";
import { DEVICE_LIMIT_MESSAGE, openProUpsell, proToast } from "@/lib/services/pro/proUi";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The XP Pro state of this install: the cached license, Pro or not, and the actions that change it. */
export const useProStore = defineStore("pro", () => {
  const license = ref<CachedLicense | null>(null);
  const familyId = ref("");
  const deviceId = ref("");
  const loading = ref(false);

  const isPro = computed(() => entitled(license.value, new Date(), process.env.NODE_ENV === "production"));
  const plan = computed(() => license.value?.plan ?? null);
  const expiresAt = computed(() => license.value?.expiresAt ?? null);
  const licenseKey = computed(() => license.value?.key ?? "");

  async function persist() {
    await getProDb().saveState({ familyId: familyId.value, deviceId: deviceId.value, license: license.value });
  }

  function cacheFrom(status: ProStatus) {
    license.value = {
      key: status.licenseKey,
      plan: status.plan,
      expiresAt: status.expiresAt,
      env: status.env,
      pro: status.pro,
      lastValidatedAt: new Date().toISOString(),
    };
  }

  /** Ask the server again. A network or server error keeps what is cached; a 404 turns Pro off but keeps the key. */
  async function recheck(): Promise<void> {
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
        license.value = { ...license.value, pro: false, lastValidatedAt: new Date().toISOString() };
        await persist();
      }
    } catch (e) {
      if (!(e instanceof ProClientError)) throw e;
      // offline, rate limited or the server is down: the cached state stands
    } finally {
      loading.value = false;
    }
  }

  let initPromise: Promise<void> | null = null;

  /** Load the identity and the cached license, then recheck when the rules ask for it. Runs once. */
  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        const identity = await ensureIdentity();
        familyId.value = identity.familyId;
        deviceId.value = identity.deviceId;
        const stored = await getProDb().getState();
        license.value = stored?.license ?? null;
        if (needsRecheck(license.value, new Date())) await recheck();
      })().catch((e) => {
        initPromise = null;
        throw e;
      });
    }
    return initPromise;
  }

  /**
   * Poll claim until the license arrives (a purchase's webhook lands within seconds).
   * Resolves true at the first 200 that is Pro, false when the timeout passes.
   */
  async function claimWithRetry(opts: { intervalMs?: number; timeoutMs?: number } = {}): Promise<boolean> {
    const intervalMs = opts.intervalMs ?? 2000;
    const timeoutMs = opts.timeoutMs ?? 30000;
    await init();
    const attempts = Math.floor(timeoutMs / intervalMs) + 1;
    loading.value = true;
    try {
      for (let i = 0; i < attempts; i++) {
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
        if (i < attempts - 1) await sleep(intervalMs);
      }
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
      return_url: `${window.location.origin}/#/pro/return`,
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

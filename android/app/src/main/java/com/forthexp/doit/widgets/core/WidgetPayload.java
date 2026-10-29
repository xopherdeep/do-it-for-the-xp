package com.forthexp.doit.widgets.core;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The one reader for the payload the app writes into SharedPreferences.
 *
 * The web layer ships ahead of the APK, so a widget can wake up holding JSON written by
 * either build. A v1 payload ({hero, quests, streak, bank}) has none of the fields below,
 * and drawing its missing numbers as zeros would lie about the hero - it counts as no data
 * at all until the app syncs again.
 */
public final class WidgetPayload {

    /** Matches WIDGET_PAYLOAD_VERSION in src/lib/services/widgets/widgetCatalog.ts */
    private static final int MIN_SUPPORTED_VERSION = 2;

    /** Per-widget hero binding; absent means the widget follows whoever is signed in */
    public static final String KEY_HERO_PREFIX = "widget_bound_hero_";

    private static final JSONArray NO_QUESTS = new JSONArray();

    private final JSONObject hero;
    private final JSONObject counts;
    private final JSONArray quests;
    private final List<JSONObject> allHeroes;

    private WidgetPayload(JSONObject hero, JSONArray quests, List<JSONObject> allHeroes) {
        this.hero = hero;
        this.counts = hero == null ? null : hero.optJSONObject("counts");
        this.quests = quests == null ? NO_QUESTS : quests;
        this.allHeroes = allHeroes == null ? new ArrayList<>() : allHeroes;
    }

    private static WidgetPayload empty() {
        return new WidgetPayload(null, null, null);
    }

    /**
     * The slice of the payload this widget draws: its bound hero, or the signed-in one when
     * it has no binding of its own (a widget placed before anyone picked a kid for it).
     */
    public static WidgetPayload read(Context context, int appWidgetId) {
        SharedPreferences prefs = WidgetThemeHelper.getPrefs(context);
        String raw = prefs.getString(WidgetThemeHelper.KEY_WIDGET_DATA, null);
        if (raw == null || raw.isEmpty()) {
            return empty();
        }

        try {
            JSONObject root = new JSONObject(raw);
            if (root.optInt("version", 0) < MIN_SUPPORTED_VERSION) {
                return empty();
            }

            JSONObject heroes = root.optJSONObject("heroes");
            if (heroes == null) {
                return empty();
            }

            String heroId = prefs.getString(KEY_HERO_PREFIX + appWidgetId, null);
            if (heroId == null || !heroes.has(heroId)) {
                heroId = root.optString("primaryHeroId", "");
            }

            JSONObject hero = heroes.optJSONObject(heroId);
            if (hero == null) {
                return empty();
            }

            JSONObject questsByHero = root.optJSONObject("questsByHero");
            JSONArray rows = questsByHero == null ? null : questsByHero.optJSONArray(heroId);

            List<JSONObject> heroList = new ArrayList<>();
            Iterator<String> keys = heroes.keys();
            while (keys.hasNext()) {
                String k = keys.next();
                JSONObject h = heroes.optJSONObject(k);
                if (h != null) {
                    heroList.add(h);
                }
            }

            return new WidgetPayload(hero, rows, heroList);
        } catch (JSONException malformed) {
            return empty();
        }
    }

    /** False until the app has synced a payload this build understands: draw placeholders, not zeros. */
    public boolean hasData() {
        return hero != null;
    }

    public String heroId() {
        return hero == null ? "" : hero.optString("id", "");
    }

    public String heroAvatarImage() {
        return hero == null ? null : hero.optString("avatarImage", null);
    }

    public String heroString(String field, String fallback) {
        return hero == null ? fallback : hero.optString(field, fallback);
    }

    public int heroInt(String field, int fallback) {
        return hero == null ? fallback : hero.optInt(field, fallback);
    }

    public double heroDouble(String field, double fallback) {
        return hero == null ? fallback : hero.optDouble(field, fallback);
    }

    /** One of overdue / open / later / pending / done, already tallied by the app */
    public int count(String name) {
        return counts == null ? 0 : counts.optInt(name, 0);
    }

    /** This hero's quest rows, nearest due first; empty rather than null when there is nothing to show */
    public JSONArray quests() {
        return quests;
    }

    /** All family heroes from the payload */
    public List<JSONObject> allHeroes() {
        return allHeroes;
    }

    /** First pending quest row, or null if no quests */
    public JSONObject firstPendingQuest() {
        if (quests == null || quests.length() == 0) {
            return null;
        }
        return quests.optJSONObject(0);
    }
}

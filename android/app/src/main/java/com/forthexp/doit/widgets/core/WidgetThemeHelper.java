package com.forthexp.doit.widgets.core;

import android.content.Context;
import android.content.SharedPreferences;
import com.forthexp.doit.R;

public class WidgetThemeHelper {
    public static final String PREFS_NAME = "XpWidgetPrefs";
    public static final String KEY_WIDGET_DATA = "widget_sync_data";
    public static final String KEY_THEME_PREFIX = "widget_theme_";
    public static final String KEY_GAME_STYLE = "widget_global_game_style";

    public static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static int getThemeDrawable(String themeId) {
        if (themeId == null) {
            return R.drawable.widget_window_earthbound;
        }
        switch (themeId.toLowerCase().replaceAll("[^a-z]", "")) {
            case "finalfantasy":
                return R.drawable.widget_window_finalfantasy;
            case "chronotrigger":
                return R.drawable.widget_window_chronotrigger;
            case "dragonquest":
                return R.drawable.widget_window_dragonquest;
            case "secretofmana":
                return R.drawable.widget_window_secretofmana;
            case "virtualboy":
                return R.drawable.widget_window_virtualboy;
            case "zelda":
                return R.drawable.widget_window_zelda;
            case "mariorpg":
                return R.drawable.widget_window_mariorpg;
            case "phantasystar":
                return R.drawable.widget_window_phantasystar;
            case "pokemon":
            case "gameboy":
                return R.drawable.widget_window_gameboy;
            case "lava":
                return R.drawable.widget_window_lava;
            case "gold":
                return R.drawable.widget_window_gold;
            case "earthbound":
            case "dungeon":
            default:
                return R.drawable.widget_window_earthbound;
        }
    }

    public static int getWidgetThemeDrawable(Context context, int appWidgetId) {
        SharedPreferences prefs = getPrefs(context);
        String themeId = prefs.getString(KEY_THEME_PREFIX + appWidgetId, null);
        if (themeId == null || themeId.isEmpty()) {
            themeId = prefs.getString(KEY_GAME_STYLE, "earthbound");
        }
        return getThemeDrawable(themeId);
    }
}

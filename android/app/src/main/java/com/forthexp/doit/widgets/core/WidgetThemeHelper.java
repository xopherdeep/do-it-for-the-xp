package com.forthexp.doit.widgets.core;

import android.content.Context;
import android.content.SharedPreferences;
import com.forthexp.doit.R;

public class WidgetThemeHelper {
    public static final String PREFS_NAME = "XpWidgetPrefs";
    public static final String KEY_WIDGET_DATA = "widget_sync_data";
    public static final String KEY_THEME_PREFIX = "widget_theme_";

    public static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static int getThemeDrawable(String themeId) {
        if (themeId == null) {
            return R.drawable.widget_window_earthbound;
        }
        switch (themeId.toLowerCase()) {
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
        String themeId = getPrefs(context).getString(KEY_THEME_PREFIX + appWidgetId, "earthbound");
        return getThemeDrawable(themeId);
    }
}

package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;
import org.json.JSONObject;

public class StreakAltarWidget extends BaseXpWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = WidgetThemeHelper.getPrefs(context);
        String rawData = prefs.getString(WidgetThemeHelper.KEY_WIDGET_DATA, null);

        int streak = 0;
        double multiplier = 1.0;

        if (rawData != null) {
            try {
                JSONObject root = new JSONObject(rawData);
                if (root.has("streak")) {
                    JSONObject streakObj = root.getJSONObject("streak");
                    streak = streakObj.optInt("current", 0);
                    multiplier = streakObj.optDouble("multiplier", 1.0);
                }
            } catch (Exception ignored) {}
        }

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_streak_altar);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            views.setTextViewText(R.id.widget_streak_count, String.valueOf(streak));
            views.setTextViewText(R.id.widget_streak_multiplier, String.format("%.1fx XP", multiplier));

            PendingIntent launchIntent = createLaunchPendingIntent(context, "com.forthexp.doit://party", appWidgetId);
            views.setOnClickPendingIntent(R.id.widget_root, launchIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

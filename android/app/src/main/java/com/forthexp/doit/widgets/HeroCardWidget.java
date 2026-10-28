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

public class HeroCardWidget extends BaseXpWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = WidgetThemeHelper.getPrefs(context);
        String rawData = prefs.getString(WidgetThemeHelper.KEY_WIDGET_DATA, null);

        String name = "Hero";
        int level = 1;
        String jobClass = "Novice";
        int hp = 20, maxHp = 20;
        int mp = 10, maxMp = 10;
        int gp = 0;
        int streak = 0;

        if (rawData != null) {
            try {
                JSONObject root = new JSONObject(rawData);
                if (root.has("hero")) {
                    JSONObject hero = root.getJSONObject("hero");
                    name = hero.optString("name", "Hero");
                    level = hero.optInt("level", 1);
                    jobClass = hero.optString("className", "Novice");
                    hp = hero.optInt("hp", 20);
                    maxHp = Math.max(1, hero.optInt("maxHp", 20));
                    mp = hero.optInt("mp", 10);
                    maxMp = Math.max(1, hero.optInt("maxMp", 10));
                    gp = hero.optInt("gp", 0);
                    streak = hero.optInt("streak", 0);
                }
            } catch (Exception ignored) {}
        }

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_hero_card);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            views.setTextViewText(R.id.widget_hero_name, name);
            views.setTextViewText(R.id.widget_hero_level, "LV " + level);
            views.setTextViewText(R.id.widget_hero_class, jobClass);

            int hpPercent = (int) Math.min(100, Math.max(0, ((float) hp / maxHp) * 100));
            views.setProgressBar(R.id.widget_bar_hp, 100, hpPercent, false);
            views.setTextViewText(R.id.widget_text_hp, hp + "/" + maxHp);

            int mpPercent = (int) Math.min(100, Math.max(0, ((float) mp / maxMp) * 100));
            views.setProgressBar(R.id.widget_bar_mp, 100, mpPercent, false);
            views.setTextViewText(R.id.widget_text_mp, mp + "/" + maxMp);

            views.setTextViewText(R.id.widget_hero_gp, gp + " GP");
            views.setTextViewText(R.id.widget_hero_streak, streak + (streak == 1 ? " Day Streak" : " Days Streak"));

            PendingIntent launchIntent = createLaunchPendingIntent(context, "com.forthexp.doit://my-portal", appWidgetId);
            views.setOnClickPendingIntent(R.id.widget_root, launchIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

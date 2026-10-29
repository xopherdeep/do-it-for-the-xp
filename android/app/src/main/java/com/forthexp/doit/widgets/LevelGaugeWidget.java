package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetPayload;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;

public class LevelGaugeWidget extends BaseXpWidgetProvider {

    private static final String PORTAL_URI = "com.forthexp.doit://my-portal";
    private static final String NO_VALUE = "--";

    @Override
    protected int providerSlot() {
        return 7;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_level_gauge);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            if (payload.hasData()) {
                String name = payload.heroString("name", "Hero");
                int level = payload.heroInt("level", 1);
                int xp = Math.max(0, payload.heroInt("xp", 0));
                int nextLevelXp = Math.max(1, payload.heroInt("nextLevelXp", 1));
                int percent = Math.min(100, Math.max(0, (int) Math.round(((double) xp / (double) nextLevelXp) * 100.0)));
                int remaining = Math.max(0, nextLevelXp - xp);

                views.setTextViewText(R.id.widget_hero_name, name);
                views.setTextViewText(R.id.widget_hero_level, "LV " + level);
                views.setProgressBar(R.id.widget_bar_xp, 100, percent, false);
                views.setTextViewText(R.id.widget_xp_pct, percent + "%");
                views.setTextViewText(R.id.widget_text_xp, xp + " / " + nextLevelXp + " XP");
                views.setTextViewText(R.id.widget_xp_to_next, remaining + " XP to next level");
            } else {
                views.setTextViewText(R.id.widget_hero_name, "Hero");
                views.setTextViewText(R.id.widget_hero_level, "LV --");
                views.setProgressBar(R.id.widget_bar_xp, 100, 0, false);
                views.setTextViewText(R.id.widget_xp_pct, "0%");
                views.setTextViewText(R.id.widget_text_xp, NO_VALUE + " XP");
                views.setTextViewText(R.id.widget_xp_to_next, "Tap to sync level");
            }

            PendingIntent launchIntent = createLaunchPendingIntent(context, PORTAL_URI, requestCode(appWidgetId, 0));
            views.setOnClickPendingIntent(R.id.widget_root, launchIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

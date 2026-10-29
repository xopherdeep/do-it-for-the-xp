package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetPayload;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;

public class HeroCardWidget extends BaseXpWidgetProvider {

    /** Shown in place of a number the app has not synced yet, so an empty widget never claims 0 */
    private static final String NO_VALUE = "--";

    @Override
    protected int providerSlot() {
        return 1;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_hero_card);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            if (payload.hasData()) {
                int hp = Math.max(0, payload.heroInt("hp", 0));
                int maxHp = Math.max(1, payload.heroInt("maxHp", 1));
                int mp = Math.max(0, payload.heroInt("mp", 0));
                int maxMp = Math.max(1, payload.heroInt("maxMp", 1));
                int streak = payload.heroInt("streak", 0);

                views.setTextViewText(R.id.widget_hero_name, payload.heroString("name", "Hero"));
                views.setTextViewText(R.id.widget_hero_level, "LV " + payload.heroInt("level", 1));
                views.setTextViewText(R.id.widget_hero_class, payload.heroString("className", "Novice"));

                views.setProgressBar(R.id.widget_bar_hp, 100, percent(hp, maxHp), false);
                views.setTextViewText(R.id.widget_text_hp, hp + "/" + maxHp);

                views.setProgressBar(R.id.widget_bar_mp, 100, percent(mp, maxMp), false);
                views.setTextViewText(R.id.widget_text_mp, mp + "/" + maxMp);

                views.setTextViewText(R.id.widget_hero_gp, payload.heroInt("gp", 0) + " GP");
                views.setTextViewText(R.id.widget_hero_streak, streak + (streak == 1 ? " Day Streak" : " Days Streak"));
            } else {
                views.setTextViewText(R.id.widget_hero_name, "Hero");
                views.setTextViewText(R.id.widget_hero_level, "LV " + NO_VALUE);
                views.setTextViewText(R.id.widget_hero_class, "Tap to begin");

                views.setProgressBar(R.id.widget_bar_hp, 100, 0, false);
                views.setTextViewText(R.id.widget_text_hp, NO_VALUE);

                views.setProgressBar(R.id.widget_bar_mp, 100, 0, false);
                views.setTextViewText(R.id.widget_text_mp, NO_VALUE);

                views.setTextViewText(R.id.widget_hero_gp, NO_VALUE + " GP");
                views.setTextViewText(R.id.widget_hero_streak, NO_VALUE);
            }

            PendingIntent launchIntent = createLaunchPendingIntent(
                context, "com.forthexp.doit://my-portal", requestCode(appWidgetId, 0));
            views.setOnClickPendingIntent(R.id.widget_root, launchIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static int percent(int value, int max) {
        return (int) Math.min(100, Math.max(0, ((float) value / max) * 100));
    }
}

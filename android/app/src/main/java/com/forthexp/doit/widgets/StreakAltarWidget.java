package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetPayload;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;
import java.util.Locale;

public class StreakAltarWidget extends BaseXpWidgetProvider {

    /** Shown in place of a number the app has not synced yet, so a fresh altar never claims a 0 day streak */
    private static final String NO_VALUE = "--";

    @Override
    protected int providerSlot() {
        return 3;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_streak_altar);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            if (payload.hasData()) {
                // The reward for a run is a chest (streakChests.ts), not an XP multiplier: say how
                // many days are left to the next one, which is the thing the hero is walking toward.
                int streak = payload.heroInt("streak", 0);
                int chestDay = payload.heroInt("nextChestDay", 0);
                int daysToChest = chestDay - streak;
                views.setTextViewText(R.id.widget_streak_count, String.valueOf(streak));
                views.setTextViewText(R.id.widget_streak_multiplier,
                    daysToChest == 1
                        ? "Chest tomorrow"
                        : String.format(Locale.US, "Chest in %d", Math.max(0, daysToChest)));
            } else {
                views.setTextViewText(R.id.widget_streak_count, NO_VALUE);
                views.setTextViewText(R.id.widget_streak_multiplier, "Tap to begin");
            }

            PendingIntent launchIntent = createLaunchPendingIntent(
                context, "com.forthexp.doit://party", requestCode(appWidgetId, 0));
            views.setOnClickPendingIntent(R.id.widget_root, launchIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

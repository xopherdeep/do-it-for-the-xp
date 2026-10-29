package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;

public class QuickDockWidget extends BaseXpWidgetProvider {

    @Override
    protected int providerSlot() {
        return 5;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_dock);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            PendingIntent addIntent = createLaunchPendingIntent(context, "com.forthexp.doit://action/add-task", requestCode(appWidgetId, 0));
            views.setOnClickPendingIntent(R.id.btn_action_add, addIntent);

            PendingIntent choresIntent = createLaunchPendingIntent(context, "com.forthexp.doit://chores", requestCode(appWidgetId, 1));
            views.setOnClickPendingIntent(R.id.btn_action_chores, choresIntent);

            PendingIntent dungeonIntent = createLaunchPendingIntent(context, "com.forthexp.doit://dungeon", requestCode(appWidgetId, 2));
            views.setOnClickPendingIntent(R.id.btn_action_dungeon, dungeonIntent);

            PendingIntent partyIntent = createLaunchPendingIntent(context, "com.forthexp.doit://party", requestCode(appWidgetId, 3));
            views.setOnClickPendingIntent(R.id.btn_action_party, partyIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

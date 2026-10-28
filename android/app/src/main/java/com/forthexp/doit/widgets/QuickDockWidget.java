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
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_dock);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            PendingIntent addIntent = createLaunchPendingIntent(context, "com.forthexp.doit://action/add-task", 101);
            views.setOnClickPendingIntent(R.id.btn_action_add, addIntent);

            PendingIntent choresIntent = createLaunchPendingIntent(context, "com.forthexp.doit://chores", 102);
            views.setOnClickPendingIntent(R.id.btn_action_chores, choresIntent);

            PendingIntent dungeonIntent = createLaunchPendingIntent(context, "com.forthexp.doit://dungeon", 103);
            views.setOnClickPendingIntent(R.id.btn_action_dungeon, dungeonIntent);

            PendingIntent partyIntent = createLaunchPendingIntent(context, "com.forthexp.doit://party", 104);
            views.setOnClickPendingIntent(R.id.btn_action_party, partyIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

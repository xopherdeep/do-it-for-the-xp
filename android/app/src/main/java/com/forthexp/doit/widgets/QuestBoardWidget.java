package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;
import com.forthexp.doit.MainActivity;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetPayload;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;

public class QuestBoardWidget extends BaseXpWidgetProvider {

    private static final String CHORES_URI = "com.forthexp.doit://chores";

    @Override
    protected int providerSlot() {
        return 4;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quest_board);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            views.setTextViewText(R.id.widget_quest_count, headerCount(payload));

            Intent serviceIntent = new Intent(context, QuestWidgetRemoteViewsService.class);
            serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.widget_quest_list, serviceIntent);
            views.setEmptyView(R.id.widget_quest_list, R.id.widget_quest_empty);

            views.setPendingIntentTemplate(R.id.widget_quest_list, rowTemplate(context, appWidgetId));

            // The header and the empty view open the quest list, so a cleared board is still a door.
            // The root deliberately stays unbound: it is an ancestor of the collection, and a launcher
            // that honours the click there can swallow a row tap or the list's own scrolling.
            PendingIntent openChores = createLaunchPendingIntent(context, CHORES_URI, requestCode(appWidgetId, 1));
            views.setOnClickPendingIntent(R.id.widget_quest_header, openChores);
            views.setOnClickPendingIntent(R.id.widget_quest_empty, openChores);

            appWidgetManager.updateAppWidget(appWidgetId, views);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_quest_list);
        }
    }

    /**
     * What the hero still has to face, not what a parent has to approve: the rows in the list
     * are everything outstanding, so counting them called late work "pending" twice over.
     */
    private static String headerCount(WidgetPayload payload) {
        if (!payload.hasData()) {
            return "--";
        }
        int todo = payload.count("overdue") + payload.count("open");
        if (todo == 0) {
            return "All clear";
        }
        return todo + " to do";
    }

    /** The rows fill in their own quest URI, so this one has to stay mutable. */
    private PendingIntent rowTemplate(Context context, int appWidgetId) {
        Intent clickIntent = new Intent(context, MainActivity.class);
        clickIntent.setAction(Intent.ACTION_VIEW);
        clickIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        return PendingIntent.getActivity(context, requestCode(appWidgetId, 0), clickIntent, flags);
    }
}

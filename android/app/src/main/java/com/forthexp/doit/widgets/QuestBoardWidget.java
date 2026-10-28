package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;
import com.forthexp.doit.MainActivity;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;
import org.json.JSONArray;
import org.json.JSONObject;

public class QuestBoardWidget extends BaseXpWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = WidgetThemeHelper.getPrefs(context);
        String rawData = prefs.getString(WidgetThemeHelper.KEY_WIDGET_DATA, null);
        int pendingCount = 0;

        if (rawData != null) {
            try {
                JSONObject root = new JSONObject(rawData);
                if (root.has("quests")) {
                    JSONArray quests = root.getJSONArray("quests");
                    pendingCount = quests.length();
                }
            } catch (Exception ignored) {}
        }

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quest_board);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            views.setTextViewText(R.id.widget_quest_count, pendingCount + " pending");

            Intent serviceIntent = new Intent(context, QuestWidgetRemoteViewsService.class);
            serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.widget_quest_list, serviceIntent);
            views.setEmptyView(R.id.widget_quest_list, R.id.widget_quest_empty);

            Intent clickIntent = new Intent(context, MainActivity.class);
            clickIntent.setAction(Intent.ACTION_VIEW);
            clickIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                flags |= PendingIntent.FLAG_MUTABLE;
            }
            PendingIntent clickPendingIntent = PendingIntent.getActivity(context, appWidgetId, clickIntent, flags);
            views.setPendingIntentTemplate(R.id.widget_quest_list, clickPendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_quest_list);
        }
    }
}

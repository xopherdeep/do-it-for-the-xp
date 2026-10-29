package com.forthexp.doit.widgets;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.WidgetPayload;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class QuestWidgetRemoteViewsService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        int appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        return new QuestRemoteViewsFactory(getApplicationContext(), appWidgetId);
    }

    private static class QuestItem {
        String id;
        String title;
        String dueLabel;
        int xpReward;
        int gpReward;

        QuestItem(String id, String title, String dueLabel, int xpReward, int gpReward) {
            this.id = id;
            this.title = title;
            this.dueLabel = dueLabel;
            this.xpReward = xpReward;
            this.gpReward = gpReward;
        }
    }

    private static class QuestRemoteViewsFactory implements RemoteViewsFactory {
        private final Context context;
        /** Which widget this list belongs to, so it shows its bound hero's quests and not the family's */
        private final int appWidgetId;
        private final List<QuestItem> items = new ArrayList<>();

        QuestRemoteViewsFactory(Context context, int appWidgetId) {
            this.context = context;
            this.appWidgetId = appWidgetId;
        }

        @Override
        public void onCreate() {
            loadQuests();
        }

        @Override
        public void onDataSetChanged() {
            loadQuests();
        }

        private void loadQuests() {
            items.clear();
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            if (!payload.hasData()) return;

            JSONArray quests = payload.quests();
            for (int i = 0; i < quests.length(); i++) {
                JSONObject q = quests.optJSONObject(i);
                if (q == null) continue;
                items.add(new QuestItem(
                    q.optString("id", ""),
                    q.optString("title", "Untitled Quest"),
                    q.optString("dueLabel", "Anytime"),
                    q.optInt("xpReward", 0),
                    q.optInt("gpReward", 0)
                ));
            }
        }

        @Override
        public void onDestroy() {
            items.clear();
        }

        @Override
        public int getCount() {
            return items.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= items.size()) {
                return null;
            }

            QuestItem item = items.get(position);
            RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_quest_item);

            row.setTextViewText(R.id.widget_quest_item_title, item.title);
            row.setTextViewText(R.id.widget_quest_item_due, item.dueLabel);

            String rewardText = "+" + item.xpReward + " XP";
            if (item.gpReward > 0) {
                rewardText += "  +" + item.gpReward + " GP";
            }
            row.setTextViewText(R.id.widget_quest_item_reward, rewardText);

            Intent fillInIntent = new Intent();
            fillInIntent.setData(Uri.parse("com.forthexp.doit://quest/" + Uri.encode(item.id)));
            row.setOnClickFillInIntent(R.id.widget_quest_item_root, fillInIntent);

            return row;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        /** The quest itself, not where it happens to sit: a reordered list must not re-animate every row. */
        @Override
        public long getItemId(int position) {
            if (position < 0 || position >= items.size()) {
                return position;
            }
            String id = items.get(position).id;
            return id.isEmpty() ? position : id.hashCode();
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }
    }
}

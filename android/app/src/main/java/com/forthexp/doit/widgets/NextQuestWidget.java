package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetPayload;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;
import org.json.JSONObject;

public class NextQuestWidget extends BaseXpWidgetProvider {

    private static final String CHORES_URI = "com.forthexp.doit://chores";

    @Override
    protected int providerSlot() {
        return 6;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_next_quest);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            String deepLink = CHORES_URI;
            if (payload.hasData()) {
                JSONObject nextQuest = payload.firstPendingQuest();
                if (nextQuest != null) {
                    String title = nextQuest.optString("title", "Untitled Quest");
                    String dueLabel = nextQuest.optString("dueLabel", "Anytime");
                    int xp = nextQuest.optInt("xpReward", 0);
                    int gp = nextQuest.optInt("gpReward", 0);
                    String questId = nextQuest.optString("id", "");

                    views.setTextViewText(R.id.widget_next_quest_title, title);
                    views.setTextViewText(R.id.widget_next_quest_due, dueLabel);
                    views.setTextViewText(R.id.widget_next_quest_reward, "+" + xp + " XP • " + gp + " GP");

                    if (!questId.isEmpty()) {
                        deepLink = "com.forthexp.doit://quest/" + questId;
                    }
                } else {
                    views.setTextViewText(R.id.widget_next_quest_title, "All quests cleared! Rest at the Inn!");
                    views.setTextViewText(R.id.widget_next_quest_due, "Done");
                    views.setTextViewText(R.id.widget_next_quest_reward, "+0 XP • 0 GP");
                }
            } else {
                views.setTextViewText(R.id.widget_next_quest_title, "Tap to sync quest log");
                views.setTextViewText(R.id.widget_next_quest_due, "--");
                views.setTextViewText(R.id.widget_next_quest_reward, "-- XP");
            }

            PendingIntent launchIntent = createLaunchPendingIntent(context, deepLink, requestCode(appWidgetId, 0));
            views.setOnClickPendingIntent(R.id.widget_root, launchIntent);
            views.setOnClickPendingIntent(R.id.btn_next_quest_open, launchIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

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

public class GoldVaultWidget extends BaseXpWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = WidgetThemeHelper.getPrefs(context);
        String rawData = prefs.getString(WidgetThemeHelper.KEY_WIDGET_DATA, null);

        int wallet = 0;
        int savings = 0;

        if (rawData != null) {
            try {
                JSONObject root = new JSONObject(rawData);
                if (root.has("bank")) {
                    JSONObject bank = root.getJSONObject("bank");
                    wallet = bank.optInt("wallet", 0);
                    savings = bank.optInt("savings", 0);
                }
            } catch (Exception ignored) {}
        }

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_gold_vault);

            views.setTextViewText(R.id.widget_bank_wallet, wallet + " GP");
            views.setTextViewText(R.id.widget_bank_savings, savings + " GP");

            PendingIntent launchIntent = createLaunchPendingIntent(context, "com.forthexp.doit://bank", appWidgetId);
            views.setOnClickPendingIntent(R.id.widget_root, launchIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetPayload;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;

public class GoldVaultWidget extends BaseXpWidgetProvider {

    /** Shown in place of a number the app has not synced yet, so an empty vault never claims 0 GP */
    private static final String NO_VALUE = "--";

    @Override
    protected int providerSlot() {
        return 2;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_gold_vault);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            if (payload.hasData()) {
                views.setTextViewText(R.id.widget_bank_wallet, payload.heroInt("gp", 0) + " GP");
                views.setTextViewText(R.id.widget_bank_savings, payload.heroInt("savings", 0) + " GP");
            } else {
                views.setTextViewText(R.id.widget_bank_wallet, NO_VALUE + " GP");
                views.setTextViewText(R.id.widget_bank_savings, NO_VALUE + " GP");
            }

            PendingIntent launchIntent = createLaunchPendingIntent(
                context, "com.forthexp.doit://bank", requestCode(appWidgetId, 0));
            views.setOnClickPendingIntent(R.id.widget_root, launchIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

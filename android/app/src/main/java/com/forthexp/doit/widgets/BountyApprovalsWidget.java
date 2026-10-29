package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetPayload;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;

public class BountyApprovalsWidget extends BaseXpWidgetProvider {

    private static final String APPROVALS_URI = "com.forthexp.doit://approvals";

    @Override
    protected int providerSlot() {
        return 10;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_bounty_approvals);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            if (payload.hasData()) {
                int pending = payload.count("pending");
                int overdue = payload.count("overdue");
                views.setTextViewText(R.id.widget_approvals_pending, String.valueOf(pending));
                views.setTextViewText(R.id.widget_approvals_overdue, String.valueOf(overdue));
            } else {
                views.setTextViewText(R.id.widget_approvals_pending, "--");
                views.setTextViewText(R.id.widget_approvals_overdue, "--");
            }

            PendingIntent launchIntent = createLaunchPendingIntent(context, APPROVALS_URI, requestCode(appWidgetId, 0));
            views.setOnClickPendingIntent(R.id.widget_root, launchIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

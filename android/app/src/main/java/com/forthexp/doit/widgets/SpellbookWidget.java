package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetPayload;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;

public class SpellbookWidget extends BaseXpWidgetProvider {

    private static final String ABILITIES_URI = "com.forthexp.doit://abilities";

    @Override
    protected int providerSlot() {
        return 11;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_spellbook);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            if (payload.hasData()) {
                int ap = payload.heroInt("ap", 0);
                views.setTextViewText(R.id.widget_spellbook_ap, ap + " AP");
            } else {
                views.setTextViewText(R.id.widget_spellbook_ap, "-- AP");
            }

            PendingIntent mainIntent = createLaunchPendingIntent(context, ABILITIES_URI, requestCode(appWidgetId, 0));
            views.setOnClickPendingIntent(R.id.widget_root, mainIntent);
            views.setOnClickPendingIntent(R.id.btn_spell_spells, mainIntent);

            PendingIntent healIntent = createLaunchPendingIntent(context, ABILITIES_URI + "?cast=heal", requestCode(appWidgetId, 1));
            views.setOnClickPendingIntent(R.id.btn_spell_heal, healIntent);

            PendingIntent boostIntent = createLaunchPendingIntent(context, ABILITIES_URI + "?cast=boost", requestCode(appWidgetId, 2));
            views.setOnClickPendingIntent(R.id.btn_spell_boost, boostIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

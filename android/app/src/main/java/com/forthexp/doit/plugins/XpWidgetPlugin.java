package com.forthexp.doit.plugins;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.BountyApprovalsWidget;
import com.forthexp.doit.widgets.GoldVaultWidget;
import com.forthexp.doit.widgets.HeroCardWidget;
import com.forthexp.doit.widgets.HeroCompanionWidget;
import com.forthexp.doit.widgets.LevelGaugeWidget;
import com.forthexp.doit.widgets.NextQuestWidget;
import com.forthexp.doit.widgets.PartyRosterWidget;
import com.forthexp.doit.widgets.QuestBoardWidget;
import com.forthexp.doit.widgets.QuickDockWidget;
import com.forthexp.doit.widgets.SpellbookWidget;
import com.forthexp.doit.widgets.StreakAltarWidget;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "XpWidget")
public class XpWidgetPlugin extends Plugin {

    @PluginMethod
    public void syncWidgetData(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("Data payload missing");
            return;
        }

        Context context = getContext();
        SharedPreferences prefs = WidgetThemeHelper.getPrefs(context);
        prefs.edit().putString(WidgetThemeHelper.KEY_WIDGET_DATA, data).apply();

        triggerAllWidgetUpdates(context);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void reloadAllWidgets(PluginCall call) {
        triggerAllWidgetUpdates(getContext());
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void saveWidgetConfig(PluginCall call) {
        Integer widgetId = call.getInt("widgetId");
        String theme = call.getString("theme", "earthbound");
        if (widgetId == null) {
            call.reject("widgetId is required");
            return;
        }

        Context context = getContext();
        SharedPreferences prefs = WidgetThemeHelper.getPrefs(context);
        prefs.edit().putString(WidgetThemeHelper.KEY_THEME_PREFIX + widgetId, theme).apply();

        triggerAllWidgetUpdates(context);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private void triggerAllWidgetUpdates(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        Class<?>[] providers = new Class<?>[] {
            HeroCardWidget.class,
            StreakAltarWidget.class,
            GoldVaultWidget.class,
            QuickDockWidget.class,
            QuestBoardWidget.class,
            NextQuestWidget.class,
            LevelGaugeWidget.class,
            PartyRosterWidget.class,
            HeroCompanionWidget.class,
            BountyApprovalsWidget.class,
            SpellbookWidget.class
        };

        for (Class<?> providerClass : providers) {
            ComponentName component = new ComponentName(context, providerClass);
            int[] ids = manager.getAppWidgetIds(component);
            if (ids != null && ids.length > 0) {
                Intent updateIntent = new Intent(context, providerClass);
                updateIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
                context.sendBroadcast(updateIntent);

                if (providerClass == QuestBoardWidget.class) {
                    manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_quest_list);
                }
            }
        }
    }
}

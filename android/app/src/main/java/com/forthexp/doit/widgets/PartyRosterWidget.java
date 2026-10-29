package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetPayload;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;
import java.util.List;
import org.json.JSONObject;

public class PartyRosterWidget extends BaseXpWidgetProvider {

    private static final String PARTY_URI = "com.forthexp.doit://party";

    private static final int[] SLOT_IDS = new int[] {
        R.id.party_slot_1,
        R.id.party_slot_2,
        R.id.party_slot_3,
        R.id.party_slot_4
    };

    private static final int[] NAME_IDS = new int[] {
        R.id.party_hero_1_name,
        R.id.party_hero_2_name,
        R.id.party_hero_3_name,
        R.id.party_hero_4_name
    };

    private static final int[] LVL_IDS = new int[] {
        R.id.party_hero_1_lvl,
        R.id.party_hero_2_lvl,
        R.id.party_hero_3_lvl,
        R.id.party_hero_4_lvl
    };

    private static final int[] HP_IDS = new int[] {
        R.id.party_hero_1_hp,
        R.id.party_hero_2_hp,
        R.id.party_hero_3_hp,
        R.id.party_hero_4_hp
    };

    private static final int[] MP_IDS = new int[] {
        R.id.party_hero_1_mp,
        R.id.party_hero_2_mp,
        R.id.party_hero_3_mp,
        R.id.party_hero_4_mp
    };

    @Override
    protected int providerSlot() {
        return 8;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_party_roster);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            List<JSONObject> heroes = payload.allHeroes();
            int count = heroes.size();
            views.setTextViewText(R.id.widget_party_count, count > 0 ? count + " HEROES" : "PARTY");

            for (int i = 0; i < 4; i++) {
                if (i < count) {
                    JSONObject h = heroes.get(i);
                    String name = h.optString("name", "Hero " + (i + 1));
                    int level = h.optInt("level", 1);
                    int hp = Math.max(0, h.optInt("hp", 0));
                    int maxHp = Math.max(1, h.optInt("maxHp", 1));
                    int mp = Math.max(0, h.optInt("mp", 0));
                    int maxMp = Math.max(1, h.optInt("maxMp", 1));

                    int hpPct = Math.min(100, Math.max(0, (int) Math.round(((double) hp / (double) maxHp) * 100.0)));
                    int mpPct = Math.min(100, Math.max(0, (int) Math.round(((double) mp / (double) maxMp) * 100.0)));

                    views.setViewVisibility(SLOT_IDS[i], View.VISIBLE);
                    views.setTextViewText(NAME_IDS[i], name);
                    views.setTextViewText(LVL_IDS[i], "LV " + level);
                    views.setProgressBar(HP_IDS[i], 100, hpPct, false);
                    views.setProgressBar(MP_IDS[i], 100, mpPct, false);
                } else if (i == 0 && count == 0) {
                    views.setViewVisibility(SLOT_IDS[0], View.VISIBLE);
                    views.setTextViewText(NAME_IDS[0], "Tap to form party");
                    views.setTextViewText(LVL_IDS[0], "LV --");
                    views.setProgressBar(HP_IDS[0], 100, 0, false);
                    views.setProgressBar(MP_IDS[0], 100, 0, false);
                } else {
                    views.setViewVisibility(SLOT_IDS[i], View.GONE);
                }
            }

            PendingIntent launchIntent = createLaunchPendingIntent(context, PARTY_URI, requestCode(appWidgetId, 0));
            views.setOnClickPendingIntent(R.id.widget_root, launchIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

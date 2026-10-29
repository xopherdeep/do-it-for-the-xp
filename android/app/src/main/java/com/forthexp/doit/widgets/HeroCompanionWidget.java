package com.forthexp.doit.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.widget.RemoteViews;
import com.forthexp.doit.R;
import com.forthexp.doit.widgets.core.BaseXpWidgetProvider;
import com.forthexp.doit.widgets.core.WidgetImageHelper;
import com.forthexp.doit.widgets.core.WidgetPayload;
import com.forthexp.doit.widgets.core.WidgetThemeHelper;

public class HeroCompanionWidget extends BaseXpWidgetProvider {

    private static final String PORTAL_URI = "com.forthexp.doit://my-portal";
    private static final int COMPANION_TARGET_PX = 160;

    @Override
    protected int providerSlot() {
        return 9;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_hero_companion);

            int themeBg = WidgetThemeHelper.getWidgetThemeDrawable(context, appWidgetId);
            views.setInt(R.id.widget_root, "setBackgroundResource", themeBg);

            if (payload.hasData()) {
                String heroId = payload.heroId();
                String name = payload.heroString("name", "Hero");
                int level = payload.heroInt("level", 1);
                String className = payload.heroString("className", "Novice");
                int streak = payload.heroInt("streak", 0);
                int hp = payload.heroInt("hp", 10);
                int maxHp = payload.heroInt("maxHp", 10);

                views.setTextViewText(R.id.widget_companion_name, name);
                views.setTextViewText(R.id.widget_companion_level, "LV " + level);
                views.setTextViewText(R.id.widget_companion_class, className);
                views.setTextViewText(R.id.widget_companion_streak, streak + "-Day Streak");

                String freshAvatarImage = payload.heroAvatarImage();
                if (freshAvatarImage != null && !freshAvatarImage.isEmpty()) {
                    WidgetImageHelper.cacheHeroVoxel(context, heroId, freshAvatarImage);
                }

                Bitmap voxel = WidgetImageHelper.loadHeroVoxelBitmap(context, heroId, COMPANION_TARGET_PX);
                if (voxel != null) {
                    views.setImageViewBitmap(R.id.widget_companion_voxel, voxel);
                } else {
                    views.setImageViewResource(R.id.widget_companion_voxel, R.drawable.ic_launcher_foreground);
                }

                String quote;
                if (streak >= 7) {
                    quote = "\"" + streak + " day streak! We are unstoppable!\"";
                } else if (streak >= 3) {
                    quote = "\"Great momentum! Keep the fire burning!\"";
                } else if (hp <= maxHp / 3) {
                    quote = "\"Low on HP! Visit the Inn to rest up!\"";
                } else {
                    quote = "\"Ready for adventure! Check the quest board!\"";
                }
                views.setTextViewText(R.id.widget_companion_quote, quote);
            } else {
                views.setTextViewText(R.id.widget_companion_name, "Hero");
                views.setTextViewText(R.id.widget_companion_level, "LV --");
                views.setTextViewText(R.id.widget_companion_class, "Adventurer");
                views.setTextViewText(R.id.widget_companion_streak, "Streak --");
                views.setTextViewText(R.id.widget_companion_quote, "\"Tap to summon your hero companion!\"");
                views.setImageViewResource(R.id.widget_companion_voxel, R.drawable.ic_launcher_foreground);
            }

            PendingIntent launchIntent = createLaunchPendingIntent(context, PORTAL_URI, requestCode(appWidgetId, 0));
            views.setOnClickPendingIntent(R.id.widget_root, launchIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

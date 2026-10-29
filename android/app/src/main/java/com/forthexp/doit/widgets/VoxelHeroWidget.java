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

public class VoxelHeroWidget extends BaseXpWidgetProvider {

    private static final String PROFILE_URI = "com.forthexp.doit://my-portal";
    private static final int BITMAP_TARGET_PX = 240;

    @Override
    protected int providerSlot() {
        return 12;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            WidgetPayload payload = WidgetPayload.read(context, appWidgetId);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_voxel_hero);

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

                views.setTextViewText(R.id.widget_voxel_hero_name, name);
                views.setTextViewText(R.id.widget_voxel_hero_level, "LV " + level);
                views.setTextViewText(R.id.widget_voxel_hero_class, className);

                String statusLabel = streak > 0 ? streak + "-Day Streak" : hp + "/" + maxHp + " HP";
                views.setTextViewText(R.id.widget_voxel_hero_status, statusLabel);

                String freshAvatarImage = payload.heroAvatarImage();
                if (freshAvatarImage != null && !freshAvatarImage.isEmpty()) {
                    WidgetImageHelper.cacheHeroVoxel(context, heroId, freshAvatarImage);
                }

                Bitmap voxel = WidgetImageHelper.loadHeroVoxelBitmap(context, heroId, BITMAP_TARGET_PX);
                if (voxel != null) {
                    views.setImageViewBitmap(R.id.widget_voxel_hero_image, voxel);
                } else {
                    views.setImageViewResource(R.id.widget_voxel_hero_image, R.drawable.ic_launcher_foreground);
                }
            } else {
                views.setTextViewText(R.id.widget_voxel_hero_name, "Hero Figurine");
                views.setTextViewText(R.id.widget_voxel_hero_level, "LV --");
                views.setTextViewText(R.id.widget_voxel_hero_class, "Tap to load 3D hero");
                views.setTextViewText(R.id.widget_voxel_hero_status, "Offline");
                views.setImageViewResource(R.id.widget_voxel_hero_image, R.drawable.ic_launcher_foreground);
            }

            PendingIntent openProfile = createLaunchPendingIntent(context, PROFILE_URI, requestCode(appWidgetId, 0));
            views.setOnClickPendingIntent(R.id.widget_root, openProfile);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

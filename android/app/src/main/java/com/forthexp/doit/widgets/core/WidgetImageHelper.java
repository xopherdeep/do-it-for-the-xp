package com.forthexp.doit.widgets.core;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.util.Log;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public final class WidgetImageHelper {

    private static final String TAG = "WidgetImageHelper";
    private static final String VOXEL_PREFIX = "voxel_";
    private static final String EXTENSION = ".png";

    private WidgetImageHelper() {
    }

    public static File getVoxelFile(Context context, String heroId) {
        if (heroId == null || heroId.trim().isEmpty()) {
            return null;
        }
        return new File(context.getFilesDir(), VOXEL_PREFIX + heroId.trim() + EXTENSION);
    }

    public static void cacheHeroVoxel(Context context, String heroId, String dataUrl) {
        if (context == null || heroId == null || dataUrl == null) {
            return;
        }

        int commaIndex = dataUrl.indexOf(',');
        if (commaIndex < 0) {
            return;
        }

        try {
            String base64Data = dataUrl.substring(commaIndex + 1);
            byte[] decoded = Base64.decode(base64Data, Base64.DEFAULT);
            if (decoded == null || decoded.length == 0) {
                return;
            }

            File targetFile = getVoxelFile(context, heroId);
            if (targetFile == null) {
                return;
            }

            try (FileOutputStream out = new FileOutputStream(targetFile)) {
                out.write(decoded);
                out.flush();
            }
        } catch (IllegalArgumentException | IOException error) {
            Log.w(TAG, "Failed to cache hero voxel for id: " + heroId, error);
        }
    }

    public static Bitmap loadHeroVoxelBitmap(Context context, String heroId, int maxPx) {
        File file = getVoxelFile(context, heroId);
        if (file == null || !file.exists() || !file.canRead()) {
            return null;
        }

        try {
            BitmapFactory.Options boundsOptions = new BitmapFactory.Options();
            boundsOptions.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(file.getAbsolutePath(), boundsOptions);

            int width = boundsOptions.outWidth;
            int height = boundsOptions.outHeight;
            if (width <= 0 || height <= 0) {
                return null;
            }

            int inSampleSize = 1;
            while (width / inSampleSize > maxPx || height / inSampleSize > maxPx) {
                inSampleSize *= 2;
            }

            BitmapFactory.Options decodeOptions = new BitmapFactory.Options();
            decodeOptions.inSampleSize = inSampleSize;
            decodeOptions.inPreferredConfig = Bitmap.Config.ARGB_8888;

            Bitmap bitmap = BitmapFactory.decodeFile(file.getAbsolutePath(), decodeOptions);
            if (bitmap != null && (bitmap.getWidth() > maxPx || bitmap.getHeight() > maxPx)) {
                Bitmap scaled = Bitmap.createScaledBitmap(bitmap, maxPx, maxPx, true);
                if (scaled != bitmap) {
                    bitmap.recycle();
                }
                return scaled;
            }
            return bitmap;
        } catch (Exception error) {
            Log.w(TAG, "Failed to decode hero voxel bitmap for id: " + heroId, error);
            return null;
        }
    }
}

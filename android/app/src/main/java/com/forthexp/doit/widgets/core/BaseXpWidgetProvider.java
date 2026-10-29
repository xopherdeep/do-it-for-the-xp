package com.forthexp.doit.widgets.core;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import com.forthexp.doit.MainActivity;
import java.util.ArrayList;
import java.util.List;

public abstract class BaseXpWidgetProvider extends AppWidgetProvider {

    /**
     * A distinct value per provider, 0-31. PendingIntent request codes live in one space for
     * the whole app, so without it two widgets of different kinds that happen to share an
     * appWidgetId would resolve to a single intent and both launch the same screen.
     */
    protected abstract int providerSlot();

    /**
     * A request code no other widget can produce: the appWidgetId, the provider and up to
     * eight click targets within the layout, packed together.
     */
    protected final int requestCode(int appWidgetId, int target) {
        return (appWidgetId << 8) | ((providerSlot() & 0x1F) << 3) | (target & 0x7);
    }

    protected PendingIntent createLaunchPendingIntent(Context context, String deepLinkUri, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (deepLinkUri != null && !deepLinkUri.isEmpty()) {
            intent.setData(Uri.parse(deepLinkUri));
        }
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    /** A removed widget keeps no theme or hero binding: those keys would otherwise outlive it forever. */
    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        super.onDeleted(context, appWidgetIds);
        SharedPreferences.Editor editor = WidgetThemeHelper.getPrefs(context).edit();
        for (int appWidgetId : appWidgetIds) {
            editor.remove(WidgetThemeHelper.KEY_THEME_PREFIX + appWidgetId);
            editor.remove(WidgetPayload.KEY_HERO_PREFIX + appWidgetId);
        }
        editor.apply();
    }

    /**
     * The last widget of this kind is gone. Every provider shares one prefs file, so this
     * sweeps only the ids the host no longer knows about - a widget removed while we were
     * not running, or one lost to a restore - and leaves live widgets of other kinds alone.
     */
    @Override
    public void onDisabled(Context context) {
        super.onDisabled(context);
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        SharedPreferences prefs = WidgetThemeHelper.getPrefs(context);
        List<String> stale = new ArrayList<>();

        for (String key : prefs.getAll().keySet()) {
            int appWidgetId = widgetIdIn(key);
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID && manager.getAppWidgetInfo(appWidgetId) == null) {
                stale.add(key);
            }
        }

        if (stale.isEmpty()) {
            return;
        }

        SharedPreferences.Editor editor = prefs.edit();
        for (String key : stale) {
            editor.remove(key);
        }
        editor.apply();
    }

    /** The appWidgetId a per-widget key is suffixed with, or INVALID when the key is not one of ours. */
    private static int widgetIdIn(String key) {
        String suffix = null;
        if (key.startsWith(WidgetThemeHelper.KEY_THEME_PREFIX)) {
            suffix = key.substring(WidgetThemeHelper.KEY_THEME_PREFIX.length());
        } else if (key.startsWith(WidgetPayload.KEY_HERO_PREFIX)) {
            suffix = key.substring(WidgetPayload.KEY_HERO_PREFIX.length());
        }
        if (suffix == null) {
            return AppWidgetManager.INVALID_APPWIDGET_ID;
        }
        try {
            return Integer.parseInt(suffix);
        } catch (NumberFormatException notAWidgetKey) {
            return AppWidgetManager.INVALID_APPWIDGET_ID;
        }
    }
}

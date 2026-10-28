package com.forthexp.doit.widgets.core;

import android.app.PendingIntent;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import com.forthexp.doit.MainActivity;

public abstract class BaseXpWidgetProvider extends AppWidgetProvider {

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
}

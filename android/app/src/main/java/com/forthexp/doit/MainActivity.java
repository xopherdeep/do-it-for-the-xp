package com.forthexp.doit;

import android.os.Bundle;
import com.forthexp.doit.plugins.XpWidgetPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(XpWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

package com.yueting.music;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Logger;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(MusicScannerPlugin.class);
        registerPlugin(PlaybackPlugin.class);
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        splashScreen.setKeepOnScreenCondition(() -> {
            Bridge bridge = getBridge();
            if (bridge == null) {
                return true;
            }
            WebView webView = bridge.getWebView();
            if (webView != null) {
                webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            }
            return webView == null || webView.getProgress() < 100;
        });
    }

    /** 播放中切到后台：不暂停 WebView，保证原生定时器触发时 JS 能自动切歌 */
    @Override
    public void onPause() {
        super.onPause();
        if (bridge != null) {
            if (PlaybackKeepAlive.isActive()) {
                Logger.debug("App paused — playback keep-alive, skip bridge.onPause()");
            } else {
                bridge.onPause();
            }
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (bridge != null) {
            activityDepth = Math.max(0, activityDepth - 1);
            if (activityDepth == 0) {
                bridge.getApp().fireStatusChange(false);
            }
            if (PlaybackKeepAlive.isActive()) {
                Logger.debug("App stopped — playback keep-alive, skip bridge.onStop()");
            } else {
                bridge.onStop();
            }
        }
    }
}

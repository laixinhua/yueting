package com.yueting.music;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.content.pm.ApplicationInfo;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "SysNavInset";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
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

        // 自适应系统导航栏：监听 WindowInsets 的真实底部插入量。
        // 手势导航 -> 插入量=0（不留间距，保持原样）；
        // 传统按钮/双键导航 -> 插入量=真实系统栏高度（预留间距，避免 BottomNav 重叠）。
        // 用户在系统设置里随时切换导航方式都会触发本监听重新分发，无需重启 App。
        View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            int bottomPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            applySysNavInset(bottomPx);
            return insets;
        });
        // 强制触发一次初始分发，确保启动/首帧就能拿到正确高度
        ViewCompat.requestApplyInsets(decor);

        // 兜底：首次启动时 WebView 可能尚未就绪，上面的注入会落空。
        // 延迟一小段时间后直接读取并强制注入一次，避免「只注册监听却永远拿不到值」。
        decor.postDelayed(this::applySysNavInsetNow, 500);
    }

    @Override
    public void onResume() {
        super.onResume();
        // 直接读取当前真实插入量并注入，不依赖 requestApplyInsets 是否重新分发
        // （Android 在插入量未变化时不会重复分发，会导致只注册监听却永远拿不到值）。
        applySysNavInsetNow();
    }

    /** 直接读取 decorView 的当前 WindowInsets 并注入 --sys-nav-h（绕过监听重分发去重）。 */
    private void applySysNavInsetNow() {
        View decor = getWindow().getDecorView();
        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decor);
        if (insets == null) {
            // 窗口尚未完成布局，稍后再试
            decor.postDelayed(this::applySysNavInsetNow, 200);
            return;
        }
        int bottomPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
        applySysNavInset(bottomPx);
    }

    /**
     * 把系统导航栏底部真实高度（设备像素）转成 CSS 像素注入网页。
     * 手势模式下 bottomPx=0 -> 间距归零；按钮模式下 bottomPx=真实高度 -> 预留间距。
     */
    private void applySysNavInset(int bottomPx) {
        Bridge bridge = getBridge();
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;

        float density = getResources().getDisplayMetrics().density;
        float cssPx = (density > 0f) ? (bottomPx / density) : bottomPx;
        Log.i(TAG, "SysNavInset: bottomPx=" + bottomPx + " cssPx=" + cssPx);
        String js = "try{document.documentElement.style.setProperty('--sys-nav-h','" + cssPx + "px');}catch(e){}";
        webView.evaluateJavascript(js, null);
    }

    /** 播放中切到后台：不暂停 WebView，保证原生定时器触发时 JS 能自动切歌 */
    @Override
    public void onPause() {
        super.onPause();
        if (bridge != null) {
            if (PlaybackKeepAlive.isActive()) {
                Log.d(TAG, "App paused — playback keep-alive, skip bridge.onPause()");
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
                Log.d(TAG, "App stopped — playback keep-alive, skip bridge.onStop()");
            } else {
                bridge.onStop();
            }
        }
    }
}

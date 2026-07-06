package com.yueting.music;

import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** 后台 WebView JS 会被冻结，用原生 Handler 在预计播完时通知 JS 切歌 */
@CapacitorPlugin(name = "Playback")
public class PlaybackPlugin extends Plugin {
    private static final String ADVANCE_TRACK_JS =
            "try{if(typeof window.__yuetingAdvanceTrack==='function'){window.__yuetingAdvanceTrack();}"
                    + "else{window.dispatchEvent(new CustomEvent('yuetingNativeTrackEnd'));}}catch(e){}";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable pendingEnd;

    @PluginMethod
    public void setKeepAlive(PluginCall call) {
        Boolean active = call.getBoolean("active", false);
        PlaybackKeepAlive.setActive(getContext(), active != null && active);
        call.resolve();
    }

    @PluginMethod
    public void scheduleTrackEnd(PluginCall call) {
        Integer delayMs = call.getInt("delayMs", 0);
        int delay = delayMs != null ? delayMs : 0;
        cancelPending();
        if (delay <= 0) {
            notifyTrackEndDue();
            call.resolve();
            return;
        }
        pendingEnd =
                () -> {
                    pendingEnd = null;
                    notifyTrackEndDue();
                };
        handler.postDelayed(pendingEnd, delay);
        call.resolve();
    }

    @PluginMethod
    public void cancelTrackEnd(PluginCall call) {
        cancelPending();
        call.resolve();
    }

    private void cancelPending() {
        if (pendingEnd != null) {
            handler.removeCallbacks(pendingEnd);
            pendingEnd = null;
        }
    }

    private void notifyTrackEndDue() {
        notifyListeners("trackEndDue", new JSObject());
        Bridge bridge = getBridge();
        if (bridge == null) return;
        bridge.eval(ADVANCE_TRACK_JS, null);
    }
}

package com.yueting.music;

import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import androidx.core.content.ContextCompat;

/** 播放进行中：前台服务 + WakeLock，避免 WebView 在后台被冻结无法自动切歌 */
public final class PlaybackKeepAlive {
    private static volatile boolean active = false;
    private static PowerManager.WakeLock wakeLock;

    private PlaybackKeepAlive() {}

    public static boolean isActive() {
        return active;
    }

    public static void setActive(Context context, boolean value) {
        if (context == null) return;
        Context app = context.getApplicationContext();
        if (value) {
            if (active) return;
            active = true;
            acquireWakeLock(app);
            startForegroundService(app);
        } else {
            if (!active) return;
            active = false;
            releaseWakeLock();
            stopForegroundService(app);
        }
    }

    private static void acquireWakeLock(Context context) {
        releaseWakeLock();
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "yueting:playback");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire(6 * 60 * 60 * 1000L);
    }

    private static void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        wakeLock = null;
    }

    private static void startForegroundService(Context context) {
        Intent intent = new Intent(context, MusicPlaybackService.class);
        ContextCompat.startForegroundService(context, intent);
    }

    private static void stopForegroundService(Context context) {
        context.stopService(new Intent(context, MusicPlaybackService.class));
    }
}

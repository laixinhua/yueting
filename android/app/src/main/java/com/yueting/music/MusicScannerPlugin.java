package com.yueting.music;

import android.Manifest;
import android.content.ContentUris;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(
    name = "MusicScanner",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_MEDIA_AUDIO }, alias = MusicScannerPlugin.PERM_AUDIO),
        @Permission(strings = { Manifest.permission.READ_EXTERNAL_STORAGE }, alias = MusicScannerPlugin.PERM_STORAGE)
    }
)
public class MusicScannerPlugin extends Plugin {

    static final String PERM_AUDIO = "audio";
    static final String PERM_STORAGE = "storage";

    @PluginMethod
    public void scan(PluginCall call) {
        if (!hasReadPermission()) {
            if (Build.VERSION.SDK_INT >= 33) {
                requestPermissionForAlias(PERM_AUDIO, call, "scanPermissionCallback");
            } else {
                requestPermissionForAlias(PERM_STORAGE, call, "scanPermissionCallback");
            }
            return;
        }
        runScan(call);
    }

    @PermissionCallback
    private void scanPermissionCallback(PluginCall call) {
        if (hasReadPermission()) {
            runScan(call);
        } else {
            call.reject("需要存储权限才能扫描本地音乐");
        }
    }

    @PluginMethod
    public void downloadAudio(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("缺少 url");
            return;
        }
        getBridge().execute(() -> {
            try {
                JSObject ret = downloadAudioToCache(url);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("下载失败: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void saveDownload(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName");
        if (url == null || url.isEmpty() || fileName == null || fileName.isEmpty()) {
            call.reject("缺少 url 或 fileName");
            return;
        }
        if (!hasReadPermission()) {
            if (Build.VERSION.SDK_INT >= 33) {
                requestPermissionForAlias(PERM_AUDIO, call, "saveDownloadPermissionCallback");
            } else {
                requestPermissionForAlias(PERM_STORAGE, call, "saveDownloadPermissionCallback");
            }
            return;
        }
        runSaveDownload(call);
    }

    @PermissionCallback
    private void saveDownloadPermissionCallback(PluginCall call) {
        if (hasReadPermission()) {
            runSaveDownload(call);
        } else {
            call.reject("需要存储权限才能下载到本地");
        }
    }

    private void runSaveDownload(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName");
        String title = call.getString("title", stripExt(fileName));
        String artist = call.getString("artist", "未知歌手");
        String album = call.getString("album", "本地下载");

        getBridge().execute(() -> {
            try {
                JSObject ret = saveDownloadToMediaStore(url, fileName, title, artist, album);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("下载失败: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void importTrack(PluginCall call) {
        String uriString = call.getString("uri");
        if (uriString == null || uriString.isEmpty()) {
            call.reject("缺少 uri");
            return;
        }
        if (!hasReadPermission()) {
            call.reject("没有存储权限");
            return;
        }

        getBridge().execute(() -> {
            try {
                Uri uri = Uri.parse(uriString);
                JSObject track = importOne(uri);
                call.resolve(track);
            } catch (Exception e) {
                call.reject("导入失败: " + e.getMessage());
            }
        });
    }

    private boolean hasReadPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            return getPermissionState(PERM_AUDIO) == PermissionState.GRANTED;
        }
        return getPermissionState(PERM_STORAGE) == PermissionState.GRANTED;
    }

    private void runScan(PluginCall call) {
        getBridge().execute(() -> {
            try {
                JSArray tracks = queryAudioTracks();
                JSObject ret = new JSObject();
                ret.put("tracks", tracks);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("扫描失败: " + e.getMessage());
            }
        });
    }

    private JSArray queryAudioTracks() {
        JSArray result = new JSArray();
        String[] projection = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.DISPLAY_NAME,
        };

        String selection = MediaStore.Audio.Media.IS_MUSIC + "=1 AND " + MediaStore.Audio.Media.SIZE + ">8192";
        String sort = MediaStore.Audio.Media.DATE_ADDED + " DESC";

        try (Cursor cursor = getContext().getContentResolver().query(
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
            projection,
            selection,
            null,
            sort
        )) {
            if (cursor == null) {
                return result;
            }
            int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
            int titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
            int artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
            int albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
            int durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
            int sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE);
            int nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME);

            while (cursor.moveToNext()) {
                long id = cursor.getLong(idCol);
                String displayName = cursor.getString(nameCol);
                if (displayName == null || !isAudioFileName(displayName)) {
                    continue;
                }

                Uri contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
                long durationMs = cursor.getLong(durationCol);
                int durationSec = durationMs > 0 ? (int) Math.round(durationMs / 1000.0) : 0;

                JSObject row = new JSObject();
                row.put("mediaId", String.valueOf(id));
                row.put("uri", contentUri.toString());
                row.put("title", nullToDefault(cursor.getString(titleCol), stripExt(displayName)));
                row.put("artist", sanitizeMeta(cursor.getString(artistCol)));
                row.put("album", sanitizeMeta(cursor.getString(albumCol)));
                row.put("duration", durationSec);
                row.put("size", cursor.getLong(sizeCol));
                row.put("fileName", displayName);
                row.put("fileKey", "android-media:" + id);
                result.put(row);
            }
        }
        return result;
    }

    private JSObject importOne(Uri uri) throws Exception {
        String[] projection = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.DISPLAY_NAME,
        };

        try (Cursor cursor = getContext().getContentResolver().query(uri, projection, null, null, null)) {
            if (cursor == null || !cursor.moveToFirst()) {
                throw new Exception("无法读取歌曲信息");
            }

            int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
            int titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
            int artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
            int albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
            int durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
            int nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME);

            long id = cursor.getLong(idCol);
            String displayName = nullToDefault(cursor.getString(nameCol), "track.mp3");
            long durationMs = cursor.getLong(durationCol);
            int durationSec = durationMs > 0 ? (int) Math.round(durationMs / 1000.0) : 240;

            String path = copyUriToAppStorage(uri, displayName);

            JSObject row = new JSObject();
            row.put("mediaId", String.valueOf(id));
            row.put("uri", uri.toString());
            row.put("path", path);
            row.put("title", nullToDefault(cursor.getString(titleCol), stripExt(displayName)));
            row.put("artist", sanitizeMeta(cursor.getString(artistCol)));
            row.put("album", sanitizeMeta(cursor.getString(albumCol)));
            row.put("duration", durationSec);
            row.put("fileName", displayName);
            row.put("fileKey", "android-media:" + id);
            return row;
        }
    }

    private String copyUriToAppStorage(Uri uri, String displayName) throws Exception {
        File dir = new File(getContext().getFilesDir(), "music-import");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new Exception("无法创建导入目录");
        }
        String safeName = displayName.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        File out = new File(dir, System.currentTimeMillis() + "_" + safeName);

        try (InputStream in = getContext().getContentResolver().openInputStream(uri);
             OutputStream outStream = new FileOutputStream(out)) {
            if (in == null) {
                throw new Exception("无法打开文件");
            }
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) >= 0) {
                outStream.write(buf, 0, n);
            }
        }
        return out.getAbsolutePath();
    }

    private JSObject saveDownloadToMediaStore(
        String urlString,
        String fileName,
        String title,
        String artist,
        String album
    ) throws Exception {
        String safeName = sanitizeFileName(fileName);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return saveDownloadMediaStoreQ(urlString, safeName, title, artist, album);
        }
        return saveDownloadLegacy(urlString, safeName, title, artist, album);
    }

    private JSObject saveDownloadMediaStoreQ(
        String urlString,
        String fileName,
        String title,
        String artist,
        String album
    ) throws Exception {
        deleteExistingYuetingDownloads(fileName);

        ContentValues values = new ContentValues();
        values.put(MediaStore.Audio.Media.TITLE, title);
        values.put(MediaStore.Audio.Media.ARTIST, nullToDefault(artist, "未知歌手"));
        values.put(MediaStore.Audio.Media.ALBUM, nullToDefault(album, "本地下载"));
        values.put(MediaStore.Audio.Media.DISPLAY_NAME, fileName);
        values.put(MediaStore.Audio.Media.MIME_TYPE, guessMimeType(fileName));
        values.put(MediaStore.Audio.Media.IS_MUSIC, 1);
        values.put(MediaStore.Audio.Media.RELATIVE_PATH, Environment.DIRECTORY_MUSIC + "/悦听");
        values.put(MediaStore.Audio.Media.IS_PENDING, 1);

        Uri collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        Uri itemUri = getContext().getContentResolver().insert(collection, values);
        if (itemUri == null) {
            throw new Exception("无法创建音乐文件");
        }

        try (OutputStream out = getContext().getContentResolver().openOutputStream(itemUri)) {
            downloadUrlToStream(urlString, out);
        } catch (Exception e) {
            getContext().getContentResolver().delete(itemUri, null, null);
            throw e;
        }

        ContentValues done = new ContentValues();
        done.put(MediaStore.Audio.Media.IS_PENDING, 0);
        getContext().getContentResolver().update(itemUri, done, null, null);

        long id = ContentUris.parseId(itemUri);
        JSObject row = new JSObject();
        row.put("mediaId", String.valueOf(id));
        row.put("uri", itemUri.toString());
        row.put("fileName", fileName);
        row.put("fileKey", "android-media:" + id);
        return row;
    }

    private JSObject saveDownloadLegacy(
        String urlString,
        String fileName,
        String title,
        String artist,
        String album
    ) throws Exception {
        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC), "悦听");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new Exception("无法创建下载目录");
        }
        deleteLegacyMediaEntries(dir, fileName);
        deleteExistingLegacyFiles(dir, fileName);
        File outFile = new File(dir, fileName);

        try (OutputStream out = new FileOutputStream(outFile)) {
            downloadUrlToStream(urlString, out);
        }

        ContentValues values = new ContentValues();
        values.put(MediaStore.Audio.Media.TITLE, title);
        values.put(MediaStore.Audio.Media.ARTIST, nullToDefault(artist, "未知歌手"));
        values.put(MediaStore.Audio.Media.ALBUM, nullToDefault(album, "本地下载"));
        values.put(MediaStore.Audio.Media.DISPLAY_NAME, fileName);
        values.put(MediaStore.Audio.Media.MIME_TYPE, guessMimeType(fileName));
        values.put(MediaStore.Audio.Media.IS_MUSIC, 1);
        values.put(MediaStore.Audio.Media.DATA, outFile.getAbsolutePath());

        Uri itemUri = getContext().getContentResolver().insert(
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
            values
        );
        if (itemUri == null) {
            throw new Exception("无法注册到系统媒体库");
        }

        long id = ContentUris.parseId(itemUri);
        JSObject row = new JSObject();
        row.put("mediaId", String.valueOf(id));
        row.put("uri", itemUri.toString());
        row.put("fileName", fileName);
        row.put("fileKey", "android-media:" + id);
        return row;
    }

    private void deleteExistingYuetingDownloads(String fileName) {
        String stem = stripExt(fileName);
        String ext = fileName.length() > stem.length() ? fileName.substring(stem.length()) : ".mp3";
        String relPath = Environment.DIRECTORY_MUSIC + "/悦听";
        String relPathSlash = relPath + "/";

        String selection =
            "("
                + MediaStore.Audio.Media.RELATIVE_PATH
                + "=? OR "
                + MediaStore.Audio.Media.RELATIVE_PATH
                + "=?) AND ("
                + MediaStore.Audio.Media.DISPLAY_NAME
                + "=? OR "
                + MediaStore.Audio.Media.DISPLAY_NAME
                + " LIKE ?)";
        String[] args = { relPath, relPathSlash, fileName, stem + " (%)" + ext };

        Uri collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        String[] projection = { MediaStore.Audio.Media._ID };
        try (Cursor cursor =
            getContext().getContentResolver().query(collection, projection, selection, args, null)) {
            if (cursor == null) {
                return;
            }
            int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
            while (cursor.moveToNext()) {
                long id = cursor.getLong(idCol);
                Uri itemUri = ContentUris.withAppendedId(collection, id);
                getContext().getContentResolver().delete(itemUri, null, null);
            }
        }
    }

    private static void deleteExistingLegacyFiles(File dir, String fileName) {
        if (!dir.isDirectory()) {
            return;
        }
        String stem = stripExt(fileName);
        String ext = fileName.length() > stem.length() ? fileName.substring(stem.length()) : ".mp3";
        File[] files = dir.listFiles();
        if (files == null) {
            return;
        }
        for (File file : files) {
            if (!file.isFile()) {
                continue;
            }
            String name = file.getName();
            if (name.equals(fileName) || name.matches(stem + " \\(\\d+\\)" + ext.replace(".", "\\."))) {
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            }
        }
    }

    private void deleteLegacyMediaEntries(File dir, String fileName) {
        String stem = stripExt(fileName);
        String ext = fileName.length() > stem.length() ? fileName.substring(stem.length()) : ".mp3";
        String basePath = dir.getAbsolutePath() + "/";
        deleteLegacyMediaByDataPath(basePath + fileName);
        String escapedStem = stem.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        String likeArg = basePath + escapedStem + " (%)" + ext;
        deleteLegacyMediaBySelection(MediaStore.Audio.Media.DATA + " LIKE ? ESCAPE '\\'", new String[] { likeArg });
    }

    private void deleteLegacyMediaByDataPath(String absolutePath) {
        deleteLegacyMediaBySelection(MediaStore.Audio.Media.DATA + "=?", new String[] { absolutePath });
    }

    private void deleteLegacyMediaBySelection(String selection, String[] args) {
        try (Cursor cursor =
            getContext()
                .getContentResolver()
                .query(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    new String[] { MediaStore.Audio.Media._ID },
                    selection,
                    args,
                    null)) {
            if (cursor == null) {
                return;
            }
            int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
            while (cursor.moveToNext()) {
                long id = cursor.getLong(idCol);
                Uri itemUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
                getContext().getContentResolver().delete(itemUri, null, null);
            }
        }
    }

    private JSObject downloadAudioToCache(String urlString) throws Exception {
        File dir = new File(getContext().getCacheDir(), "audio-download");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new Exception("无法创建缓存目录");
        }
        File out = new File(dir, System.currentTimeMillis() + ".mp3");
        try (FileOutputStream fos = new FileOutputStream(out)) {
            downloadUrlToStream(urlString, fos, false);
        } catch (Exception e) {
            //noinspection ResultOfMethodCallIgnored
            out.delete();
            throw e;
        }
        long size = out.length();
        if (size < 1024) {
            //noinspection ResultOfMethodCallIgnored
            out.delete();
            throw new Exception("下载的文件无效");
        }
        JSObject row = new JSObject();
        row.put("path", out.getAbsolutePath());
        row.put("size", size);
        return row;
    }

    private void downloadUrlToStream(String urlString, OutputStream out) throws Exception {
        downloadUrlToStream(urlString, out, true);
    }

    private void downloadUrlToStream(String urlString, OutputStream out, boolean closeOut) throws Exception {
        if (out == null) {
            throw new Exception("无法写入文件");
        }
        URL url = new URL(urlString);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(180000);
        conn.setInstanceFollowRedirects(true);
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) AppleWebKit/537.36");
        conn.setRequestProperty("Referer", "https://music.163.com/");
        conn.setRequestProperty("Origin", "https://music.163.com");
        conn.setRequestProperty("Accept", "*/*");
        conn.setRequestProperty("Accept-Encoding", "identity");
        try {
            int code = conn.getResponseCode();
            if (code >= 400) {
                throw new Exception("HTTP " + code);
            }
            try (InputStream in = conn.getInputStream()) {
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) >= 0) {
                    out.write(buf, 0, n);
                }
            }
        } finally {
            conn.disconnect();
            if (closeOut) {
                out.close();
            }
        }
    }

    private static String sanitizeFileName(String name) {
        String safe = name.replaceAll("[^a-zA-Z0-9._\\-\\u4e00-\\u9fff\\s]", "_").trim();
        if (safe.isEmpty()) {
            return "track.mp3";
        }
        if (!isAudioFileName(safe)) {
            return safe + ".mp3";
        }
        return safe;
    }

    private static String guessMimeType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".flac")) return "audio/flac";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".m4a")) return "audio/mp4";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        return "audio/mpeg";
    }

    private static boolean isAudioFileName(String name) {
        String lower = name.toLowerCase();
        return lower.endsWith(".mp3")
            || lower.endsWith(".flac")
            || lower.endsWith(".wav")
            || lower.endsWith(".m4a")
            || lower.endsWith(".ogg")
            || lower.endsWith(".aac")
            || lower.endsWith(".ape")
            || lower.endsWith(".wma")
            || lower.endsWith(".opus");
    }

    private static String stripExt(String name) {
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    private static String sanitizeMeta(String value) {
        if (value == null) {
            return "";
        }
        String v = value.trim();
        if (v.isEmpty()) {
            return "";
        }
        String lower = v.toLowerCase();
        if (lower.equals("unknown")
            || lower.equals("<unknown>")
            || lower.equals("unknown artist")
            || lower.equals("unknown album")
            || v.equals("未知歌手")
            || v.equals("未知专辑")) {
            return "";
        }
        return v;
    }

    private static String nullToDefault(String value, String fallback) {
        if (value == null || value.trim().isEmpty()) {
            return fallback;
        }
        return value.trim();
    }
}

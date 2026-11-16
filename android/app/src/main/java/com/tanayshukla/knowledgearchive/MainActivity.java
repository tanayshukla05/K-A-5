package com.tanayshukla.knowledgearchive;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * The archive's Android shell.
 *
 * Content auto-update — the archive inside the APK is a snapshot, but when
 * the device is online the WebView is pointed at the live deployed site, so
 * every push to the site (new links, new rooms, new materials) appears in
 * the app with no reinstall at all. Offline, the shell keeps the bundled
 * snapshot from the APK, so the archive always opens, connectivity or not.
 *
 * APK self-update — on launch (when online) the shell quietly reads
 * app-update.json from the live site. When it advertises a higher
 * versionCode than the installed app, the new APK is downloaded into the
 * cache and handed to the system package installer, which shows the
 * one-tap Update prompt Android requires. The check runs at most once per
 * advertised version per day, so a pending update never nags.
 */
public class MainActivity extends BridgeActivity {

    /** The deployed site the shell loads while online. */
    private static final String LIVE_SITE = "https://k-a-5.vercel.app/";

    /** Where the shell looks for update metadata and the new APK. */
    private static final String UPDATE_MANIFEST_URL = LIVE_SITE + "app-update.json";

    /** Re-prompt interval for the same pending update. */
    private static final long PROMPT_INTERVAL_MS = 24L * 60 * 60 * 1000;

    @Override
    protected void load() {
        // Runs before the Bridge is built, so injecting the live-site URL
        // here decides remote-vs-bundled for this entire session.
        if (isOnline()) {
            try {
                JSONObject json = readConfigJson();
                JSONObject server = json.optJSONObject("server");
                if (server == null) {
                    server = new JSONObject();
                    json.put("server", server);
                }
                server.put("url", LIVE_SITE);
                this.config = new CapConfig(getAssets(), json);
            } catch (Exception ex) {
                // any config trouble falls through to the bundled snapshot
            }
        }
        super.load();
        checkForAppUpdate();
    }

    /** The bundled capacitor.config.json, exactly as the bridge would read it. */
    private JSONObject readConfigJson() throws Exception {
        InputStream in = getAssets().open("capacitor.config.json");
        try {
            java.util.Scanner s = new java.util.Scanner(in, "UTF-8").useDelimiter("\\A");
            return new JSONObject(s.hasNext() ? s.next() : "{}");
        } finally {
            in.close();
        }
    }

    /**
     * Validated connectivity — NET_CAPABILITY_VALIDATED means Android itself
     * confirmed real internet on this network, not just an attached radio.
     */
    private boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        Network network = cm.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(network);
        return caps != null
            && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    // ------------------------------------------------------------------
    // APK self-update
    // ------------------------------------------------------------------

    private void checkForAppUpdate() {
        if (!isOnline()) return;
        new Thread(() -> {
            try {
                String body = httpGet(UPDATE_MANIFEST_URL);
                if (body == null) return;
                JSONObject manifest = new JSONObject(body);
                long available = manifest.optLong("versionCode", -1);
                String apkUrl = manifest.optString("url", "");
                if (available <= 0 || apkUrl.isEmpty() || available <= installedVersionCode()) {
                    return; // up to date, or nothing advertised
                }
                // at most one prompt per advertised version per day
                SharedPreferences prefs = getSharedPreferences("archive_updates", Context.MODE_PRIVATE);
                long lastPrompt = prefs.getLong("prompted_" + available, 0L);
                if (System.currentTimeMillis() - lastPrompt < PROMPT_INTERVAL_MS) return;

                String absolute = apkUrl.startsWith("http") ? apkUrl : LIVE_SITE + apkUrl.replaceAll("^/+", "");
                File apk = downloadUpdate(absolute);
                if (apk == null) return; // failed — retry silently next launch
                prefs.edit().putLong("prompted_" + available, System.currentTimeMillis()).apply();
                promptInstall(apk);
            } catch (Exception ex) {
                // updates are opportunistic — they must never disturb the app
            }
        }, "archive-update-check").start();
    }

    private long installedVersionCode() {
        try {
            PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
            return (Build.VERSION.SDK_INT >= 28) ? pi.getLongVersionCode() : pi.versionCode;
        } catch (Exception ex) {
            return 0;
        }
    }

    private String httpGet(String url) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            conn.setRequestProperty("Cache-Control", "no-cache");
            if (conn.getResponseCode() != 200) return null;
            InputStream in = conn.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            in.close();
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private File downloadUpdate(String url) {
        File dir = new File(getCacheDir(), "updates");
        dir.mkdirs();
        File dst = new File(dir, "knowledge-archive-update.apk");
        HttpURLConnection conn = null;
        try {
            runOnUiThread(() ->
                Toast.makeText(this, "Archive update found — downloading…", Toast.LENGTH_SHORT).show());
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(15000);
            InputStream in = conn.getInputStream();
            FileOutputStream out = new FileOutputStream(dst);
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            out.close();
            in.close();
            if (dst.length() < 1024 * 1024) { // nowhere near a real archive APK
                dst.delete();
                return null;
            }
            return dst;
        } catch (Exception ex) {
            if (dst.exists()) dst.delete();
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void promptInstall(File apk) {
        runOnUiThread(() -> {
            try {
                Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apk);
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(uri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivity(intent);
            } catch (Exception ex) {
                Toast.makeText(this, "Update downloaded — couldn't open the installer", Toast.LENGTH_LONG).show();
            }
        });
    }
}

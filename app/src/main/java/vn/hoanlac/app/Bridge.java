package vn.hoanlac.app;

import android.app.Activity;
import android.content.Context;
import android.net.wifi.WifiManager;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

/**
 * Cầu nối giữa trang web (window.Android) và phần mạng của Android:
 * mở hồ (chạy server socket + phát tín hiệu), tìm hồ trong cùng Wi-Fi.
 */
public class Bridge {

    public static final int WS_PORT = 8787;
    public static final int DISC_PORT = 41234;
    private static final String TAG = "HoAnLac";

    private final Activity activity;
    private final WebView web;
    private LakeServer server;
    private Beacon beacon;
    private Discovery discovery;
    private WifiManager.MulticastLock lock;

    public Bridge(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
    }

    @JavascriptInterface
    public String localIp() {
        String ip = NetUtil.localIpv4();
        return ip == null ? "" : ip;
    }

    @JavascriptInterface
    public int port() {
        return WS_PORT;
    }

    /** Mở hồ trên máy này. Trả về địa chỉ IP, hoặc chuỗi bắt đầu bằng "ERR:" nếu lỗi. */
    @JavascriptInterface
    public synchronized String startHost(String lakeName) {
        stopHost();
        try {
            server = new LakeServer(WS_PORT);
            server.setReuseAddr(true);
            server.start();
            beacon = new Beacon(lakeName, WS_PORT, DISC_PORT);
            beacon.start();
            return localIp();
        } catch (Exception e) {
            Log.e(TAG, "startHost", e);
            stopHost();
            return "ERR:" + e.getMessage();
        }
    }

    @JavascriptInterface
    public synchronized void stopHost() {
        if (beacon != null) {
            beacon.shutdown();
            beacon = null;
        }
        if (server != null) {
            try {
                server.stop(500);
            } catch (Exception e) {
                Log.w(TAG, "stop server", e);
            }
            server = null;
        }
    }

    @JavascriptInterface
    public synchronized void startDiscovery() {
        stopDiscovery();
        try {
            WifiManager wm = (WifiManager) activity.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null) {
                lock = wm.createMulticastLock("hoanlac");
                lock.setReferenceCounted(false);
                lock.acquire();
            }
        } catch (Exception e) {
            Log.w(TAG, "multicast lock", e);
        }
        discovery = new Discovery(DISC_PORT, this::onLakeFound);
        discovery.start();
    }

    @JavascriptInterface
    public synchronized void stopDiscovery() {
        if (discovery != null) {
            discovery.shutdown();
            discovery = null;
        }
        if (lock != null && lock.isHeld()) {
            lock.release();
        }
        lock = null;
    }

    private void onLakeFound(String json) {
        emit("window.onLakeFound && window.onLakeFound(" + JSONObject.quote(json) + ")");
    }

    private void emit(final String js) {
        activity.runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    public void shutdown() {
        stopDiscovery();
        stopHost();
    }
}

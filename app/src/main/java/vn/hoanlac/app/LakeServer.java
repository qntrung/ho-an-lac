package vn.hoanlac.app;

import android.util.Log;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONArray;
import org.json.JSONObject;

import java.net.InetSocketAddress;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Server socket chạy trên máy chủ hồ. Server chỉ chuyển tiếp tin nhắn giữa
 * các người chơi; luật chơi (rác, cá...) do máy chủ hồ xử lý ở phía trang web.
 *
 * Giao thức (JSON):
 *  - server gửi: {t:"welcome", id, host, hostId, ids:[...]}, {t:"join", id}, {t:"leave", id}
 *  - client gửi bất kỳ {t:...}; server thêm "from". Có "to" thì chỉ gửi cho người đó,
 *    có "all":true thì gửi cả cho người gửi, còn lại gửi cho mọi người khác.
 */
public class LakeServer extends WebSocketServer {

    private static final String TAG = "HoAnLac";
    private final AtomicInteger nextId = new AtomicInteger(1);
    private final Map<Integer, WebSocket> clients = new ConcurrentHashMap<>();
    private volatile int hostId = 0;

    public LakeServer(int port) {
        super(new InetSocketAddress(port));
        setConnectionLostTimeout(20);
    }

    @Override
    public void onStart() {
        Log.i(TAG, "Lake server started on " + getPort());
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        int id = nextId.getAndIncrement();
        conn.setAttachment(id);
        boolean isHost = false;
        InetSocketAddress remote = conn.getRemoteSocketAddress();
        if (remote != null && remote.getAddress() != null && remote.getAddress().isLoopbackAddress() && hostId == 0) {
            isHost = true;
            hostId = id;
        }
        try {
            JSONObject w = new JSONObject();
            w.put("t", "welcome");
            w.put("id", id);
            w.put("host", isHost);
            w.put("hostId", hostId);
            JSONArray ids = new JSONArray();
            for (Integer other : clients.keySet()) ids.put(other);
            w.put("ids", ids);
            conn.send(w.toString());

            JSONObject j = new JSONObject();
            j.put("t", "join");
            j.put("id", id);
            String joinMsg = j.toString();
            for (WebSocket c : clients.values()) {
                if (c.isOpen()) c.send(joinMsg);
            }
        } catch (Exception e) {
            Log.w(TAG, "onOpen", e);
        }
        clients.put(id, conn);
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        Integer from = conn.getAttachment();
        if (from == null) return;
        try {
            JSONObject o = new JSONObject(message);
            o.put("from", from);
            String out = o.toString();
            if (o.has("to")) {
                WebSocket dest = clients.get(o.optInt("to"));
                if (dest != null && dest.isOpen()) dest.send(out);
                return;
            }
            boolean all = o.optBoolean("all", false);
            for (WebSocket c : clients.values()) {
                if ((all || c != conn) && c.isOpen()) c.send(out);
            }
        } catch (Exception e) {
            Log.w(TAG, "bad message", e);
        }
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        Integer id = conn.getAttachment();
        if (id == null) return;
        clients.remove(id);
        if (id == hostId) hostId = 0;
        try {
            JSONObject l = new JSONObject();
            l.put("t", "leave");
            l.put("id", id);
            String msg = l.toString();
            for (WebSocket c : clients.values()) {
                if (c.isOpen()) c.send(msg);
            }
        } catch (Exception e) {
            Log.w(TAG, "onClose", e);
        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        Log.w(TAG, "socket error", ex);
    }
}

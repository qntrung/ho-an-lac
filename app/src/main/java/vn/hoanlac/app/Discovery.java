package vn.hoanlac.app;

import android.util.Log;

import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;

/** Lắng nghe tín hiệu UDP của các hồ đang mở trong cùng Wi-Fi. */
public class Discovery extends Thread {

    public interface Listener {
        void onFound(String json);
    }

    private static final String TAG = "HoAnLac";
    private final int port;
    private final Listener listener;
    private volatile boolean running = true;
    private DatagramSocket socket;

    public Discovery(int port, Listener listener) {
        super("lake-discovery");
        this.port = port;
        this.listener = listener;
        setDaemon(true);
    }

    @Override
    public void run() {
        try {
            socket = new DatagramSocket(null);
            socket.setReuseAddress(true);
            socket.setBroadcast(true);
            socket.bind(new InetSocketAddress(port));
            socket.setSoTimeout(1000);
            byte[] buf = new byte[2048];
            while (running) {
                DatagramPacket p = new DatagramPacket(buf, buf.length);
                try {
                    socket.receive(p);
                } catch (SocketTimeoutException t) {
                    continue;
                }
                String text = new String(p.getData(), 0, p.getLength(), StandardCharsets.UTF_8);
                try {
                    JSONObject o = new JSONObject(text);
                    if (!"hoanlac".equals(o.optString("app"))) continue;
                    // địa chỉ thật của máy gửi đáng tin hơn địa chỉ ghi trong gói tin
                    o.put("ip", p.getAddress().getHostAddress());
                    listener.onFound(o.toString());
                } catch (Exception bad) {
                    // bỏ qua gói tin không phải của app
                }
            }
        } catch (Exception e) {
            if (running) Log.w(TAG, "discovery", e);
        } finally {
            if (socket != null) socket.close();
        }
    }

    public void shutdown() {
        running = false;
        if (socket != null) socket.close();
    }
}

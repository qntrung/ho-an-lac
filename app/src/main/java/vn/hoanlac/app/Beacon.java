package vn.hoanlac.app;

import android.util.Log;

import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;

/** Máy chủ hồ phát tín hiệu UDP mỗi giây để người cùng Wi-Fi tìm thấy hồ. */
public class Beacon extends Thread {

    private static final String TAG = "HoAnLac";
    private final String lakeName;
    private final int wsPort;
    private final int discPort;
    private volatile boolean running = true;
    private DatagramSocket socket;

    public Beacon(String lakeName, int wsPort, int discPort) {
        super("lake-beacon");
        this.lakeName = lakeName == null ? "Hồ An Lạc" : lakeName;
        this.wsPort = wsPort;
        this.discPort = discPort;
        setDaemon(true);
    }

    @Override
    public void run() {
        try {
            socket = new DatagramSocket();
            socket.setBroadcast(true);
            while (running) {
                JSONObject o = new JSONObject();
                o.put("app", "hoanlac");
                o.put("name", lakeName);
                o.put("port", wsPort);
                String ip = NetUtil.localIpv4();
                if (ip != null) o.put("ip", ip);
                byte[] data = o.toString().getBytes(StandardCharsets.UTF_8);
                for (InetAddress addr : NetUtil.broadcastAddresses()) {
                    try {
                        socket.send(new DatagramPacket(data, data.length, addr, discPort));
                    } catch (Exception e) {
                        // mạng có thể không cho phát tới địa chỉ này, thử địa chỉ tiếp theo
                    }
                }
                Thread.sleep(1000);
            }
        } catch (InterruptedException ignored) {
            // dừng phát
        } catch (Exception e) {
            Log.w(TAG, "beacon", e);
        } finally {
            if (socket != null) socket.close();
        }
    }

    public void shutdown() {
        running = false;
        interrupt();
        if (socket != null) socket.close();
    }
}

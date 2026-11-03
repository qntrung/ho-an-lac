package vn.hoanlac.app;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InterfaceAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Tiện ích lấy địa chỉ IP trong mạng nội bộ và các địa chỉ phát (broadcast). */
public final class NetUtil {

    private NetUtil() {
    }

    public static String localIpv4() {
        try {
            String fallback = null;
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (!(a instanceof Inet4Address) || a.isLoopbackAddress()) continue;
                    String name = ni.getName() == null ? "" : ni.getName();
                    // ưu tiên Wi-Fi (wlan) hoặc điểm phát (ap/swlan)
                    if (name.startsWith("wlan") || name.startsWith("ap") || name.startsWith("swlan")) {
                        return a.getHostAddress();
                    }
                    if (a.isSiteLocalAddress() && fallback == null) fallback = a.getHostAddress();
                }
            }
            return fallback;
        } catch (Exception e) {
            return null;
        }
    }

    public static List<InetAddress> broadcastAddresses() {
        List<InetAddress> out = new ArrayList<>();
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InterfaceAddress ia : ni.getInterfaceAddresses()) {
                    InetAddress b = ia.getBroadcast();
                    if (b != null && !out.contains(b)) out.add(b);
                }
            }
        } catch (Exception ignored) {
            // dùng địa chỉ phát chung bên dưới
        }
        try {
            InetAddress all = InetAddress.getByName("255.255.255.255");
            if (!out.contains(all)) out.add(all);
        } catch (Exception ignored) {
            // không có địa chỉ phát chung
        }
        return out;
    }
}

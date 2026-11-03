# Hồ An Lạc

App Android phóng sinh cá online: đi dạo quanh một dòng sông vòng tròn, thả cá, chắp tay, cúi chào, niệm Phật, tùy hỷ và nhặt rác cùng bạn bè **trong cùng một mạng Wi-Fi**. Không có người chơi giả: ai đang ở hồ là người thật.

Đây là bản thử đầu tiên, dùng cho bạn bè chơi thử.

## Tải file APK

Mỗi lần có mã mới đẩy lên nhánh `main`, GitHub tự build:

- **Cách dễ nhất (trên điện thoại):** mở trang **Releases** của repo, chọn bản mới nhất, tải file `HoAnLac-build….apk` rồi mở để cài. Android sẽ hỏi cho phép cài app từ nguồn này, hãy đồng ý.
- **Hoặc:** tab **Actions** › lần build mới nhất › mục **Artifacts** › `HoAnLac-apk` (file nén zip, giải nén ra file .apk).

Yêu cầu Android 7.0 trở lên.

## Chơi cùng nhau

1. Mọi người kết nối **cùng một Wi-Fi**.
2. Một người bấm **Mở hồ**. Máy này làm chủ hồ: chạy server socket và phát tín hiệu cho các máy khác.
3. Những người còn lại thấy **"Hồ của …"** trong mục *Hồ quanh đây*, bấm **Vào**.
4. Nếu danh sách trống, nhập địa chỉ IP hiện cạnh tên hồ trên máy chủ hồ (ví dụ `192.168.1.5`) rồi bấm **Vào**.

Trong hồ:

- Giữ hai nút mũi tên để đi dạo quanh hồ.
- **Thả cá**: nhân vật bước ra mép nước, quỳ một gối, hạ hai tay xuống mặt nước rồi mở tay cho cá bơi đi, sau đó chắp tay; máy quay hạ thấp nhìn ngang. Mỗi ngày 5 lượt, hết lượt thì đổi 100 phước lấy 1 lượt. Khoảng 1/4 số lần cá quay lại lượn vòng tạ ơn, bấm **A Di Đà Phật** để tiễn cá.
- Khi người khác thả cá trong tầm nhìn, ba nút **Chắp tay / Cúi chào / A Di Đà Phật** sáng lên. Bấm để tùy hỷ: cả hai cùng được +2 phước. Người ở khuất có mũi tên chỉ hướng.
- **Nhặt rác**: đi lại gần rồi chạm vào rác trên bờ. Đầy túi 8 món được +5 phước. Rác do chủ hồ quản lý, ai nhặt trước thì được.
- Phước, túi rác, tên và trang phục được lưu trên từng máy.

Thanh menu dưới cùng có 4 mục:

- **Hồ**: cảnh 3D chơi chung.
- **Tích phước**: số phước, đổi 100 phước lấy 1 lượt thả; các hoạt động *Thắp hương* (kéo nén hương chạm ngọn nến rồi cắm vào bát hương, +20 phước mỗi ngày, tính chuỗi ngày), *Gõ mõ* (ngồi xếp bằng trong chánh điện 3D, gõ theo câu “Nam Mô A Di Đà Phật. Nam Mô Đại Từ Đại Bi Quán Thế Âm Bồ Tát”, 17 tiếng, +15, đúng nhịp từ 13 tiếng +5), *Thiền* (ngồi xếp bằng chắp tay trên tảng đá bên hồ lúc đêm, 3/5/10 phút, chạm màn hình là ngắt; có nút tua nhanh cho bản thử). *Nhặt rác* và *Tùy hỷ* dẫn ra hồ.
- **Trang phục**: áo, phụ kiện (chuỗi hạt, nón lá, quạt giấy, đèn lồng, hoa sen), kiểu tóc; xem thử trên nhân vật 3D, mở khóa bằng phước hoặc thành tích. Trang phục hiện trên nhân vật ở hồ và người khác cũng thấy.
- **Bộ sưu tập cá**: 9 loài cá, số lần đã thả và cá quay lại tạ ơn; chọn loài để thả (màu cá ở hồ đổi theo). Bản thử mở sẵn mọi loài.

### Không thấy nhau?

- Kiểm tra cùng một Wi-Fi (không phải một máy Wi-Fi, một máy 4G).
- Wi-Fi công cộng, Wi-Fi khách, một số router bật "cách ly thiết bị" sẽ chặn các máy thấy nhau. Khi đó **chủ hồ bật điểm phát Wi-Fi (hotspot)** trên điện thoại, những người khác kết nối vào điểm phát đó.
- Chủ hồ cần giữ app mở; nếu chủ hồ thoát, hồ đóng và mọi người quay về sảnh.

## Cấu trúc

```
app/src/main/java/vn/hoanlac/app/
  MainActivity.java   WebView chạy cảnh 3D
  Bridge.java         cầu nối JS ⇄ Android (window.Android): mở hồ, tìm hồ
  LakeServer.java     server WebSocket (cổng 8787) trên máy chủ hồ, chỉ chuyển tiếp tin nhắn
  Beacon.java         phát tín hiệu UDP (cổng 41234) mỗi giây
  Discovery.java      nghe tín hiệu UDP để liệt kê hồ quanh đây
  NetUtil.java        lấy IP nội bộ, địa chỉ broadcast
app/src/main/assets/www/
  index.html          sảnh + giao diện trong hồ
  game.js             cảnh 3D (Three.js r128), nhân vật có khớp, trang phục 3D, mạng
  screens.js          Tích phước (thắp hương, gõ mõ, thiền), Trang phục, Bộ sưu tập cá
  art.js              hình vẽ đã duyệt: 9 loài cá, biểu tượng kiểu tóc
  three.min.js        Three.js đóng gói sẵn, không cần Internet
server/server.js      server thử trên máy tính, giống hệt LakeServer
.github/workflows/build-apk.yml   build APK trên GitHub
```

### Giao thức (JSON qua WebSocket)

Server chỉ chuyển tiếp: thêm trường `from` (id người gửi); có `to` thì gửi riêng, có `all: true` thì gửi cả cho người gửi, còn lại gửi cho mọi người khác.

| Tin | Ai gửi | Nội dung |
|---|---|---|
| `welcome` | server | `id`, `host` (máy này là chủ hồ?), `hostId`, `ids` |
| `join` / `leave` | server | `id` người vào / ra |
| `hello` | người chơi | `name`, `robe`, `a` (góc trên lối đi) |
| `st` | người chơi, 10 lần/giây | `a` góc, `v` tốc độ, `d` hướng đi |
| `act` | người chơi | `n`: `throw` = thả cá (kèm `back`, `fk`), `pray`, `bow`, `niem`, `pick` |
| `tuyhy` | người tùy hỷ | gửi riêng `to` người thả cá |
| `trash` / `tnew` / `gone` | chủ hồ | danh sách rác, rác mới, rác đã có người nhặt (`by`) |
| `pick` | người chơi | xin nhặt rác `i`, gửi riêng cho chủ hồ |

## Thử trên máy tính

```bash
cd server && npm install && npm start
```

Mở `app/src/main/assets/www/index.html` bằng Chrome ở hai tab, nhập `localhost:8787` rồi **Vào**. Tab vào đầu tiên làm chủ hồ.

## Build trên máy của bạn

Cần Android Studio (hoặc JDK 17 + Android SDK + Gradle 8.7): mở thư mục này bằng Android Studio rồi chọn *Build › Build APK(s)*, hoặc chạy `gradle assembleDebug`. File ra ở `app/build/outputs/apk/debug/app-debug.apk`.

## Việc tiếp theo

- Thêm hoạt cảnh hóa thân (hoa sen, đèn hoa đăng, hạc trắng, hóa rồng).

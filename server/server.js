// Server thử trên máy tính: chạy y hệt server trong app Android (LakeServer.java).
// Dùng để thử app trên trình duyệt: node server.js rồi mở app/src/main/assets/www/index.html
// và vào hồ bằng địa chỉ localhost:8787 (hoặc IP máy tính nếu vào từ máy khác).
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8787);
const wss = new WebSocketServer({ port: PORT });
const clients = new Map(); // id -> socket
let nextId = 1;
let hostId = 0;

function sendAll(msg, except) {
  for (const [, c] of clients) if (c !== except && c.readyState === 1) c.send(msg);
}

wss.on('connection', (ws) => {
  const id = nextId++;
  ws.id = id;
  // Trên Android, chủ hồ là máy chạy server; ở đây người vào đầu tiên làm chủ hồ.
  const isHost = hostId === 0;
  if (isHost) hostId = id;
  ws.send(JSON.stringify({ t: 'welcome', id, host: isHost, hostId, ids: [...clients.keys()] }));
  sendAll(JSON.stringify({ t: 'join', id }));
  clients.set(id, ws);
  console.log(`+ ${id}${isHost ? ' (chủ hồ)' : ''} · ${clients.size} người`);

  ws.on('message', (data) => {
    let o;
    try { o = JSON.parse(data.toString()); } catch { return; }
    o.from = id;
    const out = JSON.stringify(o);
    if (o.to !== undefined) {
      const d = clients.get(o.to);
      if (d && d.readyState === 1) d.send(out);
      return;
    }
    for (const [, c] of clients) if ((o.all || c !== ws) && c.readyState === 1) c.send(out);
  });

  ws.on('close', () => {
    clients.delete(id);
    if (id === hostId) hostId = 0;
    sendAll(JSON.stringify({ t: 'leave', id }));
    console.log(`- ${id} · ${clients.size} người`);
  });
});

console.log(`Hồ An Lạc: server thử đang chạy ở cổng ${PORT}`);

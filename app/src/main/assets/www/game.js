/* Hồ An Lạc — cảnh 3D nhiều người chơi trong cùng Wi-Fi.
 * Máy chủ hồ chạy server socket (Android, LakeServer.java) chỉ để chuyển tiếp tin nhắn;
 * luật chơi chung (rác trên bờ) do máy chủ hồ quyết định ở file này. */
(function () {
'use strict';
var T = window.THREE;
var A = window.Android || null;          // cầu nối Android; không có khi chạy thử trên trình duyệt
var $ = function (id) { return document.getElementById(id); };
// chiều cao thanh trạng thái đè lên trang (nếu có), để đầu trang không bị che
function readInset() {
  var top = 0; try { if (A && A.insetTop) top = +A.insetTop() || 0; } catch (e) { /* bỏ qua */ }
  document.documentElement.style.setProperty('--sat', 'max(env(safe-area-inset-top, 0px), ' + top + 'px)');
}
readInset(); setTimeout(readInset, 800); addEventListener('resize', readInset);

/* ===================== Lưu trên máy ===================== */
var store = {
  get: function (k, d) { try { var v = localStorage.getItem('hal_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem('hal_' + k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }
};
var ROBES = [
  { k: 'lam', name: 'Áo lam', robe: '#7F95A3', robeD: '#687E8C' },
  { k: 'nau', name: 'Áo tràng nâu', robe: '#8A6248', robeD: '#74503A' },
  { k: 'trang', name: 'Áo dài trắng', robe: '#F7F4EE', robeD: '#E2DCD0' },
  { k: 'hong', name: 'Áo dài hồng', robe: '#F4B6C8', robeD: '#E295AD', cost: 300 },
  { k: 'ngoc', name: 'Áo dài lam ngọc', robe: '#6FB8BC', robeD: '#4F9A9E', cost: 500 },
  { k: 'vang', name: 'Áo tràng vàng', robe: '#E8B04A', robeD: '#C98A3A', need: 'Thắp hương 30 ngày', needKey: 'streak30' }
];
var HAIRS = [
  { k: 'bui', name: 'Búi tó' },
  { k: 'ngan', name: 'Tóc ngắn' },
  { k: 'dai', name: 'Tóc dài', cost: 100 },
  { k: 'bim', name: 'Tóc bím', cost: 150 },
  { k: 'cuhanh', name: 'Búi củ hành', need: 'Tùy hỷ 100 lần', needKey: 'tuyhy100' }
];
var ACCS = [
  { k: 'beads', name: 'Chuỗi hạt', slot: 'beads' },
  { k: 'hat', name: 'Nón lá', slot: 'hat' },
  { k: 'fan', name: 'Quạt giấy', slot: 'hand', cost: 150 },
  { k: 'lantern', name: 'Đèn lồng', slot: 'hand', cost: 200 },
  { k: 'lotus', name: 'Hoa sen cầm tay', slot: 'hand', need: 'Thả 50 con cá', needKey: 'rel50' }
];
var FISH = [
  { k: 'chepdo', name: 'Cá chép đỏ', rar: 1, meaning: 'Đỗ đạt, công danh thăng tiến', body: '#E4572E', belly: '#FFC08A', fin: '#F07A4A' },
  { k: 'chepvang', name: 'Cá chép vàng', rar: 1, meaning: 'Tài lộc, sung túc', body: '#E8A93A', belly: '#FFE6A8', fin: '#F2C14E' },
  { k: 'cavang', name: 'Cá vàng', rar: 1, meaning: 'May mắn, an vui', body: '#F28A3A', belly: '#FFD2A0', fin: '#F6A564' },
  { k: 'ro', name: 'Cá rô đồng', rar: 1, meaning: 'Bền bỉ, chịu thương chịu khó', body: '#6E7F5A', belly: '#C9C79A', fin: '#5A6A48' },
  { k: 'tre', name: 'Cá trê', rar: 1, meaning: 'Vững vàng qua sóng gió', body: '#4A4440', belly: '#8A7F74', fin: '#3A3430', whisk: true },
  { k: 'dieuhong', name: 'Cá diêu hồng', rar: 1, meaning: 'Gia đình hòa thuận', body: '#E98A90', belly: '#FFD6D6', fin: '#F2A4A8' },
  { k: 'kohaku', name: 'Cá koi Kohaku', rar: 2, meaning: 'Bình an, hạnh phúc', body: '#FFF6EE', belly: '#FFFFFF', fin: '#F2E4D8', spot: '#E4572E' },
  { k: 'showa', name: 'Cá koi Showa', rar: 2, meaning: 'Kiên định, vượt khó', body: '#2E2A28', belly: '#F2EAE0', fin: '#3A3430', spot: '#E4572E', need: 'Tích 2.000 phước', needKey: 'phuoc2000' },
  { k: 'carong', name: 'Cá rồng', rar: 3, meaning: 'Uy quyền, thịnh vượng', body: '#D9A02A', belly: '#FFE48A', fin: '#C98A12', need: 'Thả 100 con cá', needKey: 'rel100' }
];
// Bản thử cho bạn bè: mở sẵn mọi loài cá
var UNLOCK_ALL_FISH = true;
function fishOf(k) { for (var i = 0; i < FISH.length; i++) if (FISH[i].k === k) return FISH[i]; return FISH[0]; }
function robeOf(k) { for (var i = 0; i < ROBES.length; i++) if (ROBES[i].k === k) return ROBES[i]; return ROBES[0]; }
function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

var S = {
  phuoc: store.get('phuoc', 1250),
  turns: 5, bag: store.get('bag', 0),
  name: store.get('name', 'Tịnh Tâm'), robe: store.get('robe', 'lam'),
  owned: store.get('owned', { lam: 1, nau: 1, trang: 1, beads: 1, hat: 1, bui: 1, ngan: 1 }),
  look: store.get('look', null),
  fishK: store.get('fishK', 'chepdo'),
  stats: store.get('stats', {}),
  prog: store.get('prog', { rel: 0, tuyhy: 0, streak: 0, lastIncense: '', earned: 0 }),
  ev: null, fish: [], returning: null, inLake: false, hosting: false, nextEv: 0
};
(function loadTurns() { var t = store.get('turns', null); S.turns = (t && t.d === today()) ? t.n : 5; })();
function saveTurns() { store.set('turns', { d: today(), n: S.turns }); }
if (!S.look) S.look = { robe: S.robe, hair: 'bui', hat: false, beads: true, hand: 'none' };
S.look.robe = S.look.robe || S.robe;
function saveLook() { S.robe = S.look.robe; store.set('robe', S.robe); store.set('look', S.look); }
function saveProg() { store.set('prog', S.prog); }
function needMet(key) {
  var g = S.prog;
  return { streak30: g.streak >= 30, tuyhy100: g.tuyhy >= 100, rel50: g.rel >= 50, rel100: g.rel >= 100, phuoc2000: g.earned >= 2000 }[key] || false;
}
function lookKey(l) { return [l.robe, l.hair, l.hat ? 1 : 0, l.beads ? 1 : 0, l.hand].join('|'); }

/* ===================== Renderer & cảnh ===================== */
var canvas = $('stage');
var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
var scene = new T.Scene();
(function sky() {
  var c = document.createElement('canvas'); c.width = 2; c.height = 256;
  var x = c.getContext('2d'); var g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#9FCFDB'); g.addColorStop(0.55, '#F1E6D6'); g.addColorStop(0.8, '#FBDDBA'); g.addColorStop(1, '#F6D3AE');
  x.fillStyle = g; x.fillRect(0, 0, 2, 256);
  scene.background = new T.CanvasTexture(c);
})();
scene.fog = new T.Fog(0xF3DCC0, 55, 150);
var camera = new T.PerspectiveCamera(50, 1, 0.1, 400);
scene.add(new T.HemisphereLight(0xFFE9CF, 0x5E7F52, 0.75));
var sun = new T.DirectionalLight(0xFFD7A6, 1.05);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
(function (sc) { sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 160; })(sun.shadow.camera);
sun.shadow.bias = -0.0008;
scene.add(sun); scene.add(sun.target);

function M(c, o) { return new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0 }, o || {})); }
function mesh(geo, mat, cast) { var m = new T.Mesh(geo, mat); m.castShadow = cast !== false; m.receiveShadow = true; return m; }
function cyl(rt, rb, h, s) { return new T.CylinderGeometry(rt, rb, h, s || 14); }
function sph(r, w, h) { return new T.SphereGeometry(r, w || 18, h || 14); }

var WATER = M('#5FAAB0', { roughness: 0.16, metalness: 0.2, transparent: true, opacity: 0.9 });
var PAG_LAMPS = [];
var R_IN = 12.8, R_OUT = 24, R_WALK = 26.6, WATER_Y = -0.07;
(function buildWorld() {
  // mặt nước thấp hơn bờ một chút: bãi cỏ là vành khuyên, có bờ đất và lòng hồ bên dưới
  var ground = mesh(new T.RingGeometry(R_OUT + 1.2, 160, 160, 1), M('#93C27A'), false); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  var sand = mesh(new T.RingGeometry(R_OUT, R_OUT + 1.3, 160), M('#E3CC9A'), false); sand.rotation.x = -Math.PI / 2; sand.position.y = 0.02; scene.add(sand);
  var path = mesh(new T.RingGeometry(R_WALK - 0.9, R_WALK + 0.9, 160), M('#DCC79F'), false); path.rotation.x = -Math.PI / 2; path.position.y = 0.025; scene.add(path);
  var bed = mesh(new T.RingGeometry(R_IN, R_OUT, 160, 4), M('#3F7F86'), false); bed.rotation.x = -Math.PI / 2; bed.position.y = -0.9; scene.add(bed);
  var bank = mesh(new T.CylinderGeometry(R_OUT, R_OUT, 0.95, 160, 1, true), M('#B39A6A'), false); bank.material.side = T.BackSide; bank.position.y = -0.46; scene.add(bank);
  var water = mesh(new T.RingGeometry(R_IN, R_OUT, 160, 4), WATER, false); water.rotation.x = -Math.PI / 2; water.position.y = WATER_Y; scene.add(water);
  var island = mesh(cyl(R_IN + 0.1, R_IN + 0.6, 1.3, 64), M('#A9D292'), false); island.position.y = -0.2; scene.add(island);
  var isl2 = mesh(new T.RingGeometry(R_IN - 0.6, R_IN + 0.1, 96), M('#E3CC9A'), false); isl2.rotation.x = -Math.PI / 2; isl2.position.y = 0.46; scene.add(isl2);

  var red = M('#9B3B2A'), redD = M('#7A2A1C'), cream = M('#F3E7CF'), stone = M('#CDBFA2'), gold = M('#E3A62E', { metalness: 0.4, roughness: 0.4 });
  var pag = new T.Group(); pag.position.y = 0.45; scene.add(pag);
  var base = mesh(new T.BoxGeometry(8, 0.6, 8), stone); base.position.y = 0.3; pag.add(base);
  var walls = mesh(new T.BoxGeometry(5, 2.4, 5), cream); walls.position.y = 1.8; pag.add(walls);
  [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]].forEach(function (p) { var c = mesh(cyl(0.18, 0.18, 2.5), red); c.position.set(p[0], 1.85, p[1]); pag.add(c); });
  function roof(w, h, y) {
    var r = mesh(new T.ConeGeometry(w, h, 4, 1), red); r.rotation.y = Math.PI / 4; r.position.y = y; pag.add(r);
    var e = w * 0.72;
    [[e, e], [-e, e], [e, -e], [-e, -e]].forEach(function (p) {
      var tip = mesh(new T.ConeGeometry(0.16, 0.7, 6), redD); tip.position.set(p[0], y - h / 2 + 0.25, p[1]);
      tip.rotation.z = (p[0] > 0 ? -1 : 1) * 0.6; tip.rotation.x = (p[1] > 0 ? 1 : -1) * 0.6; pag.add(tip);
    });
  }
  roof(5.4, 1.7, 3.8);
  var w2 = mesh(new T.BoxGeometry(3, 1.4, 3), cream); w2.position.y = 5.1; pag.add(w2);
  roof(3.4, 1.3, 6.3);
  var fin = mesh(sph(0.3), gold); fin.position.y = 7.15; pag.add(fin);
  [[0, 2.53, 0], [0, -2.53, Math.PI], [2.53, 0, Math.PI / 2], [-2.53, 0, -Math.PI / 2]].forEach(function (d) {
    var door = mesh(new T.BoxGeometry(1.2, 1.7, 0.1), M('#6E2E20', { emissive: 0xE9A24A, emissiveIntensity: 0.25 }));
    door.position.set(d[0], 1.45, d[1]); door.rotation.y = d[2]; pag.add(door);
  });
  [[2.9, 2.9], [-2.9, 2.9], [2.9, -2.9], [-2.9, -2.9]].forEach(function (p) {
    var lm = M('#E8642F', { emissive: 0xFF8A3A, emissiveIntensity: 0.9 }); var l = mesh(sph(0.32, 14, 10), lm, false); l.scale.y = 1.25; l.position.set(p[0], 2.6, p[1]); pag.add(l); PAG_LAMPS.push(lm);
  });

  var leafMats = [M('#7FAE7C'), M('#86B484'), M('#6FA36C'), M('#93BF86')], trunkM = M('#6E5A48');
  function tree(x, z, s) {
    var g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    var t = mesh(cyl(0.18, 0.26, 2), trunkM); t.position.y = 1; g.add(t);
    for (var i = 0; i < 3; i++) { var f = mesh(sph(1 - i * 0.18, 12, 10), leafMats[(i + Math.floor(Math.abs(x))) & 3]); f.position.set((i - 1) * 0.35, 2.2 + i * 0.6, (i % 2) * 0.3); g.add(f); }
    scene.add(g);
  }
  var i, a;
  for (i = 0; i < 9; i++) { a = i / 9 * Math.PI * 2 + 0.3; tree(Math.cos(a) * 8.8, Math.sin(a) * 8.8, 1.1 + (i % 3) * 0.2); }
  // cây vòng ngoài trồng xa lối đi để không che tầm nhìn
  for (i = 0; i < 40; i++) { a = i / 40 * Math.PI * 2 + (i % 3) * 0.05; var rr = 36 + (i % 4) * 4; tree(Math.cos(a) * rr, Math.sin(a) * rr, 1.1 + (i % 5) * 0.2); }
  var hm = [M('#B8CFC6'), M('#C9DAD2')];
  for (i = 0; i < 14; i++) { a = i / 14 * Math.PI * 2; var hill = mesh(new T.ConeGeometry(18 + (i % 3) * 6, 14 + (i % 4) * 4, 8), hm[i % 2], false); hill.position.set(Math.cos(a) * 95, 4, Math.sin(a) * 95); scene.add(hill); }
  var padM = M('#6FA864'), pinkM = M('#F4B6C8', { roughness: 0.6 });
  for (i = 0; i < 34; i++) {
    a = i * 2.399; var rp = R_IN + 1.5 + ((i * 37) % 90) / 90 * (R_OUT - R_IN - 3);
    var pad = mesh(cyl(0.6, 0.6, 0.04, 16), padM, false); pad.position.set(Math.cos(a) * rp, -0.05, Math.sin(a) * rp); scene.add(pad);
    if (i % 3 === 0) {
      var fl = new T.Group(); fl.position.copy(pad.position); fl.position.y = -0.01;
      for (var k = 0; k < 6; k++) { var pt = mesh(new T.ConeGeometry(0.1, 0.4, 6), pinkM, false); pt.position.set(Math.cos(k) * 0.1, 0.18, Math.sin(k) * 0.1); pt.rotation.z = Math.cos(k) * 0.5; pt.rotation.x = Math.sin(k) * 0.5; fl.add(pt); }
      scene.add(fl);
    }
  }
})();

/* ===================== Nhân vật chibi có khớp ===================== */
// Dựng theo bản duyệt 3D: bàn tay 5 ngón, tay áo loe, mặt bám mặt cầu của đầu, tóc có mái riêng,
// cổ chân xoay được (ngồi xếp bằng), vạt áo phủ đùi khi ngồi.
var skinM = M('#F5D2B0'), hairM = M('#3A2E2A', { roughness: 0.55 }), pantsM = M('#EFE9DC'), shoeM = M('#4A3F3A'), eyeM = M('#1E1410'), whiteM = M('#FFFFFF');
var blushM = new T.MeshBasicMaterial({ color: 0xF4A6B8, transparent: true, opacity: 0.7 }), mouthM = M('#B5605A'), noseM = M('#EFC6A2');
var hatM = M('#E9D7A6'), hatD = M('#D6C08A'), beadM = M('#6E3A1E', { roughness: 0.5 }), ribbonM = M('#C9567A');
var fanM = new T.MeshStandardMaterial({ color: '#E36A3B', roughness: 0.7, side: T.DoubleSide }), fanM2 = new T.MeshStandardMaterial({ color: '#CF5530', roughness: 0.7, side: T.DoubleSide });
var fanEdge = M('#F2C14E'), stickM = M('#8A5A2B');
function gradTex(stops) {
  var c = document.createElement('canvas'); c.width = 2; c.height = 256; var x = c.getContext('2d'); var g = x.createLinearGradient(0, 0, 0, 256);
  stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); x.fillStyle = g; x.fillRect(0, 0, 2, 256); return new T.CanvasTexture(c);
}
function glowTex(col) {
  var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d');
  var g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c);
}
function hairPart(head, pS, pL, tS, tL, r) { var m = mesh(new T.SphereGeometry(r || 0.565, 28, 12, pS, pL, tS, tL), hairM); head.add(m); return m; }
var FRONT = Math.PI * 0.5;            // trên SphereGeometry, phi = π/2 hướng ra +z (phía mặt)
function buildHair(head, k, hat) {
  var topEnd = k === 'cuhanh' ? 0.34 : 0.4;
  hairPart(head, 0, Math.PI * 2, 0, Math.PI * topEnd, 0.56);
  hairPart(head, FRONT + Math.PI * 0.45, Math.PI * 1.1, 0, Math.PI * 0.74, 0.565);   // nửa sau
  if (k === 'bui') {
    hairPart(head, FRONT - 1.25, 1.55, Math.PI * 0.3, Math.PI * 0.21);
    hairPart(head, FRONT + 0.3, 0.95, Math.PI * 0.3, Math.PI * 0.13);
    if (!hat) { var b = mesh(sph(0.21), hairM); b.position.set(0, 0.42, -0.34); head.add(b); }
  } else if (k === 'ngan') {
    hairPart(head, FRONT - 0.95, 1.9, Math.PI * 0.3, Math.PI * 0.15);
    hairPart(head, FRONT - 1.9, 0.75, Math.PI * 0.3, Math.PI * 0.42, 0.58);
    hairPart(head, FRONT + 1.15, 0.75, Math.PI * 0.3, Math.PI * 0.42, 0.58);
  } else if (k === 'dai') {
    hairPart(head, FRONT - 1.35, 1.27, Math.PI * 0.3, Math.PI * 0.2);
    hairPart(head, FRONT + 0.08, 1.27, Math.PI * 0.3, Math.PI * 0.2);
    var lh = mesh(new T.BoxGeometry(0.95, 1.15, 0.16), hairM); lh.position.set(0, -0.55, -0.36); head.add(lh);
    hairPart(head, FRONT - 1.75, 0.5, Math.PI * 0.35, Math.PI * 0.4, 0.575);
    hairPart(head, FRONT + 1.25, 0.5, Math.PI * 0.35, Math.PI * 0.4, 0.575);
  } else if (k === 'bim') {
    hairPart(head, FRONT - 1.2, 1.15, Math.PI * 0.3, Math.PI * 0.16);
    hairPart(head, FRONT + 0.05, 1.15, Math.PI * 0.3, Math.PI * 0.16);
    [-1, 1].forEach(function (sd) {
      for (var i = 0; i < 4; i++) { var bb = mesh(sph(0.12 - i * 0.012, 10, 8), hairM); bb.position.set(0.44 * sd, -0.36 - i * 0.17, -0.14); head.add(bb); }
      var bow = mesh(new T.TorusGeometry(0.06, 0.025, 6, 12), ribbonM); bow.position.set(0.44 * sd, -1.0, -0.14); head.add(bow);
    });
  } else if (k === 'cuhanh') {
    if (!hat) {
      var t1 = mesh(sph(0.23), hairM); t1.position.set(0, 0.62, -0.06); head.add(t1);
      var t2 = mesh(sph(0.11), hairM); t2.position.set(0, 0.85, -0.06); head.add(t2);
      var band = mesh(new T.TorusGeometry(0.16, 0.035, 8, 20), ribbonM); band.rotation.x = Math.PI / 2; band.position.set(0, 0.48, -0.06); head.add(band);
    }
  }
}
// Bàn tay 5 ngón. Hệ toạ độ cổ tay: ngón chỉ theo -y, mu bàn tay hướng ra ngoài (+x với tay trái), ngón cái phía trước (+z).
function buildHand(wrist, sd) {
  var g = new T.Group(); wrist.add(g);
  var palm = mesh(sph(0.07, 14, 12), skinM); palm.scale.set(0.5, 0.95, 0.9); palm.position.y = -0.055; g.add(palm);
  var fingers = [], Z = [0.042, 0.014, -0.014, -0.04], LEN = [0.07, 0.078, 0.074, 0.06];
  for (var i = 0; i < 4; i++) {
    var f = new T.Group(); f.position.set(0, -0.112, Z[i]); g.add(f);
    var l1 = LEN[i] * 0.55, l2 = LEN[i] * 0.45;
    var a = mesh(cyl(0.0165, 0.0155, l1, 8), skinM, false); a.position.y = -l1 / 2; f.add(a);
    f.add(mesh(sph(0.0165, 8, 6), skinM, false));
    var j2 = new T.Group(); j2.position.y = -l1; f.add(j2);
    j2.add(mesh(sph(0.0155, 8, 6), skinM, false));
    var b = mesh(cyl(0.0155, 0.0135, l2, 8), skinM, false); b.position.y = -l2 / 2; j2.add(b);
    var tip = mesh(sph(0.0135, 8, 6), skinM, false); tip.position.y = -l2; j2.add(tip);
    fingers.push({ f: f, j2: j2 });
  }
  var th = new T.Group(); th.position.set(-0.012 * sd, -0.035, 0.05); th.rotation.set(0.55, 0, -0.35 * sd); g.add(th);
  var t1 = mesh(cyl(0.019, 0.018, 0.045, 8), skinM, false); t1.position.y = -0.022; th.add(t1);
  th.add(mesh(sph(0.019, 8, 6), skinM, false));
  var tj = new T.Group(); tj.position.y = -0.045; th.add(tj);
  tj.add(mesh(sph(0.018, 8, 6), skinM, false));
  var t2 = mesh(cyl(0.018, 0.015, 0.04, 8), skinM, false); t2.position.y = -0.02; tj.add(t2);
  var tt = mesh(sph(0.015, 8, 6), skinM, false); tt.position.y = -0.04; tj.add(tt);
  return { g: g, fingers: fingers, th: th, tj: tj, sd: sd };
}
// curl: 0 duỗi thẳng, 1 nắm chặt
function setHand(H, curl, wx, wy, wz) {
  var s = -H.sd;
  H.fingers.forEach(function (f, i) { f.f.rotation.z = s * curl * (1.35 + i * 0.05); f.j2.rotation.z = s * curl * 1.45; f.f.rotation.x = (1.5 - i) * 0.04 * curl; });
  H.th.rotation.z = -0.35 * H.sd + s * curl * 0.5; H.tj.rotation.z = s * curl * 0.9;
  H.g.rotation.set(wx || 0, wy || 0, wz || 0);
}
function chibi(look) {
  look = look || {};
  var rb = robeOf(look.robe);
  var robe = M(rb.robe), robeD = M(rb.robeD);
  var root = new T.Group();
  var hips = new T.Group(); hips.position.y = 0.95; root.add(hips);
  function leg(sd) {
    var hip = new T.Group(); hip.position.set(0.16 * sd, 0, 0); hips.add(hip);
    var th = mesh(cyl(0.125, 0.11, 0.5), pantsM); th.position.y = -0.25; hip.add(th);
    hip.add(mesh(sph(0.13, 12, 10), pantsM));
    var knee = new T.Group(); knee.position.y = -0.5; hip.add(knee);
    knee.add(mesh(sph(0.11, 12, 10), pantsM));
    var sh = mesh(cyl(0.11, 0.1, 0.4), pantsM); sh.position.y = -0.2; knee.add(sh);
    var ank = new T.Group(); ank.position.y = -0.4; knee.add(ank);
    var ft = mesh(new T.BoxGeometry(0.19, 0.1, 0.3), shoeM); ft.position.set(0, -0.03, 0.07); ank.add(ft);
    return { hip: hip, knee: knee, ank: ank, ft: ft };
  }
  var L = leg(1), R = leg(-1);
  var skM = M(rb.robe); skM.side = T.DoubleSide;
  var skirt = mesh(new T.CylinderGeometry(0.3, 0.46, 0.55, 22, 1, true), skM); skirt.position.y = -0.2; hips.add(skirt);
  var lap = mesh(new T.SphereGeometry(0.5, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), skM); lap.scale.set(1.12, 0.32, 0.86); lap.position.set(0, -0.1, 0.14); lap.visible = false; hips.add(lap);
  var spine = new T.Group(); hips.add(spine);
  var waist = mesh(sph(0.32, 18, 12), robe); waist.scale.y = 0.62; spine.add(waist);
  var chestG = new T.Group(); spine.add(chestG);
  var chest = mesh(cyl(0.29, 0.33, 0.62, 18), robe); chest.position.y = 0.3; chestG.add(chest);
  var flap = mesh(new T.BoxGeometry(0.05, 0.6, 0.02), robeD); flap.position.set(0.08, 0.3, 0.31); flap.rotation.z = 0.15; chestG.add(flap);
  var neck = mesh(cyl(0.09, 0.1, 0.14), skinM); neck.position.y = 0.66; chestG.add(neck);
  var head = new T.Group(); head.position.y = 1.18; chestG.add(head);
  head.add(mesh(sph(0.52, 26, 20), skinM));
  var hair = look.hair || 'bui';
  buildHair(head, hair, look.hat);
  var HR = 0.52;
  function onFace(m, x, y, lift, spin) {
    var z = Math.sqrt(Math.max(0.001, HR * HR - x * x - y * y));
    var n = new T.Vector3(x, y, z).normalize();
    m.position.copy(n).multiplyScalar(HR + (lift || 0));
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), n);
    if (spin) m.rotateZ(spin);
    head.add(m); return m;
  }
  var eyes = [], lids = [];
  [-1, 1].forEach(function (sd) {
    var ear = mesh(sph(0.1, 10, 8), skinM); ear.position.set(0.5 * sd, -0.04, 0); head.add(ear);
    var eye = mesh(sph(0.075, 12, 10), eyeM, false); eye.scale.set(0.9, 1.25, 0.4); onFace(eye, 0.18 * sd, -0.06, -0.012);
    var gl = mesh(sph(0.024, 8, 6), whiteM, false); onFace(gl, 0.18 * sd + 0.022, -0.025, 0.014);
    var lid = mesh(new T.TorusGeometry(0.07, 0.014, 6, 12, Math.PI), eyeM, false); onFace(lid, 0.18 * sd, -0.08, 0.004, Math.PI); lid.visible = false;
    eyes.push(eye, gl); lids.push(lid);
    var brow = mesh(new T.BoxGeometry(0.13, 0.026, 0.014), hairM, false); onFace(brow, 0.18 * sd, 0.08, 0.002, -0.15 * sd);
    var bl = new T.Mesh(new T.CircleGeometry(0.072, 16), blushM); onFace(bl, 0.29 * sd, -0.17, 0.003);
  });
  onFace(mesh(sph(0.042, 10, 8), noseM, false), 0, -0.13, -0.012);
  onFace(mesh(new T.TorusGeometry(0.055, 0.015, 6, 14, Math.PI), mouthM, false), 0, -0.24, 0.0, Math.PI);
  if (look.hat) {
    var hat = mesh(new T.ConeGeometry(1.0, 0.55, 28, 1, true), hatM); hat.material.side = T.DoubleSide; hat.position.y = 0.62; head.add(hat);
    var rim = mesh(new T.TorusGeometry(0.99, 0.02, 6, 32), hatD); rim.rotation.x = Math.PI / 2; rim.position.y = 0.35; head.add(rim);
  }
  if (look.beads) {
    var ring = new T.Group(); ring.position.set(0, 0.57, 0.04); ring.rotation.x = 0.35; chestG.add(ring);
    for (var bi = 0; bi < 16; bi++) { var ba = bi / 16 * Math.PI * 2; var bd = mesh(sph(0.04, 8, 6), beadM, false); bd.position.set(Math.cos(ba) * 0.27, 0, Math.sin(ba) * 0.25); ring.add(bd); }
    var tas = mesh(new T.ConeGeometry(0.035, 0.12, 6), ribbonM, false); tas.position.set(0, -0.08, 0.27); tas.rotation.x = Math.PI; ring.add(tas);
  }
  function arm(sd) {
    var sh = new T.Group(); sh.position.set(0.36 * sd, 0.55, 0); chestG.add(sh);
    sh.add(mesh(sph(0.15, 12, 10), sd > 0 ? robe : robeD));
    var up = mesh(cyl(0.12, 0.15, 0.44), sd > 0 ? robe : robeD); up.position.y = -0.21; sh.add(up);
    var el = new T.Group(); el.position.y = -0.43; sh.add(el);
    el.add(mesh(sph(0.15, 12, 10), sd > 0 ? robe : robeD));
    var fa = mesh(cyl(0.13, 0.17, 0.3), sd > 0 ? robe : robeD); fa.position.y = -0.15; el.add(fa);
    var cuffM = (sd > 0 ? robe : robeD).clone(); cuffM.side = T.DoubleSide;
    var cuff = mesh(new T.CylinderGeometry(0.17, 0.215, 0.12, 18, 1, true), cuffM); cuff.position.y = -0.34; el.add(cuff);
    var wristJ = mesh(cyl(0.05, 0.055, 0.08, 10), skinM); wristJ.position.y = -0.36; el.add(wristJ);
    var hand = new T.Group(); hand.position.y = -0.4; el.add(hand);
    return { sh: sh, el: el, hand: hand, H: buildHand(hand, sd) };
  }
  var AL = arm(1), AR = arm(-1);
  var c = { root: root, hips: hips, spine: spine, chestG: chestG, head: head, L: L, R: R, AL: AL, AR: AR, skirt: skirt, lap: lap, eyes: eyes, lids: lids, look: look,
    lookKey: lookKey({ robe: rb.k, hair: hair, hat: !!look.hat, beads: !!look.beads, hand: look.hand || 'none' }),
    cur: {}, walkP: 0, speed: 0, dirSign: 1, act: null, actT: 0, angle: 0, edge: 0, item: null };
  buildItem(c, look.hand || 'none');
  return c;
}
chibi.keyOf = function (l) { return lookKey({ robe: robeOf(l.robe).k, hair: l.hair || 'bui', hat: !!l.hat, beads: !!l.beads, hand: l.hand || 'none' }); };

/* ---- vật cầm tay: dựng trong tư thế cầm rồi gắn vào bàn tay để đi theo khi bước ---- */
function itemArms(p, hand) {
  if (hand === 'fan') {   // tay phải cầm quạt: bắp tay sát sườn, cẳng tay vắt ngang trước bụng; tay trái buông
    p.rc = 0.95; p.rsx = -0.231; p.rsy = 0.666; p.rsz = -0.022; p.rel = -1.481; p.rwx = 0.08; p.rwy = -0.187; p.rwz = 0.76;
  }
  if (hand === 'lantern') { p.lc = 0.85; p.lsx = -0.65; p.lsy = 0; p.lsz = -0.05; p.lel = -0.75; p.lwx = 0; p.lwy = 0; p.lwz = 0; p.hd = 0.12; }
  if (hand === 'lotus') { p.lsx = -0.62; p.rsx = -0.62; p.lsy = 0; p.rsy = 0; p.lsz = -0.5; p.rsz = 0.5; p.lel = -1.2; p.rel = -1.2; p.hd = 0.1; p.lc = 0.35; p.rc = 0.35; p.lwx = 0; p.rwx = 0; p.lwy = 1.1; p.rwy = -1.1; p.lwz = 0; p.rwz = 0; }
  return p;
}
function buildItem(c, hand) {
  if (hand === 'none') return;
  var p = itemArms(base(), hand);
  setPose(c, p, null); c.root.updateMatrixWorld(true);
  var hL = new T.Vector3(), hR = new T.Vector3(); c.AL.hand.getWorldPosition(hL); c.AR.hand.getWorldPosition(hR);
  var g = new T.Group(); c.root.add(g);
  if (hand === 'fan') {
    // nắm đúng chuôi quạt trong tay phải; đinh chốt dưới ngón út, quạt xòe lên chếch về phía vai trái
    var fgo = new T.Group(); c.AR.H.g.add(fgo);
    fgo.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1), new T.Vector3(1, 0, 0)));
    fgo.position.set(0.03, -0.125, -0.07);
    var R0 = 0.18, R1 = 0.5, N = 13, A0 = 0.34, SPAN = 0.66;
    for (var i = 0; i < N - 1; i++) {
      var a0 = Math.PI * (A0 + i * SPAN / (N - 1)), a1 = Math.PI * (A0 + (i + 1) * SPAN / (N - 1));
      var wg = new T.Mesh(new T.RingGeometry(R0, R1, 4, 1, a0, a1 - a0), i % 2 ? fanM2 : fanM); wg.castShadow = true; fgo.add(wg);
    }
    for (var j = 0; j < N; j++) { var aj = Math.PI * (A0 + j * SPAN / (N - 1)), Lr = (j === 0 || j === N - 1) ? R1 : R0 + 0.02; var rbm = mesh(new T.BoxGeometry(0.018, Lr, 0.008), stickM, false); rbm.position.set(Math.cos(aj) * Lr / 2, Math.sin(aj) * Lr / 2, j * 0.0015 - 0.008); rbm.rotation.z = aj - Math.PI / 2; fgo.add(rbm); }
    var edge = mesh(new T.TorusGeometry(R1, 0.01, 6, 30, Math.PI * SPAN), fanEdge, false); edge.rotation.z = Math.PI * A0; fgo.add(edge);
    var pivot = mesh(cyl(0.016, 0.016, 0.04, 10), M('#C98A3A'), false); pivot.rotation.x = Math.PI / 2; fgo.add(pivot);
    c.item = fgo; c.root.remove(g); return;
  }
  if (hand === 'lantern') {
    // cán cầm tay trái chếch vào giữa và ra trước; đèn treo đầu cán, phía trước người như soi đường
    var tip = new T.Vector3(-0.05, hL.y + 0.32, hL.z + 0.62);
    var poleLen = hL.distanceTo(tip), pole = mesh(cyl(0.02, 0.02, poleLen, 6), stickM);
    pole.position.copy(hL).add(tip).multiplyScalar(0.5); pole.lookAt(tip); pole.rotateX(Math.PI / 2); g.add(pole);
    var cord = mesh(cyl(0.006, 0.006, 0.18, 4), M('#5E241A'), false); cord.position.set(tip.x, tip.y - 0.09, tip.z); g.add(cord);
    var lan = mesh(sph(0.17, 16, 12), M('#E8642F', { emissive: 0xFF8A3A, emissiveIntensity: 1.0 }), false); lan.scale.y = 1.25; lan.position.set(tip.x, tip.y - 0.36, tip.z); g.add(lan);
    var cap1 = mesh(cyl(0.08, 0.08, 0.04, 10), M('#9B3B2A'), false); cap1.position.set(tip.x, tip.y - 0.16, tip.z); g.add(cap1);
    var cap2 = cap1.clone(); cap2.position.y = tip.y - 0.57; g.add(cap2);
    var tass = mesh(cyl(0.01, 0.01, 0.14, 4), M('#E39B2E'), false); tass.position.set(tip.x, tip.y - 0.66, tip.z); g.add(tass);
    var gs = new T.Sprite(new T.SpriteMaterial({ map: glowTex('rgba(255,170,90,1)'), transparent: true, depthWrite: false })); gs.scale.setScalar(1.1); gs.position.copy(lan.position); g.add(gs);
    c.AL.H.g.attach(g); c.item = g; return;
  }
  if (hand === 'lotus') {
    var mid = hL.clone().add(hR).multiplyScalar(0.5);
    var lot = new T.Group(); lot.position.copy(mid).add(new T.Vector3(0, 0.1, 0.02)); g.add(lot);
    lot.add(mesh(cyl(0.24, 0.2, 0.04, 18), M('#6FA864'), false));
    for (var li = 0; li < 8; li++) { var la = li / 8 * Math.PI * 2; var pt = mesh(new T.ConeGeometry(0.075, 0.3, 6), M(li % 2 ? '#F4B6C8' : '#E68FAA', { roughness: 0.6 }), false); pt.position.set(Math.cos(la) * 0.09, 0.15, Math.sin(la) * 0.09); pt.rotation.z = -Math.cos(la) * 0.5; pt.rotation.x = Math.sin(la) * 0.5; lot.add(pt); }
    for (var lj = 0; lj < 5; lj++) { var lb = lj / 5 * Math.PI * 2 + 0.3; var p2 = mesh(new T.ConeGeometry(0.06, 0.26, 6), M('#F7C6D4'), false); p2.position.set(Math.cos(lb) * 0.04, 0.2, Math.sin(lb) * 0.04); p2.rotation.z = -Math.cos(lb) * 0.2; p2.rotation.x = Math.sin(lb) * 0.2; lot.add(p2); }
    var core = mesh(sph(0.05, 8, 6), M('#F2C14E'), false); core.position.y = 0.14; lot.add(core);
    c.chestG.attach(g); c.item = g;
  }
}

/* ---- khớp và tư thế ---- */
var J = ['hipY', 'sp', 'spz', 'hd', 'hdy', 'lsx', 'lsy', 'lsz', 'rsx', 'rsy', 'rsz', 'lel', 'rel', 'lhx', 'lhz', 'rhx', 'rhz', 'lkn', 'rkn', 'breath', 'lc', 'rc', 'lwx', 'lwy', 'lwz', 'rwx', 'rwy', 'rwz'];
function base() { return { hipY: 0.95, sp: 0, spz: 0, hd: 0, hdy: 0, lsx: 0.06, lsy: 0, lsz: 0.14, rsx: 0.06, rsy: 0, rsz: -0.14, lel: -0.2, rel: -0.2, lhx: 0, lhz: 0, rhx: 0, rhz: 0, lkn: 0.05, rkn: 0.05, breath: 0, lc: 0.3, rc: 0.3, lwx: 0, lwy: 0, lwz: 0, rwx: 0, rwy: 0, rwz: 0 }; }
function setPose(c, p, dt, rate) {
  var k = dt === null ? 1 : 1 - Math.exp(-dt * (rate || 10));
  J.forEach(function (j) { var v = c.cur[j]; c.cur[j] = v === undefined || k === 1 ? p[j] : v + (p[j] - v) * k; });
  var q = c.cur;
  c.hips.position.y = q.hipY; c.spine.rotation.set(q.sp, 0, q.spz); c.head.rotation.set(q.hd, q.hdy, 0);
  c.AL.sh.rotation.set(q.lsx, q.lsy, q.lsz); c.AR.sh.rotation.set(q.rsx, q.rsy, q.rsz);
  c.AL.el.rotation.x = q.lel; c.AR.el.rotation.x = q.rel;
  setHand(c.AL.H, q.lc, q.lwx, q.lwy, q.lwz); setHand(c.AR.H, q.rc, q.rwx, q.rwy, q.rwz);
  c.skirt.visible = !p.cross; c.lap.visible = !!p.cross;
  if (p.cross) sitCross(c);
  else { c.L.ank.rotation.set(0, 0, 0); c.R.ank.rotation.set(0, 0, 0); c.L.hip.rotation.set(q.lhx, 0, q.lhz); c.R.hip.rotation.set(q.rhx, 0, q.rhz); c.L.knee.rotation.x = q.lkn; c.R.knee.rotation.x = q.rkn; }
  c.chestG.scale.set(1 + q.breath * 0.035, 1 + q.breath * 0.025, 1 + q.breath * 0.05);
  c.chestG.position.y = q.breath * 0.02;
}
var _x = new T.Vector3(), _y = new T.Vector3(), _z = new T.Vector3(), _m = new T.Matrix4(), _q = new T.Quaternion(), _wn = new T.Vector3();
function legIK(leg, d1, d2) {
  d1 = d1.clone().normalize(); d2 = d2.clone().normalize();
  _y.copy(d1).negate();
  _z.copy(d2).addScaledVector(d1, -d2.dot(d1)); if (_z.lengthSq() < 1e-6) _z.set(0, 0, -1); _z.normalize().negate();
  _x.crossVectors(_y, _z).normalize(); _z.crossVectors(_x, _y).normalize();
  _m.makeBasis(_x, _y, _z); leg.hip.quaternion.setFromRotationMatrix(_m);
  leg.knee.rotation.x = Math.acos(Math.max(-1, Math.min(1, d1.dot(d2))));
}
function V(x, y, z) { return new T.Vector3(x, y, z); }
// ngồi xếp bằng: gối mở rộng hai bên sát bồ đoàn, ống chân bắt chéo trước bụng, lòng bàn chân ngửa lên
var CROSS_D = [V(0.78, -0.34, 0.52), V(-0.97, 0.0, -0.2), V(-0.78, -0.3, 0.56), V(0.95, 0.12, 0.25)];
function sitCross(c) {
  legIK(c.L, CROSS_D[0], CROSS_D[1]); legIK(c.R, CROSS_D[2], CROSS_D[3]);
  [c.L, c.R].forEach(function (lg) {
    if (lg.footRoll === undefined) {
      c.root.updateMatrixWorld(true);
      var best = 0, bv = -9;
      for (var k = 0; k < 24; k++) {
        var r = k / 24 * Math.PI * 2; lg.ank.rotation.set(Math.PI / 2 - 0.25, r, 0, 'YXZ'); lg.ank.updateMatrixWorld(true);
        lg.ft.getWorldQuaternion(_q); _wn.set(0, -1, 0).applyQuaternion(_q);
        if (_wn.y > bv) { bv = _wn.y; best = r; }
      }
      lg.footRoll = best;
    }
    lg.ank.rotation.set(Math.PI / 2 - 0.25, lg.footRoll, 0, 'YXZ');
  });
}
function closeEyes(c, on) { if (c.eyesClosed === on) return; c.eyesClosed = on; c.eyes.forEach(function (e) { e.visible = !on; }); c.lids.forEach(function (l) { l.visible = on; }); }
function ease(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }
function seg(t, a, b) { return ease((t - a) / (b - a)); }
function lerp(a, b, k) { return a + (b - a) * k; }
function mix(p, q, k) { var o = {}; J.forEach(function (j) { o[j] = lerp(p[j], q[j], k); }); if (k > 0.5 && q.cross) o.cross = 1; else if (p.cross && k <= 0.5) o.cross = 1; return o; }
var PRAY = { sx: -0.325, sz: -0.6125, sy: -0.45, el: -1.858, wx: -0.775, wy: -0.767, wz: -0.2375 };   // hai lòng bàn tay áp vào nhau giữa ngực
function prayArms(p, w) {
  w = w === undefined ? 1 : w;
  p.lsx = lerp(p.lsx, PRAY.sx, w); p.rsx = lerp(p.rsx, PRAY.sx, w); p.lsz = lerp(p.lsz, PRAY.sz, w); p.rsz = lerp(p.rsz, -PRAY.sz, w);
  p.lsy = lerp(p.lsy, PRAY.sy, w); p.rsy = lerp(p.rsy, -PRAY.sy, w);
  p.lel = lerp(p.lel, PRAY.el, w); p.rel = lerp(p.rel, PRAY.el, w); p.lc = lerp(p.lc, 0.04, w); p.rc = lerp(p.rc, 0.04, w);
  p.lwx = lerp(p.lwx, PRAY.wx, w); p.rwx = lerp(p.rwx, PRAY.wx, w); p.lwy = lerp(p.lwy, PRAY.wy, w); p.rwy = lerp(p.rwy, -PRAY.wy, w); p.lwz = lerp(p.lwz, PRAY.wz, w); p.rwz = lerp(p.rwz, -PRAY.wz, w);
  return p;
}
function P_hold() { var p = base(); p.lsx = -0.75; p.rsx = -0.75; p.lsz = -0.42; p.rsz = 0.42; p.lel = -1.25; p.rel = -1.25; p.lc = 0.45; p.rc = 0.45; p.lwy = 0.9; p.rwy = -0.9; return p; }
function P_kneel(p) { p = p || P_hold(); p.hipY = 0.58; p.lhx = -1.5; p.lkn = 1.52; p.rhx = 0.15; p.rkn = 1.62; p.sp = 0.12; return p; }
function P_lower() { var p = P_kneel(); p.hipY = 0.56; p.sp = 1.0; p.hd = -0.35; p.lsx = -0.95; p.rsx = -0.95; p.lsz = -0.24; p.rsz = 0.24; p.lel = -0.12; p.rel = -0.12; return p; }
function P_open() { var p = P_lower(); p.lsz = -0.05; p.rsz = 0.05; p.lsy = 0.25; p.rsy = -0.25; return p; }
function P_prayK() { var p = P_kneel(base()); prayArms(p); p.hd = 0.32; p.sp = 0.18; return p; }
function P_cross(p) { p = p || base(); p.hipY = 0.3; p.cross = 1; return p; }
function P_zen() { var p = P_cross(); prayArms(p); p.hd = 0.12; return p; }

// Thả cá (gửi qua mạng tên 'throw'): đi ra mép nước, quỳ một gối, hạ hai tay xuống mặt nước, mở tay cho cá bơi đi, chắp tay
var REL = { walkIn: 1.1, open: 4.3, end: 9.6 };
var EDGE = R_WALK - (R_OUT + 0.36);
var ACT_LEN = { release: REL.end, pick: 1.25, pray: 2.6, bow: 2.6, niem: 2.6 };
function relPose(t) {
  var p = P_hold();
  if (t >= 1.2) p = mix(p, P_kneel(P_hold()), seg(t, 1.2, 2.5));
  if (t >= 2.6) p = mix(p, P_lower(), seg(t, 2.6, 4.0));
  if (t >= 4.1) p = mix(p, P_open(), seg(t, 4.1, 4.6));
  if (t >= 5.6) p = mix(p, P_prayK(), seg(t, 5.6, 6.6));
  if (t >= 7.4) p = mix(p, base(), seg(t, 7.4, 8.3));
  return p;
}
function walkLegs(p, phase, k) {
  var s = Math.sin(phase);
  p.lhx = -0.6 * s * k; p.rhx = 0.6 * s * k;
  p.lkn = 0.1 + 0.75 * Math.max(0, Math.sin(phase + 1.6)) * k; p.rkn = 0.1 + 0.75 * Math.max(0, -Math.sin(phase + 1.6)) * k;
  p.hipY = 0.95 + 0.05 * Math.abs(Math.cos(phase)) * k;
  return s;
}
function pose(c, time) {
  var p = base(); p.sp = 0.02 * Math.sin(time * 1.6 + c.angle * 5);
  var hand = c.look && c.look.hand || 'none';
  if (c.speed > 0.05) {
    var k = Math.min(1, c.speed / 2.6), s = walkLegs(p, c.walkP, k);
    p.lsx = 0.5 * s * k + 0.05; p.rsx = -0.5 * s * k + 0.05; p.lel = -0.45; p.rel = -0.45; p.sp = 0.08 * k;
  }
  itemArms(p, hand);
  var a = c.act, t = c.actT, eyes = false;
  if (a === 'pray') { var w = seg(t, 0, 0.35) * (1 - seg(t, 2.1, 2.5)); prayArms(p, w); p.hd = 0.18 * w; eyes = w > 0.6; }
  if (a === 'bow') { var wb = seg(t, 0, 0.3) * (1 - seg(t, 2.0, 2.5)); prayArms(p, wb); var bw = seg(t, 0.35, 0.8) * (1 - seg(t, 1.5, 2.0)); p.sp = lerp(p.sp, 0.62, bw); p.hd = 0.25 * bw; p.lhx = lerp(p.lhx, -0.15, bw); p.rhx = p.lhx; eyes = bw > 0.5; }
  if (a === 'niem') { var wn = seg(t, 0, 0.35) * (1 - seg(t, 2.1, 2.5)); prayArms(p, wn); p.hd = 0.12 * wn + 0.06 * Math.sin(t * 9) * wn; eyes = wn > 0.6; }
  if (a === 'release') {
    p = relPose(t);
    var inW = t < REL.walkIn ? 1 : 0, outW = t > 8.4 ? 1 : 0;
    if (inW || outW) walkLegs(p, t * 7, 0.7);
    eyes = t > 6.2 && t < 7.6;
  }
  if (a === 'pick') {
    var d = seg(t, 0, 0.45) * (1 - seg(t, 0.7, 1.2));
    p.hipY = 0.95 - 0.28 * d; p.lkn = lerp(p.lkn, 1.1, d); p.rkn = p.lkn; p.lhx = lerp(p.lhx, -0.9, d); p.rhx = p.lhx;
    p.sp = lerp(p.sp, 0.75, d); p.rsx = lerp(p.rsx, -0.9, d); p.rel = lerp(p.rel, -0.1, d); p.hd = 0.3 * d;
  }
  if (c.item) c.item.visible = !a || a === 'pick';
  closeEyes(c, eyes);
  return p;
}
function applyPose(c, dt, time) { setPose(c, pose(c, time), dt, 12); }
function act(c, name) { c.act = name; c.actT = 0; }
// vị trí trên lối đi; khi thả cá nhân vật bước ra sát mép nước (c.edge)
function edgeOf(c) {
  if (c.act !== 'release') return 0;
  var t = c.actT;
  return EDGE * (seg(t, 0, REL.walkIn) * (1 - seg(t, 8.4, REL.end - 0.1)));
}
function placeOnPath(c) { var r = R_WALK - edgeOf(c); c.root.position.set(Math.cos(c.angle) * r, 0, Math.sin(c.angle) * r); }
function faceTo(c, dx, dz, dt) {
  var want = Math.atan2(dx, dz), cur = c.root.rotation.y;
  var d = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
  c.root.rotation.y = cur + d * (1 - Math.exp(-dt * 8));
}
function faceWater(c, dt) { faceTo(c, -Math.cos(c.angle), -Math.sin(c.angle), dt); }
function faceWalk(c, dt) { faceTo(c, Math.sin(c.angle) * c.dirSign, -Math.cos(c.angle) * c.dirSign, dt); }

/* ===================== Cá ===================== */
function makeFish(fk) {
  var sp = fishOf(fk);
  var g = new T.Group(); var m = M(sp.body, { roughness: 0.45 });
  var b = mesh(sph(0.2, 16, 12), m); b.scale.set(0.55, 0.7, 1.6); g.add(b);
  var belly = mesh(sph(0.16, 12, 10), M(sp.belly)); belly.scale.set(0.5, 0.45, 1.4); belly.position.y = -0.06; g.add(belly);
  if (sp.spot) { var spot = mesh(sph(0.1, 10, 8), M(sp.spot), false); spot.scale.set(0.9, 0.5, 1.4); spot.position.set(0, 0.1, 0.05); g.add(spot); }
  if (sp.whisk) { [-1, 1].forEach(function (s2) { var wk = mesh(cyl(0.008, 0.004, 0.22, 4), M(sp.fin), false); wk.position.set(0.06 * s2, -0.02, 0.36); wk.rotation.x = 1.2; wk.rotation.z = 0.5 * s2; g.add(wk); }); }
  var tailG = new T.Group(); tailG.position.z = -0.3; g.add(tailG);
  var tail = mesh(new T.ConeGeometry(0.18, 0.32, 4), M(sp.fin, { transparent: true, opacity: 0.9 })); tail.rotation.x = Math.PI / 2; tail.scale.set(0.25, 1, 1); tail.position.z = -0.12; tailG.add(tail);
  var fin = mesh(new T.ConeGeometry(0.08, 0.22, 4), M(sp.fin)); fin.position.set(0, 0.14, 0.02); fin.scale.set(0.3, 1, 1.6); g.add(fin);
  [-1, 1].forEach(function (s) { var e = mesh(sph(0.025, 8, 6), eyeM, false); e.position.set(0.09 * s, 0.04, 0.26); g.add(e); });
  g.userData.tail = tailG; return g;
}
function handPos(c) { var v = new T.Vector3(), w = new T.Vector3(); c.AL.hand.getWorldPosition(v); c.AR.hand.getWorldPosition(w); return v.add(w).multiplyScalar(0.5); }
function startThrow(c, isMe, back, fk) {
  act(c, 'release');
  var f = makeFish(fk || 'chepdo');
  scene.add(f);
  var F = { obj: f, owner: c, t: 0, state: 'held', isMe: isMe, back: !!back, turn: Math.random() < 0.5 ? 1 : -1 };
  S.fish.push(F);
  return F;
}
var splashes = [];
function splash(pos, big) {
  var ring = mesh(new T.RingGeometry(0.16, 0.22, 40), new T.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.85, depthWrite: false }), false);
  ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, WATER_Y + 0.01, pos.z); scene.add(ring);
  splashes.push({ m: ring, t: 0, big: big ? 1.6 : 1 });
}
function faceObj(o, dx, dz) { o.rotation.set(0, Math.atan2(dx, dz), 0); }
var FISH_Y = WATER_Y - 0.12;
function updateFish(dt) {
  for (var i = S.fish.length - 1; i >= 0; i--) {
    var F = S.fish[i], o = F.obj, c = F.owner; F.t += dt;
    if (F.state === 'held') {
      // cá nằm ngang trong hai lòng bàn tay cho tới lúc mở tay
      c.root.updateMatrixWorld(true);
      var fwd = new T.Vector3(-Math.cos(c.angle), 0, -Math.sin(c.angle)), side = new T.Vector3(-Math.sin(c.angle), 0, Math.cos(c.angle));
      o.position.copy(handPos(c)).add(new T.Vector3(0, 0.08, 0)).addScaledVector(fwd, 0.08);
      o.rotation.set(0, Math.atan2(side.x, side.z), 0);
      if (c.act !== 'release' || c.actT >= REL.open) {
        F.state = 'drop'; F.t = 0; F.from = o.position.clone(); F.dir = fwd;
        if (F.isMe) (function (fx) {
          setTimeout(function () {
            if (fx.back) toast('Chú ' + fishOf(S.fishK).name.toLowerCase() + ' quay lại tạ ơn bạn', 'Cá đang lượn quanh chờ bạn. Niệm “A Di Đà Phật” để tiễn cá đi.');
            else toast('Chú cá đã về với dòng sông', 'Mong chú cá bơi đi bình an, tự tại.');
          }, 1600);
        })(F);
      }
    } else if (F.state === 'drop') {
      // trượt khỏi tay xuống nước, rồi tự bơi ra xa
      var kd = Math.min(1, F.t / 0.6);
      o.position.set(F.from.x, lerp(F.from.y + 0.08, FISH_Y, ease(kd)), F.from.z);
      if (!F.splashed && F.t > 0.15) { F.splashed = true; splash(o.position); }
      if (F.t >= 0.6) {
        F.state = 'away'; F.t = 0; F.spot = o.position.clone();
      }
    } else if (F.state === 'away') {
      var awd = F.t;
      o.position.copy(F.spot).addScaledVector(F.dir, awd * 1.2);
      var sd2 = new T.Vector3(-F.dir.z, 0, F.dir.x); o.position.addScaledVector(sd2, Math.sin(awd * 1.4) * 0.25); o.position.y = FISH_Y - Math.min(0.3, awd * 0.08);
      var dd = F.dir.clone().addScaledVector(sd2, Math.cos(awd * 1.4) * 0.3); faceObj(o, dd.x, dd.z);
      if (Math.abs(awd - 0.9) < dt) splash(o.position, true);
      if (F.t > 1.6) { F.state = 'swim'; F.t = 0; F.ang = Math.atan2(o.position.z, o.position.x); F.r = Math.hypot(o.position.x, o.position.z); }
    } else if (F.state === 'swim') {
      F.ang += F.turn * dt * 0.12; F.r = Math.max(R_IN + 1.2, F.r - dt * 0.6);
      o.position.set(Math.cos(F.ang) * F.r, FISH_Y - 0.2, Math.sin(F.ang) * F.r);
      faceObj(o, -Math.sin(F.ang) * F.turn - Math.cos(F.ang) * 0.4, Math.cos(F.ang) * F.turn - Math.sin(F.ang) * 0.4);
      if (F.back && F.t > 0.2) { F.state = 'return'; F.t = 0; F.from = o.position.clone(); if (F.isMe) { S.returning = F; renderHUD(); } }
      else if (!F.back && F.t > 3) { F.state = 'fade'; F.t = 0; }
    } else if (F.state === 'return') {
      var k = Math.min(1, F.t / 1.5);
      if (k < 1) { o.position.lerpVectors(F.from, F.spot, ease(k)); o.position.y = FISH_Y; faceObj(o, F.spot.x - F.from.x, F.spot.z - F.from.z); }
      else { F.state = 'circle'; F.t = 0; }
    } else if (F.state === 'circle') {
      var th = F.t * 1.8;
      o.position.set(F.spot.x + Math.cos(th) * 0.9, FISH_Y + 0.04 + 0.03 * Math.sin(F.t * 5), F.spot.z + Math.sin(th) * 0.9);
      faceObj(o, -Math.sin(th), Math.cos(th));
      if (Math.random() < dt * 0.6) splash(o.position);
    } else if (F.state === 'leave') {
      var out = new T.Vector3(-F.spot.x, 0, -F.spot.z).normalize();
      o.position.addScaledVector(out, dt * 2.4); o.position.y = FISH_Y; faceObj(o, out.x, out.z);
      if (F.t > 1.6) { F.state = 'fade'; F.t = 0; }
    } else if (F.state === 'fade') {
      o.position.y -= dt * 0.4;
      if (F.t > 1.2) { scene.remove(o); S.fish.splice(i, 1); continue; }
    }
    if (o.userData.tail) o.userData.tail.rotation.y = Math.sin(F.t * 14) * 0.5;
  }
  for (var s = splashes.length - 1; s >= 0; s--) {
    var sp = splashes[s]; sp.t += dt; var sc = 1 + sp.t * 3.2 * sp.big; sp.m.scale.set(sc, sc, sc);
    sp.m.material.opacity = Math.max(0, 0.85 - sp.t * 0.6);
    if (sp.t > 1.5) { scene.remove(sp.m); splashes.splice(s, 1); }
  }
}
function releaseCircling(owner) {
  S.fish.forEach(function (F) {
    if (F.owner === owner && (F.state === 'circle' || F.state === 'return')) {
      if (!F.spot) F.spot = F.obj.position.clone();
      F.state = 'leave'; F.t = 0;
    }
  });
}

/* ===================== Rác trên bờ (máy chủ hồ quyết định) ===================== */
var TRASH_KINDS = [
  function () { var g = new T.Group(); var b = mesh(cyl(0.12, 0.12, 0.5), M('#BFE3EE', { transparent: true, opacity: 0.85, roughness: 0.2 })); b.rotation.z = Math.PI / 2; g.add(b); var cp = mesh(cyl(0.06, 0.06, 0.1), M('#3E8AC9')); cp.rotation.z = Math.PI / 2; cp.position.x = 0.3; g.add(cp); return g; },
  function () { var g = new T.Group(); var b = mesh(sph(0.3, 10, 8), M('#F4F4F0', { roughness: 0.6 })); b.scale.set(1, 0.45, 0.8); g.add(b); return g; },
  function () { var g = new T.Group(); var c = mesh(cyl(0.11, 0.11, 0.32), M('#D9442B', { metalness: 0.5, roughness: 0.4 })); c.rotation.x = Math.PI / 2; g.add(c); return g; },
  function () { var g = new T.Group(); g.add(mesh(new T.BoxGeometry(0.5, 0.18, 0.4), M('#FFFFFF'))); return g; }
];
var trash = {};            // i -> {item, obj}
var TRASH_N = 8;
function randomTrashItem(i) {
  return { i: i, a: Math.random() * Math.PI * 2, r: R_OUT + 0.6 + Math.random() * 1.6, k: Math.floor(Math.random() * TRASH_KINDS.length), rot: Math.random() * 6 };
}
function addTrash(item) {
  removeTrash(item.i);
  var obj = TRASH_KINDS[item.k % TRASH_KINDS.length]();
  obj.position.set(Math.cos(item.a) * item.r, 0.12, Math.sin(item.a) * item.r); obj.rotation.y = item.rot;
  var glint = new T.Mesh(sph(0.07, 8, 6), new T.MeshBasicMaterial({ color: 0xFFF3C4 })); glint.position.y = 0.35; obj.add(glint);
  obj.userData.glint = glint; obj.userData.trash = item.i;
  scene.add(obj); trash[item.i] = { item: item, obj: obj };
}
function removeTrash(i) { var t = trash[i]; if (t) { scene.remove(t.obj); delete trash[i]; } }
function clearTrash() { Object.keys(trash).forEach(function (i) { removeTrash(i); }); }
function trashList() { return Object.keys(trash).map(function (i) { return trash[i].item; }); }
function hostInitTrash() {
  clearTrash();
  for (var i = 0; i < TRASH_N; i++) addTrash(randomTrashItem(i));
  // một món gần chỗ bắt đầu để dễ thấy
  var t0 = trash[0].item; t0.a = me.angle - 0.08; t0.r = R_OUT + 0.9; addTrash(t0);
}
function hostPick(i, by) {
  if (!trash[i]) return;
  removeTrash(i);
  send({ t: 'gone', i: i, by: by });
  onGone(i, by);
  setTimeout(function () {
    if (!S.hosting || !S.inLake) return;
    var item = randomTrashItem(i); addTrash(item); send({ t: 'tnew', item: item });
  }, 15000);
}
function onGone(i, by) {
  removeTrash(i);
  if (by === Net.id) {
    S.bag++;
    if (S.bag >= 8) { S.bag = 0; addPhuoc(5); toast('Đầy một túi rác · +5 phước', 'Hồ sạch hơn rồi.'); }
    else toast('Đã nhặt rác', 'Túi rác ' + S.bag + '/8');
    store.set('bag', S.bag); renderHUD();
  }
}

/* ===================== Người chơi ===================== */
var me = null;
var remotes = {};          // id -> nhân vật của người khác
var labelsEl = $('labels');
var myBub = document.createElement('div'); myBub.className = 'bub'; myBub.hidden = true; labelsEl.appendChild(myBub);
var relBub = document.createElement('div'); relBub.className = 'bub'; relBub.hidden = true; labelsEl.appendChild(relBub);
function spawnMe() {
  if (me) scene.remove(me.root);
  var keepA = me ? me.angle : Math.random() * Math.PI * 2, keepR = me ? me.root.rotation.y : null;
  me = chibi(S.look); me.angle = keepA; placeOnPath(me); me.root.rotation.y = keepR !== null ? keepR : Math.atan2(-Math.cos(me.angle), -Math.sin(me.angle));
  scene.add(me.root);
  $('meName').textContent = S.name; $('meAv').textContent = (S.name.trim()[0] || 'T').toUpperCase(); $('meAv').style.background = robeOf(S.robe).robe;
}
function getRemote(id, info) {
  var r = remotes[id];
  if (!r) {
    var lk = (info && info.look) || { robe: info && info.robe };
    r = chibi(lk); r.id = id; r.name = (info && info.name) || 'Bạn đồng tu';
    r.angle = info && typeof info.a === 'number' ? info.a : 0; r.netA = r.angle; r.netV = 0;
    placeOnPath(r); scene.add(r.root);
    r.tag = document.createElement('div'); r.tag.className = 'tag'; r.tag.textContent = r.name; labelsEl.appendChild(r.tag);
    r.bub = document.createElement('div'); r.bub.className = 'bub'; r.bub.hidden = true; labelsEl.appendChild(r.bub);
    remotes[id] = r; renderCount();
  } else if (info) {
    if (info.name && info.name !== r.name) { r.name = info.name; r.tag.textContent = r.name; }
    var nl = info.look || (info.robe ? { robe: info.robe } : null);
    if (nl && chibi.keyOf(nl) !== r.lookKey) {          // đổi trang phục: dựng lại nhân vật
      var keep = { angle: r.angle, netA: r.netA, netV: r.netV, rot: r.root.rotation.y };
      removeRemote(id); r = getRemote(id, { name: info.name, look: nl, a: keep.angle });
      r.netA = keep.netA; r.netV = keep.netV; r.root.rotation.y = keep.rot;
    }
  }
  return r;
}
function removeRemote(id) {
  var r = remotes[id]; if (!r) return;
  scene.remove(r.root); r.tag.remove(); r.bub.remove();
  S.fish.forEach(function (F) { if (F.owner === r) { F.state = 'fade'; F.t = 0; } });
  if (S.ev && S.ev.c === r) S.ev = null;
  delete remotes[id]; renderCount();
}
function clearRemotes() { Object.keys(remotes).forEach(function (id) { removeRemote(+id); }); }
function showBubble(el, text) { el.textContent = text; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(function () { el.hidden = true; }, 2200); }
var SAY = { pray: 'Chắp tay tùy hỷ', bow: 'Cúi chào', niem: 'A Di Đà Phật' };

/* ===================== Mạng ===================== */
var Net = { ws: null, id: 0, hostId: 0, isHost: false, leaving: false, lastSt: 0 };
function send(o) { if (Net.ws && Net.ws.readyState === 1) Net.ws.send(JSON.stringify(o)); }
function helloMsg(to) { var o = { t: 'hello', name: S.name, robe: S.look.robe, look: S.look, a: me ? me.angle : 0 }; if (to) o.to = to; return o; }
function connect(url, lakeTitle) {
  $('joinErr').hidden = true;
  var ws;
  try { ws = new WebSocket(url); } catch (e) { lobbyError('Địa chỉ không hợp lệ.'); return; }
  Net.ws = ws; Net.leaving = false;
  var opened = false;
  var timer = setTimeout(function () { if (!opened) { try { ws.close(); } catch (e) { /* bỏ qua */ } lobbyError('Không kết nối được tới hồ. Kiểm tra cùng Wi-Fi và địa chỉ của chủ hồ.'); } }, 6000);
  ws.onopen = function () { opened = true; clearTimeout(timer); enterLake(lakeTitle); };
  ws.onmessage = function (ev) { var o; try { o = JSON.parse(ev.data); } catch (e) { return; } handle(o); };
  ws.onclose = function () {
    clearTimeout(timer);
    if (Net.ws !== ws) return;
    if (S.inLake) exitLake(Net.leaving ? '' : 'Đã mất kết nối với chủ hồ.');
    else if (!opened && !Net.leaving) lobbyError('Không kết nối được tới hồ. Kiểm tra cùng Wi-Fi và địa chỉ của chủ hồ.');
  };
  ws.onerror = function () { /* xử lý ở onclose */ };
}
function handle(o) {
  var r;
  switch (o.t) {
    case 'welcome':
      Net.id = o.id; Net.isHost = !!o.host; Net.hostId = o.hostId || (o.host ? o.id : 0);
      send(helloMsg());
      if (Net.isHost) hostInitTrash();
      break;
    case 'join':
      send(helloMsg(o.id));
      if (Net.isHost) send({ t: 'trash', to: o.id, list: trashList() });
      break;
    case 'hello':
      getRemote(o.from, o);
      break;
    case 'who':
      send(helloMsg(o.from));
      break;
    case 'st':
      r = remotes[o.from];
      if (!r) { r = getRemote(o.from, { a: o.a }); send({ t: 'who', to: o.from }); }
      r.netA = o.a; r.netV = o.v || 0; r.dirSign = o.d || 1;
      break;
    case 'act':
      r = remotes[o.from]; if (!r) break;
      if (o.n === 'throw') {
        startThrow(r, false, o.back, o.fk);
        S.ev = { c: r, t: 0, done: false, seen: false };
      } else if (ACT_LEN[o.n]) {
        act(r, o.n);
        if (SAY[o.n]) showBubble(r.bub, SAY[o.n]);
        if (o.n === 'niem') releaseCircling(r);
      }
      break;
    case 'tuyhy':
      r = remotes[o.from];
      addPhuoc(2);
      toast((r ? r.name : 'Một bạn đồng tu') + ' tùy hỷ cho bạn', 'Cả hai cùng nhận +2 phước.');
      break;
    case 'trash':
      clearTrash(); (o.list || []).forEach(addTrash);
      break;
    case 'pick':
      if (Net.isHost) hostPick(o.i, o.from);
      break;
    case 'gone':
      onGone(o.i, o.by);
      break;
    case 'tnew':
      addTrash(o.item);
      break;
    case 'leave':
      removeRemote(o.id);
      if (o.id === Net.hostId && !Net.isHost) exitLake('Chủ hồ đã đóng hồ.');
      break;
  }
}

/* ===================== Sảnh ===================== */
var lakes = {};
function lobbyError(msg) { $('joinErr').textContent = msg; $('joinErr').hidden = !msg; }
function renderRobes() {
  $('robes').innerHTML = '';
  ROBES.filter(function (rb) { return S.owned[rb.k]; }).forEach(function (rb) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'robe' + (rb.k === S.look.robe ? ' on' : '');
    b.innerHTML = '<i style="background:' + rb.robe + '"></i>' + rb.name;
    b.addEventListener('click', function () { S.look.robe = rb.k; saveLook(); renderRobes(); });
    $('robes').appendChild(b);
  });
}
function renderLakes() {
  var now = Date.now(), list = $('lakes'); list.innerHTML = '';
  var keys = Object.keys(lakes).filter(function (k) { return now - lakes[k].seen < 4500; });
  keys.forEach(function (k) {
    var L = lakes[k];
    var row = document.createElement('div'); row.className = 'lake';
    var info = document.createElement('div'); var b = document.createElement('b'); b.textContent = L.name; var sp = document.createElement('span'); sp.textContent = L.ip; info.appendChild(b); info.appendChild(sp);
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn'; btn.textContent = 'Vào';
    btn.addEventListener('click', function () { saveName(); connect('ws://' + L.ip + ':' + (L.port || 8787), L.name); });
    row.appendChild(info); row.appendChild(btn); list.appendChild(row);
  });
  $('scanning').hidden = keys.length > 0 || !A;
}
window.onLakeFound = function (json) {
  try { var o = JSON.parse(json); lakes[o.ip] = { name: o.name, ip: o.ip, port: o.port, seen: Date.now() }; renderLakes(); } catch (e) { /* bỏ qua */ }
};
setInterval(function () { if (!S.inLake) renderLakes(); }, 2000);
function saveName() {
  var n = $('inName').value.trim().slice(0, 16) || 'Tịnh Tâm';
  S.name = n; store.set('name', n);
}
$('inName').value = S.name;
renderRobes();
$('btnHost').addEventListener('click', function () {
  saveName();
  if (!A) { $('hostErr').textContent = 'Chỉ mở hồ được trong app Android. Trên máy tính, hãy chạy server thử (thư mục server) rồi vào bằng địa chỉ.'; $('hostErr').hidden = false; return; }
  var title = 'Hồ của ' + S.name;
  var ip = A.startHost(title);
  if (!ip || ip.indexOf('ERR:') === 0) { $('hostErr').textContent = 'Không mở được hồ: ' + (ip ? ip.slice(4) : 'không rõ lỗi') + '. Hãy bật Wi-Fi rồi thử lại.'; $('hostErr').hidden = false; return; }
  $('hostErr').hidden = true;
  S.hosting = true; S.hostIp = ip;
  try { A.stopDiscovery(); } catch (e) { /* bỏ qua */ }
  setTimeout(function () { connect('ws://127.0.0.1:' + A.port(), title); }, 300);
});
$('btnIp').addEventListener('click', function () {
  saveName();
  var v = $('inIp').value.trim(); if (!v) { lobbyError('Nhập địa chỉ IP của chủ hồ, ví dụ 192.168.1.5'); return; }
  var url = v.indexOf('ws') === 0 ? v : 'ws://' + (v.indexOf(':') > 0 ? v : v + ':8787');
  connect(url, 'Hồ An Lạc');
});
if (!A) { $('inIp').value = 'localhost:8787'; $('scanning').hidden = true; }
else { try { A.startDiscovery(); } catch (e) { /* bỏ qua */ } }

function enterLake(title) {
  S.inLake = true; S.ev = null; S.returning = null;
  spawnMe();
  $('lobby').hidden = true; $('hud').hidden = false;
  $('lakeName').textContent = S.hosting && S.hostIp ? title + ' · ' + S.hostIp : title;
  renderHUD(); renderCount();
  try { if (A) A.stopDiscovery(); } catch (e) { /* bỏ qua */ }
  if (window.HAL && HAL.onEnter) HAL.onEnter();
}
function exitLake(msg) {
  S.inLake = false; Net.leaving = true;
  try { if (Net.ws) Net.ws.close(); } catch (e) { /* bỏ qua */ }
  Net.ws = null;
  if (S.hosting && A) { try { A.stopHost(); } catch (e) { /* bỏ qua */ } }
  S.hosting = false; S.hostIp = '';
  clearRemotes(); clearTrash();
  S.fish.forEach(function (F) { scene.remove(F.obj); }); S.fish = [];
  if (window.HAL && HAL.onExit) HAL.onExit();
  $('hud').hidden = true; $('lobby').hidden = false; $('hintL').hidden = $('hintR').hidden = true;
  lobbyError(msg || '');
  lakes = {}; renderLakes();
  if (A) { try { A.startDiscovery(); } catch (e) { /* bỏ qua */ } }
}
$('leave').addEventListener('click', function () { exitLake(''); });

/* ===================== Giao diện trong hồ ===================== */
function addPhuoc(n) { S.phuoc += n; if (n > 0) { S.prog.earned += n; saveProg(); } store.set('phuoc', S.phuoc); renderHUD(); if (window.HAL && HAL.onChange) HAL.onChange(); }
function renderCount() { $('count').textContent = (1 + Object.keys(remotes).length) + ' người ở hồ'; }
function renderHUD() {
  $('phuoc').textContent = S.phuoc.toLocaleString('vi-VN');
  $('bag').textContent = S.bag;
  var fsp = fishOf(S.fishK); $('fishName').textContent = fsp.name; $('fishDot').style.background = fsp.body;
  var d = ''; for (var i = 0; i < 5; i++) d += '<span class="dot' + (i < S.turns ? '' : ' e') + '"></span>';
  $('dots').innerHTML = d;
  var busy = me && me.act === 'release';
  $('go').textContent = S.returning ? 'Cá đang tạ ơn…' : (S.turns > 0 ? 'Thả cá' : (S.phuoc >= 100 ? 'Đổi 100 phước lấy 1 lượt' : 'Hết lượt hôm nay'));
  $('go').disabled = !!S.returning || !!busy || (S.turns <= 0 && S.phuoc < 100);
  var hl = !!(S.ev && S.ev.seen && !S.ev.done);
  $('gChap').className = hl ? 'hl' : ''; $('gCui').className = hl ? 'hl' : '';
  $('gNiem').className = (hl || S.returning) ? 'hl' : '';
}
var toastT = 0;
function toast(t, s) { $('tt').textContent = t; $('ts').textContent = s || ''; $('toast').classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { $('toast').classList.remove('show'); }, 2800); }

function myAct(name) {
  act(me, name); send({ t: 'act', n: name }); showBubble(myBub, SAY[name]);
  if (S.ev && S.ev.seen && !S.ev.done) {
    S.ev.done = true; S.ev.doneAt = S.ev.t;
    var c = S.ev.c; addPhuoc(2); S.prog.tuyhy++; saveProg();
    send({ t: 'tuyhy', to: c.id });
    toast('Tùy hỷ +2 phước', c.name + ' cũng nhận +2 phước');
    sparkles(me, c); renderHUD();
  }
}
$('gChap').addEventListener('click', function () { myAct('pray'); });
$('gCui').addEventListener('click', function () { myAct('bow'); });
$('gNiem').addEventListener('click', function () {
  myAct('niem');
  if (S.returning) {
    S.returning = null;
    setTimeout(function () { releaseCircling(me); toast('Chú cá đã bơi đi bình an', 'Công đức phóng sinh của bạn đã được ghi nhận.'); renderHUD(); }, 500);
  }
});
$('go').addEventListener('click', function () {
  if (!me || S.returning || me.act === 'release') return;
  if (S.turns <= 0) {
    if (S.phuoc >= 100) { S.phuoc -= 100; store.set('phuoc', S.phuoc); S.turns = 1; saveTurns(); toast('Đã đổi 100 phước', 'Bạn có thêm 1 lượt thả cá.'); renderHUD(); }
    return;
  }
  walkDir = 0;
  var back = Math.random() < 0.25;
  startThrow(me, true, back, S.fishK);
  send({ t: 'act', n: 'throw', back: back, fk: S.fishK });
  var st = S.stats[S.fishK] || { rel: 0, back: 0, tf: 0 }; st.rel++; if (back) st.back++; S.stats[S.fishK] = st; store.set('stats', S.stats);
  S.prog.rel++; saveProg();
  S.turns--; saveTurns(); renderHUD();
});

var sparks = [];
function sparkles(a, b) {
  for (var i = 0; i < 10; i++) {
    var m = new T.Mesh(sph(0.07, 8, 6), new T.MeshBasicMaterial({ color: 0xFFD95A }));
    scene.add(m); sparks.push({ m: m, a: a, b: b, t: -i * 0.06 });
  }
}
function updateSparks(dt) {
  for (var i = sparks.length - 1; i >= 0; i--) {
    var s = sparks[i]; s.t += dt; var k = Math.max(0, Math.min(1, s.t / 1.1));
    var P = s.a.root.position, Q = s.b.root.position;
    s.m.position.set(lerp(P.x, Q.x, k), 2.2 + Math.sin(k * Math.PI) * 2.2, lerp(P.z, Q.z, k));
    s.m.visible = s.t > 0;
    if (k >= 1) { scene.remove(s.m); sparks.splice(i, 1); }
  }
}

/* ===================== Điều khiển ===================== */
var walkDir = 0, keys = {};
function holdBtn(el, d) {
  var on = function (e) { e.preventDefault(); walkDir = d; el.classList.add('on'); if (el.setPointerCapture && e.pointerId != null) { try { el.setPointerCapture(e.pointerId); } catch (x) { /* bỏ qua */ } } };
  var off = function () { if (walkDir === d) walkDir = 0; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
}
holdBtn($('wl'), -1); holdBtn($('wr'), 1);
addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') keys.l = 1; if (e.key === 'ArrowRight') keys.r = 1; });
addEventListener('keyup', function (e) { if (e.key === 'ArrowLeft') keys.l = 0; if (e.key === 'ArrowRight') keys.r = 0; });
addEventListener('blur', function () { walkDir = 0; keys = {}; });

var ray = new T.Raycaster(), ndc = new T.Vector2(), downAt = null;
canvas.addEventListener('pointerdown', function (e) { downAt = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', function (e) {
  if (!S.inLake || !downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 12) return;
  var rc = canvas.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  var objs = Object.keys(trash).map(function (i) { return trash[i].obj; });
  var hit = ray.intersectObjects(objs, true)[0];
  if (!hit) return;
  var o = hit.object; while (o && o.userData.trash === undefined) o = o.parent;
  if (!o) return;
  if (o.position.distanceTo(me.root.position) > 5.5) { toast('Đi lại gần hơn để nhặt', 'Giữ mũi tên để đi tới chỗ có rác.'); return; }
  if (me.act === 'pick') return;
  walkDir = 0; act(me, 'pick'); send({ t: 'act', n: 'pick' });
  faceTo(me, o.position.x - me.root.position.x, o.position.z - me.root.position.z, 1);
  var i = o.userData.trash;
  setTimeout(function () { if (Net.isHost) hostPick(i, Net.id); else send({ t: 'pick', i: i, to: Net.hostId }); }, 500);
});

/* ===================== Cảnh hoạt động: gõ mõ trong chánh điện, thiền bên hồ ===================== */
var VIEW = 'lake';
/* ---- chánh điện ---- */
var hall = new T.Scene();
hall.background = new T.Color('#5E241A'); hall.fog = new T.Fog(0x5E241A, 9, 22);
hall.add(new T.HemisphereLight(0xFFE2BC, 0x6E3A22, 0.7));
(function buildHall() {
  var hl = new T.PointLight(0xFFC88A, 1.2, 14); hl.position.set(0, 4, 2.5); hl.castShadow = true; hall.add(hl);
  var hl2 = new T.DirectionalLight(0xFFD7A6, 0.5); hl2.position.set(3, 6, 6); hall.add(hl2);
  var floor = mesh(new T.PlaneGeometry(20, 14), M('#8A5A34', { roughness: 0.7 }), false); floor.rotation.x = -Math.PI / 2; hall.add(floor);
  for (var i = -4; i <= 4; i++) { var ln = mesh(new T.BoxGeometry(0.03, 0.005, 14), M('#6E4426'), false); ln.position.set(i * 0.9, 0.003, 0); hall.add(ln); }
  var wall = mesh(new T.PlaneGeometry(20, 9), M('#8E3326'), false); wall.position.set(0, 4.5, -4.2); hall.add(wall);
  var red = M('#9B3B2A'), gold = M('#E3A62E', { metalness: 0.4, roughness: 0.4, emissive: 0x7A4E12, emissiveIntensity: 0.25 });
  [-3.2, 3.2].forEach(function (x) { var c = mesh(cyl(0.22, 0.24, 9, 16), red); c.position.set(x, 4.5, -2.6); hall.add(c); });
  var altar = mesh(new T.BoxGeometry(3.6, 1.1, 1.2), M('#7A2A1C')); altar.position.set(0, 0.55, -3.4); hall.add(altar);
  var top = mesh(new T.BoxGeometry(3.9, 0.12, 1.4), M('#C98A3A')); top.position.set(0, 1.12, -3.4); hall.add(top);
  var halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex('rgba(255,226,150,1)'), transparent: true, depthWrite: false })); halo.scale.set(4, 4, 1); halo.position.set(0, 2.6, -3.6); hall.add(halo);
  var lot = new T.Group(); lot.position.set(0, 1.6, -3.5); hall.add(lot);
  for (var k = 0; k < 8; k++) { var a = k / 8 * Math.PI * 2; var pt = mesh(new T.ConeGeometry(0.16, 0.6, 8), gold, false); pt.position.set(Math.cos(a) * 0.18, 0.3, Math.sin(a) * 0.18 * 0.6); pt.rotation.z = -Math.cos(a) * 0.5; pt.rotation.x = Math.sin(a) * 0.3; lot.add(pt); }
  var bud = mesh(new T.ConeGeometry(0.14, 0.8, 10), gold, false); bud.position.y = 0.5; lot.add(bud);
  [-1.25, 1.25].forEach(function (x) { var cd = mesh(cyl(0.07, 0.07, 0.5, 10), M('#D9442B')); cd.position.set(x, 1.43, -3.2); hall.add(cd); var fl = new T.Sprite(new T.SpriteMaterial({ map: glowTex('rgba(255,190,90,1)'), transparent: true, depthWrite: false })); fl.scale.setScalar(0.5); fl.position.set(x, 1.78, -3.2); hall.add(fl); });
  var bowl = mesh(cyl(0.3, 0.22, 0.26, 16), M('#B88A3A', { metalness: 0.5, roughness: 0.4 })); bowl.position.set(0, 1.31, -2.95); hall.add(bowl);
  [-2.2, 2.2].forEach(function (x) { var l = mesh(sph(0.32, 14, 10), M('#E8642F', { emissive: 0xFF8A3A, emissiveIntensity: 0.9 }), false); l.scale.y = 1.3; l.position.set(x, 3.3, -1.8); hall.add(l); var g = new T.Sprite(new T.SpriteMaterial({ map: glowTex('rgba(255,150,80,1)'), transparent: true, depthWrite: false })); g.scale.setScalar(1.8); g.position.copy(l.position); hall.add(g); });
  var boDoan = mesh(cyl(0.7, 0.75, 0.22, 28), M('#E3A62E')); boDoan.position.set(-0.35, 0.11, 0.6); hall.add(boDoan);
})();
// Mõ chùa theo ảnh mõ gỗ mít: thân tròn dẹt đáy phẳng, sơn nâu đỏ bóng, miệng mõ là khe ngang sâu hai đầu khoét tròn,
// quai là hai đầu cá chụm vào nhau ngậm viên ngọc, vảy chạm chìm cùng màu gỗ; kê trên gối tròn đỏ viền vàng.
var mo = new T.Group(); hall.add(mo);
var moCush = new T.Group(); mo.add(moCush);
(function () {
  var cb = mesh(cyl(0.44, 0.46, 1, 32), M('#9E2318', { roughness: 0.8 })); cb.position.y = 0.5; moCush.add(cb);
  var ct = mesh(new T.SphereGeometry(0.44, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#A8281C', { roughness: 0.8 })); ct.scale.y = 0.06; ct.position.y = 1; moCush.add(ct);
  var cr = mesh(new T.TorusGeometry(0.45, 0.02, 8, 40), M('#D9A02A', { metalness: 0.5, roughness: 0.4 })); cr.rotation.x = Math.PI / 2; cr.position.y = 1; moCush.add(cr);
  [0.8, 2.4, 3.9, 5.5].forEach(function (a) { var ts = mesh(new T.ConeGeometry(0.035, 0.14, 8), M('#D9A02A'), false); ts.position.set(Math.cos(a) * 0.47, 0.2, Math.sin(a) * 0.47); moCush.add(ts); });
})();
var BODY_H = 0.5, BODY_R = 0.42, MS = 0.75;
var moBody = new T.Group(); mo.add(moBody);
function moR(y) { var t = Math.min(1, Math.max(0, y / BODY_H)); if (t < 0.42) return BODY_R * (0.72 + 0.28 * Math.sin(t / 0.42 * Math.PI / 2)); var u = (t - 0.42) / 0.58; return BODY_R * Math.sqrt(Math.max(0, 1 - u * u)); }
(function buildMo() {
  var lacquer = M('#7E3318', { roughness: 0.3, metalness: 0.05 }), carve = M('#5C220E', { roughness: 0.45 }), goldM = M('#D9A02A', { metalness: 0.6, roughness: 0.35 }), dark = new T.MeshBasicMaterial({ color: 0x140804 });
  var MOUTH_Y = BODY_H * 0.36, MOUTH_ARC = 2.5;
  var pts = [new T.Vector2(0.001, 0)];
  for (var i = 0; i <= 30; i++) { var y = i / 30 * BODY_H; pts.push(new T.Vector2(Math.max(0.001, moR(y)), y)); }
  moBody.add(mesh(new T.LatheGeometry(pts, 48), lacquer));
  var rm = moR(MOUTH_Y);
  var slot = mesh(new T.TorusGeometry(rm * 0.97, 0.03, 10, 48, MOUTH_ARC), dark, false); slot.rotation.set(Math.PI / 2, 0, Math.PI / 2 - MOUTH_ARC / 2); slot.position.y = MOUTH_Y; moBody.add(slot);
  [[0.042, 0.016], [-0.04, 0.014]].forEach(function (d) {
    var yy = MOUTH_Y + d[0], lip = mesh(new T.TorusGeometry(moR(yy) * 0.995, d[1], 8, 48, MOUTH_ARC - 0.1), lacquer, false);
    lip.rotation.set(Math.PI / 2, 0, Math.PI / 2 - (MOUTH_ARC - 0.1) / 2); lip.position.y = yy; moBody.add(lip);
  });
  [-1, 1].forEach(function (sd) {
    var a = Math.PI / 2 + sd * MOUTH_ARC / 2, pos = new T.Vector3(Math.cos(a) * rm * 0.96, MOUTH_Y, Math.sin(a) * rm * 0.96);
    var hole = mesh(sph(0.055, 14, 10), dark, false); hole.position.copy(pos); moBody.add(hole);
    var rim = mesh(new T.TorusGeometry(0.06, 0.014, 8, 20), lacquer, false); rim.position.copy(pos).multiplyScalar(1.02); rim.lookAt(pos.clone().multiplyScalar(3)); moBody.add(rim);
  });
  for (var row = 0; row < 3; row++) for (var k = 0; k < 16; k++) {
    var a2 = (k + (row % 2) * 0.5) / 16 * Math.PI * 2, y2 = BODY_H * (0.58 + row * 0.11), r2 = moR(y2);
    var sc = mesh(new T.TorusGeometry(0.04, 0.007, 5, 12, Math.PI), carve, false);
    var pp = new T.Vector3(Math.cos(a2) * r2, y2, Math.sin(a2) * r2); sc.position.copy(pp); sc.lookAt(pp.clone().multiplyScalar(2)); sc.rotateZ(Math.PI); moBody.add(sc);
  }
  var band = mesh(new T.TorusGeometry(moR(0.03), 0.01, 6, 40), carve, false); band.rotation.x = Math.PI / 2; band.position.y = 0.03; moBody.add(band);
  [-1, 1].forEach(function (sd) {
    var nk = mesh(cyl(0.045, 0.06, 0.12, 12), lacquer); nk.position.set(0.1 * sd, BODY_H + 0.02, 0); nk.rotation.z = 0.55 * sd; moBody.add(nk);
    var hd = mesh(sph(0.06, 14, 12), lacquer); hd.scale.set(1.35, 0.85, 0.85); hd.position.set(0.065 * sd, BODY_H + 0.1, 0); hd.rotation.z = -0.35 * sd; moBody.add(hd);
    [-1, 1].forEach(function (s2) { var e = mesh(sph(0.012, 6, 5), carve, false); e.position.set(0.075 * sd, BODY_H + 0.125, 0.045 * s2); moBody.add(e); });
  });
  var pearl = mesh(sph(0.03, 12, 10), goldM, false); pearl.position.set(0, BODY_H + 0.105, 0); moBody.add(pearl);
})();
moBody.scale.setScalar(MS);
var HALL_CAM = { p: new T.Vector3(-2.3, 2.3, 6.2), l: new T.Vector3(-0.1, 0.75, 1.2) };
var MO = { hitAt: -1e9, monk: null, key: '', run: false };
function moPose(now) {
  var p = P_cross(); p.sp = 0.12; p.hd = 0.2;
  p.lsx = -0.55; p.lsz = -0.32; p.lel = -0.95; p.lc = 0.25;          // tay trái đặt lên đùi
  var since = (now - MO.hitAt) / 1000, sw;
  // dùi nhấc lên chờ nhịp rồi gõ xuống trong 0.08s, bật lên lại
  if (since < 0.08) sw = since / 0.08; else if (since < 0.35) sw = 1 - (since - 0.08) / 0.27; else sw = 0;
  p.rsx = lerp(-1.05, -1.0, sw); p.rsz = 0.1; p.rsy = 0; p.rel = lerp(-1.1, -0.3, sw); p.rwx = 0; p.rwy = 0; p.rwz = 0; p.rc = 1.0;
  return p;
}
// dựng người ngồi gõ mõ theo trang phục hiện tại; dùi nối thẳng theo cẳng tay, mõ đặt đúng dưới đầu dùi lúc gõ
function moEnter() {
  var lk = JSON.parse(JSON.stringify(S.look)); lk.hand = 'none';
  var key = chibi.keyOf(lk);
  if (!MO.monk || MO.key !== key) {
    if (MO.monk) hall.remove(MO.monk.root);
    var m = chibi(lk); MO.monk = m; MO.key = key; hall.add(m.root);
    m.root.position.set(-0.35, 0.2, 0.6); m.root.rotation.y = 0.55;
    var mal = new T.Group(); m.AR.H.g.add(mal);
    var ML = 0.46;
    var st = mesh(cyl(0.017, 0.02, ML + 0.06, 8), stickM); st.position.y = -0.06 - ML / 2 + 0.03; mal.add(st);
    var kn = mesh(sph(0.068, 14, 12), M('#C9A06A', { roughness: 0.9 })); kn.scale.set(1, 1.15, 1); kn.position.y = -0.06 - ML; mal.add(kn);
    MO.hitAt = performance.now() - 80; setPose(m, moPose(performance.now()), null); m.root.updateMatrixWorld(true);
    var k = kn.getWorldPosition(new T.Vector3());
    var fwd = new T.Vector3(0, 0, 1).applyQuaternion(m.root.quaternion); fwd.y = 0; fwd.normalize();
    var off = 0.14, rLocal = off / MS, yLocal = BODY_H * 0.42;
    for (var y = BODY_H; y > 0; y -= 0.005) if (moR(y) >= rLocal) { yLocal = y; break; }
    var bottom = Math.max(0.04, k.y - 0.066 - yLocal * MS);
    mo.position.set(k.x, 0, k.z).addScaledVector(fwd, off);
    moBody.position.y = bottom; moCush.scale.set(MS, bottom, MS);
    moBody.rotation.y = Math.atan2(HALL_CAM.p.x - mo.position.x, HALL_CAM.p.z - mo.position.z) - Math.PI / 2 + 0.35;
    MO.hitAt = -1e9;
  }
}
function moStrike() {
  var now = performance.now(); MO.hitAt = now;
  setTimeout(function () { moBody.scale.set(1.04 * MS, 0.94 * MS, 1.04 * MS); }, 80);
  setTimeout(function () { moBody.scale.setScalar(MS); }, 220);
}
function moUpdate(dt) {
  if (!MO.monk) moEnter();
  setPose(MO.monk, moPose(performance.now()), dt, 30);
  closeEyes(MO.monk, MO.run);
  camera.position.copy(HALL_CAM.p); camera.lookAt(HALL_CAM.l);
}
function moScreen() {
  var c = new T.Vector3(); moBody.getWorldPosition(c); c.y += BODY_H * 0.5 * MS;
  var e = c.clone().add(new T.Vector3((BODY_R + 0.04) * MS, 0, 0));
  var a = c.clone().project(camera), b = e.clone().project(camera);
  var W = innerWidth, Hh = innerHeight;
  var ax = (a.x + 1) / 2 * W, ay = (1 - a.y) / 2 * Hh, bx = (b.x + 1) / 2 * W, by = (1 - b.y) / 2 * Hh;
  return { x: ax, y: ay, r: Math.hypot(ax - bx, ay - by) * 1.05 };
}

/* ---- thiền bên hồ lúc đêm: dùng chính cảnh hồ, ngồi trên tảng đá sát mép nước ---- */
var SKY_DAY = scene.background, SKY_NIGHT = gradTex([[0, '#1D2E44'], [0.5, '#3E5470'], [0.82, '#8E7F86'], [1, '#C9A890']]);
var ZEN = { a: 0, t: 0, ch: null, key: '' };
var zenG = new T.Group(); zenG.visible = false; scene.add(zenG);
var zenRock = mesh(new T.CylinderGeometry(0.85, 1.0, 0.35, 12), M('#A9A395')); zenG.add(zenRock);
var zenCush = mesh(new T.CylinderGeometry(0.62, 0.62, 0.14, 24), M('#E295AD')); zenG.add(zenCush);
var ffTex = glowTex('rgba(255,236,150,1)'), flies = [];
for (var fI = 0; fI < 26; fI++) { var spf = new T.Sprite(new T.SpriteMaterial({ map: ffTex, transparent: true, depthWrite: false })); spf.scale.setScalar(0.35); zenG.add(spf); flies.push({ s: spf, da: (Math.random() - 0.5) * 0.5, r: R_OUT - 2 + Math.random() * 6, y: 0.4 + Math.random() * 2.2, p: Math.random() * 6 }); }
var hoaDang = [];
for (var hI = 0; hI < 6; hI++) {
  var hg = new T.Group(); hg.add(mesh(cyl(0.35, 0.35, 0.06, 12), M('#6FA864'), false));
  var lf = mesh(new T.ConeGeometry(0.22, 0.4, 8), M('#F7C6D4', { emissive: 0xFFB070, emissiveIntensity: 0.55 }), false); lf.position.y = 0.2; hg.add(lf);
  var gl2 = new T.Sprite(new T.SpriteMaterial({ map: glowTex('rgba(255,190,110,1)'), transparent: true, depthWrite: false })); gl2.scale.setScalar(1.6); gl2.position.y = 0.35; hg.add(gl2);
  zenG.add(hg); hoaDang.push({ g: hg, da: -0.25 + hI * 0.1, r: R_IN + 3 + (hI % 3) * 2.5 });
}
var moon = new T.Sprite(new T.SpriteMaterial({ map: glowTex('rgba(255,248,225,1)'), transparent: true, depthWrite: false, fog: false })); moon.scale.setScalar(14); zenG.add(moon);
var zenHalo = new T.Sprite(new T.SpriteMaterial({ map: glowTex('rgba(255,236,190,1)'), transparent: true, depthWrite: false, opacity: 0.6 })); zenHalo.scale.setScalar(3); zenG.add(zenHalo);
var zenLight = new T.PointLight(0xFFE7C2, 0.9, 8); zenG.add(zenLight);
var hemi = null; scene.children.forEach(function (o) { if (o.isHemisphereLight) hemi = o; });
function setNight(on) {
  scene.background = on ? SKY_NIGHT : SKY_DAY; scene.fog.color.set(on ? 0x2E3E55 : 0xF3DCC0);
  if (hemi) { hemi.intensity = on ? 0.35 : 0.75; hemi.color.set(on ? 0x9DB4D6 : 0xFFE9CF); }
  sun.intensity = on ? 0.25 : 1.05; sun.color.set(on ? 0xA9C0FF : 0xFFD7A6);
  PAG_LAMPS.forEach(function (l) { l.emissiveIntensity = on ? 1.6 : 0.9; });
  zenG.visible = on;
}
function zenEnter() {
  ZEN.a = me ? me.angle + 0.12 : 0.6; ZEN.t = 0;
  var lk = JSON.parse(JSON.stringify(S.look)); lk.hand = 'none';
  if (ZEN.ch) zenG.remove(ZEN.ch.root);
  ZEN.ch = chibi(lk); zenG.add(ZEN.ch.root);
  var a = ZEN.a, r = R_OUT + 0.9;
  zenRock.position.set(Math.cos(a) * r, 0.17, Math.sin(a) * r); zenCush.position.set(Math.cos(a) * r, 0.41, Math.sin(a) * r);
  ZEN.spot = new T.Vector3(Math.cos(a) * r, 0.48, Math.sin(a) * r);
  ZEN.ch.root.position.copy(ZEN.spot); ZEN.ch.root.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
  setNight(true); if (me) me.root.visible = false;
}
function zenExit() { setNight(false); if (me) me.root.visible = true; }
function zenUpdate(dt) {
  ZEN.t += dt;
  var ph = ZEN.t % 10, br = ph < 4 ? ease(ph / 4) : 1 - ease((ph - 4) / 6);
  var p = P_zen(); p.breath = br; p.sp = 0.04 - 0.03 * br; p.hd = 0.14 - 0.04 * br;
  setPose(ZEN.ch, p, dt); closeEyes(ZEN.ch, true);
  var a = ZEN.a, spot = ZEN.spot;
  var side = new T.Vector3(-Math.sin(a), 0, Math.cos(a)), fwd = new T.Vector3(-Math.cos(a), 0, -Math.sin(a)), back = fwd.clone().negate();
  zenHalo.position.copy(spot).addScaledVector(back, 0.4); zenHalo.position.y = 1.25; zenHalo.scale.setScalar(2.4 + br * 1.1); zenHalo.material.opacity = 0.35 + br * 0.35;
  zenLight.position.copy(spot).addScaledVector(fwd, 2.2); zenLight.position.y = 2.4;
  flies.forEach(function (f, i) { var aa = a + f.da + Math.sin(ZEN.t * 0.2 + f.p) * 0.02; f.s.position.set(Math.cos(aa) * (f.r + Math.sin(ZEN.t * 0.5 + i) * 0.3), f.y + Math.sin(ZEN.t * 0.9 + f.p) * 0.25, Math.sin(aa) * (f.r + Math.cos(ZEN.t * 0.4 + i) * 0.3)); f.s.material.opacity = 0.4 + 0.6 * Math.abs(Math.sin(ZEN.t * 1.3 + f.p)); });
  hoaDang.forEach(function (h, i) { var aa = a + h.da + ZEN.t * 0.004; h.g.position.set(Math.cos(aa) * h.r, WATER_Y + 0.05 + Math.sin(ZEN.t + i) * 0.03, Math.sin(aa) * h.r); });
  var camP = spot.clone().addScaledVector(fwd, 5.4).addScaledVector(side, 4.2); camP.y = 2.0;
  var lk = spot.clone().addScaledVector(fwd, -0.4).addScaledVector(side, -1.6); lk.y = 1.2;
  camera.position.copy(camP); camera.lookAt(lk);
  moon.position.copy(spot).addScaledVector(fwd, -60).addScaledVector(side, -25); moon.position.y = 28;
  sun.position.set(spot.x - 30, 40, spot.z + 22); sun.target.position.copy(spot);
  return ph < 4 ? 'Hít vào' : 'Thở ra';
}
function setView(v) {
  if (VIEW === 'zen' && v !== 'zen') zenExit();
  if (v === 'zen' && VIEW !== 'zen') zenEnter();
  if (v === 'hall') moEnter();
  VIEW = v;
  var lakeUi = v === 'lake';
  labelsEl.style.visibility = lakeUi ? '' : 'hidden';
  $('hud').style.visibility = lakeUi ? '' : 'hidden';
  $('hintL').style.visibility = $('hintR').style.visibility = lakeUi ? '' : 'hidden';
}

/* ===================== Vòng lặp ===================== */
function resize() {
  var w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w < h ? 58 : 46; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
var camPos = new T.Vector3(), camLook = new T.Vector3(), camInit = false, clock = new T.Clock(), time = 0, v3 = new T.Vector3();
function project(c, y) {
  v3.copy(c.root.position); v3.y = y; v3.project(camera);
  return { x: (v3.x + 1) / 2 * innerWidth, y: (1 - v3.y) / 2 * innerHeight, z: v3.z, nx: v3.x, ny: v3.y };
}
function stepChar(c, dt, idx) {
  if (c.act) { c.actT += dt; if (c.actT > (ACT_LEN[c.act] || 2.6)) c.act = null; }
  applyPose(c, dt, time + idx);
}
function frame() {
  var dt = Math.min(0.05, clock.getDelta()); time += dt;
  WATER.color.setHSL(0.51, 0.33, 0.53 + 0.012 * Math.sin(time * 0.8));
  if (S.inLake && me) {
    var dir = walkDir || (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    if (me.act === 'release' || me.act === 'pick') dir = 0;
    me.speed += ((dir ? 2.6 : 0) - me.speed) * (1 - Math.exp(-dt * 8));
    if (dir) me.dirSign = dir;
    if (me.speed > 0.01) { me.angle -= me.dirSign * me.speed / R_WALK * dt; me.walkP += dt * me.speed * 3.3; }
    placeOnPath(me);
    if (me.speed > 0.15) faceWalk(me, dt); else if (me.act !== 'pick') faceWater(me, dt);
    stepChar(me, dt, 0);
    // gửi vị trí 10 lần mỗi giây
    Net.lastSt += dt;
    if (Net.lastSt > 0.1) { Net.lastSt = 0; send({ t: 'st', a: +me.angle.toFixed(4), v: +me.speed.toFixed(2), d: me.dirSign }); }

    Object.keys(remotes).forEach(function (id, idx) {
      var r = remotes[id];
      var diff = Math.atan2(Math.sin(r.netA - r.angle), Math.cos(r.netA - r.angle));
      r.angle += diff * (1 - Math.exp(-dt * 10));
      r.speed += (r.netV - r.speed) * (1 - Math.exp(-dt * 8));
      if (r.speed > 0.01) r.walkP += dt * r.speed * 3.3;
      placeOnPath(r);
      if (r.speed > 0.15) faceWalk(r, dt); else if (r.act !== 'pick') faceWater(r, dt);
      stepChar(r, dt, idx + 1);
    });
    updateFish(dt); updateSparks(dt);
    if (S.ev) { S.ev.t += dt; if (S.ev.t > 6 || (S.ev.done && S.ev.t > S.ev.doneAt + 1.4)) { S.ev = null; renderHUD(); } }
    Object.keys(trash).forEach(function (i) { var t = trash[i]; t.obj.userData.glint.material.color.setHSL(0.13, 1, 0.75 + 0.2 * Math.sin(time * 5 + t.obj.position.x)); });

    var out = new T.Vector3(Math.cos(me.angle), 0, Math.sin(me.angle));
    var wantPos = me.root.position.clone().addScaledVector(out, 7.2); wantPos.y = 4.4;
    var wantLook = me.root.position.clone().addScaledVector(out, -6); wantLook.y = 1.5;
    if (me.act === 'release') {
      // lúc thả cá: máy quay hạ thấp, đặt ngang bên cạnh nhân vật nhìn dọc bờ
      var rt = me.actT, rw = seg(rt, 0.3, 1.6) * (1 - seg(rt, 8.2, 9.4));
      var spot = new T.Vector3(Math.cos(me.angle) * (R_OUT + 0.36), 0, Math.sin(me.angle) * (R_OUT + 0.36));
      var fw = new T.Vector3(-Math.cos(me.angle), 0, -Math.sin(me.angle)), sd = new T.Vector3(-Math.sin(me.angle), 0, Math.cos(me.angle));
      var cp = spot.clone().addScaledVector(sd, 6.8).addScaledVector(fw, 1.3); cp.y = 1.6;
      var cl = spot.clone().addScaledVector(fw, 0.45); cl.y = 0.2;   // nhân vật nằm phía trên bảng điều khiển
      wantPos.lerp(cp, rw); wantLook.lerp(cl, rw);
    }
    if (!camInit) { camPos.copy(wantPos); camLook.copy(wantLook); camInit = true; }
    var kc = 1 - Math.exp(-dt * 4); camPos.lerp(wantPos, kc); camLook.lerp(wantLook, kc);
    camera.position.copy(camPos); camera.lookAt(camLook);
    sun.position.set(me.root.position.x - 40, 48, me.root.position.z + 30); sun.target.position.copy(me.root.position);
  } else {
    // sảnh: camera bay chậm quanh hồ làm nền
    var ca = time * 0.05;
    camera.position.set(Math.cos(ca) * 40, 16, Math.sin(ca) * 40); camera.lookAt(0, 2, 0);
    sun.position.set(-40, 48, 30); sun.target.position.set(0, 0, 0);
  }
  if (VIEW === 'hall') { moUpdate(dt); renderer.render(hall, camera); }
  else if (VIEW === 'zen') { if (S.inLake || ZEN.ch) { HAL.zenText = zenUpdate(dt); } renderer.render(scene, camera); }
  else if (!(window.HAL && HAL.covered)) renderer.render(scene, camera);

  if (S.inLake && me) {
    Object.keys(remotes).forEach(function (id) {
      var r = remotes[id], p = project(r, 2.55);
      var vis = p.z < 1 && Math.abs(p.nx) < 1.05 && Math.abs(p.ny) < 1.05 && r.root.position.distanceTo(me.root.position) < 26;
      r.tag.hidden = !vis;
      if (vis) { r.tag.style.left = p.x + 'px'; r.tag.style.top = p.y + 'px'; r.bub.style.left = p.x + 'px'; r.bub.style.top = (p.y - 26) + 'px'; }
      else r.bub.hidden = true;
      r.tag.className = 'tag' + (S.ev && S.ev.c === r && !S.ev.done ? ' rel' : '');
    });
    var mp = project(me, 2.8); myBub.style.left = mp.x + 'px'; myBub.style.top = mp.y + 'px';
    var hl = $('hintL'), hr = $('hintR'); hl.hidden = hr.hidden = true; relBub.hidden = true;
    if (S.ev && !S.ev.done) {
      var c = S.ev.c, p2 = project(c, 2.55);
      var seen = p2.z < 1 && Math.abs(p2.nx) < 0.95 && Math.abs(p2.ny) < 0.95 && c.root.position.distanceTo(me.root.position) < 24;
      if (seen !== S.ev.seen) { S.ev.seen = seen; renderHUD(); }
      if (seen) { relBub.hidden = false; relBub.textContent = c.name + ' vừa thả cá'; relBub.style.left = p2.x + 'px'; relBub.style.top = (p2.y - 26) + 'px'; }
      else {
        var cam = c.root.position.clone().applyMatrix4(camera.matrixWorldInverse);
        var el = cam.x >= 0 ? hr : hl; el.hidden = false;
        el.textContent = cam.x >= 0 ? c.name + ' đang thả cá ›' : '‹ ' + c.name + ' đang thả cá';
      }
    }
    if (me.act === null && $('go').disabled && !S.returning && (S.turns > 0 || S.phuoc >= 100)) renderHUD();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function makePreview(cv) {
  var r2 = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r2.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  var sc2 = new T.Scene();
  sc2.add(new T.HemisphereLight(0xFFF1DE, 0x8AA88A, 0.9));
  var dl = new T.DirectionalLight(0xFFE2BC, 0.8); dl.position.set(3, 6, 5); sc2.add(dl);
  var ped = mesh(cyl(1.25, 1.35, 0.22, 40), M('#F4B6C8'), false); ped.position.y = -0.11; sc2.add(ped);
  var ped2 = mesh(cyl(1.05, 1.05, 0.03, 40), M('#F2C14E'), false); ped2.position.y = 0.01; sc2.add(ped2);
  var cam2 = new T.PerspectiveCamera(32, 1, 0.1, 50); cam2.position.set(0, 1.75, 6.6); cam2.lookAt(0, 1.3, 0);
  var ch = null, alive = true, last = performance.now(), tt = 0, spin = 0;
  function set(look) { if (ch) sc2.remove(ch.root); ch = chibi(look); sc2.add(ch.root); }
  function size() { var w = cv.clientWidth || 300, h = cv.clientHeight || 300; r2.setSize(w, h, false); cam2.aspect = w / h; cam2.updateProjectionMatrix(); }
  function loop(now) {
    if (!alive) return;
    var d = Math.min(0.05, (now - last) / 1000); last = now; tt += d;
    if (ch) { spin += d * 0.35; ch.root.rotation.y = Math.sin(spin) * 0.6; applyPose(ch, d, tt); }
    size(); r2.render(sc2, cam2);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return {
    set: set,
    wave: function (n) { if (ch) act(ch, n); },
    stop: function () { alive = false; r2.dispose(); }
  };
}

window.HAL = {
  S: S, store: store, ROBES: ROBES, HAIRS: HAIRS, ACCS: ACCS, FISH: FISH, UNLOCK_ALL_FISH: UNLOCK_ALL_FISH,
  fishOf: fishOf, needMet: needMet, today: today,
  addPhuoc: addPhuoc, saveTurns: saveTurns, saveLook: saveLook, saveProg: saveProg, renderHUD: renderHUD, toast: toast,
  applyLook: function () { saveLook(); if (S.inLake) { spawnMe(); send(helloMsg()); } renderRobes(); },
  setFish: function (k) { S.fishK = k; store.set('fishK', k); renderHUD(); },
  makePreview: makePreview,
  view: setView,
  mo: { strike: moStrike, screen: moScreen, run: function (b) { MO.run = !!b; } },
  zenText: 'Hít vào',
  covered: false
};
})();

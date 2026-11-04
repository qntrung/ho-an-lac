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
var Q = A3.Quality, lin = A3.lin, mixC = A3.mixC, sstep = A3.sstep, MX = A3.MX, Parts = A3.Parts, VC = A3.VC, disposeTree = A3.disposeTree;
var canvas = $('stage');
var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Q.pixelRatio());
renderer.outputEncoding = T.sRGBEncoding;           // màu viết bằng hex sRGB, đổi sang linear khi tạo vật liệu (lin)
renderer.shadowMap.enabled = !Q.low;
renderer.shadowMap.type = T.PCFSoftShadowMap;
var scene = new T.Scene();
function gradTex(stops) {
  var c = document.createElement('canvas'); c.width = 2; c.height = 256; var x = c.getContext('2d'); var g = x.createLinearGradient(0, 0, 0, 256);
  stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); x.fillStyle = g; x.fillRect(0, 0, 2, 256); return A3.canvasTex(c);
}
function glowTex(col) {
  var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d');
  var g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return A3.canvasTex(c);
}
scene.background = gradTex([[0, '#A9D6E8'], [0.5, '#D9ECEC'], [0.78, '#F8EBD9'], [1, '#F6E2CC']]);
scene.fog = new T.Fog(lin('#F3E6D6'), 60, 175);
var ENV_DAY = A3.makeEnv(renderer), ENV_NIGHT = null;
scene.environment = ENV_DAY;
var camera = new T.PerspectiveCamera(50, 1, 0.1, 400);
// trời xanh nhạt + đất cỏ, cộng nắng ấm đổ bóng mềm; phần lớn ánh sáng nền đến từ môi trường (ENV_DAY)
var hemi = new T.HemisphereLight(lin('#FFF3E3'), lin('#A9C98F'), 0.32); scene.add(hemi);
var sun = new T.DirectionalLight(lin('#FFE3C0'), 0.85);
sun.castShadow = !Q.low; sun.shadow.mapSize.set(1024, 1024);
// khung bóng hẹp bám theo nhân vật để bóng nét (cập nhật trong frame)
(function (sc) { sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 140; })(sun.shadow.camera);
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
scene.add(sun); scene.add(sun.target);

// vật liệu thường: màu hex sRGB -> linear; vật liệu có userData.shared không bị disposeTree giải phóng
function M(c, o) {
  o = Object.assign({}, o || {});
  if (o.emissive !== undefined) o.emissive = lin(o.emissive);
  return new T.MeshStandardMaterial(Object.assign({ color: lin(c), roughness: 0.85, metalness: 0, envMapIntensity: 0.5 }, o));
}
function shared(m) { m.userData.shared = true; return m; }
function mesh(geo, mat, cast) { var m = new T.Mesh(geo, mat); m.castShadow = cast !== false; m.receiveShadow = true; return m; }
function cyl(rt, rb, h, s) { return new T.CylinderGeometry(rt, rb, h, s || 14); }
function sph(r, w, h) { return new T.SphereGeometry(r, w || 18, h || 14); }

var PAG_LAMPS = [], LANTERN_GLOWS = [];
var R_IN = 12.8, R_OUT = 24, R_WALK = 26.6, WATER_Y = -0.07;
var WORLD = {};
// đổi cờ chất lượng lúc đang chạy: bật/tắt bóng và độ nét
Q.onChange(function (low) {
  renderer.setPixelRatio(Q.pixelRatio()); renderer.shadowMap.enabled = !low; sun.castShadow = !low;
  if (typeof resize === 'function') resize();
  [scene, typeof hall !== 'undefined' ? hall : null].forEach(function (sc) { if (sc) sc.traverse(function (o) { [].concat(o.material || []).forEach(function (m) { m.needsUpdate = true; }); }); });
});
(function buildWorld() {
  var rnd = A3.rng(7), i, a, k;
  var shadeY = A3.shadeY, lathe = A3.lathe, capsule = A3.capsule, rockGeo = A3.rockGeo;

  /* ---- mặt đất: bờ đất ướt -> cát -> cỏ, lối đi vòng quanh hồ; một lần vẽ ---- */
  var gp = new Parts();
  var sandC = lin('#EBD9B2'), sandD = lin('#DCC59A'), grass = lin('#A9D190'), grassD = lin('#93C27A'), earth = lin('#C9B088'), pathC = lin('#E6D3AA'), pathD = lin('#D5BF94'), far = lin('#B9D7A0');
  function noise(w) { return 0.5 + 0.5 * Math.sin(w.x * 0.45 + Math.sin(w.z * 0.35) * 2) * Math.sin(w.z * 0.55); }
  function groundCol(l, w) {
    var r = Math.hypot(w.x, w.z), nz = noise(w), g = mixC(grass, grassD, nz * 0.6);
    var c = mixC(earth, mixC(sandC, sandD, nz * 0.4), sstep(R_OUT, R_OUT + 0.45, r));
    c = mixC(c, g, sstep(R_OUT + 1.0, R_OUT + 1.7, r));
    c = mixC(mixC(pathC, pathD, nz * 0.5), c, sstep(0.7, 1.05, Math.abs(r - R_WALK)));
    return mixC(c, far, sstep(45, 95, r));
  }
  var g1 = new T.RingGeometry(R_OUT, R_WALK + 5, 192, 30); g1.rotateX(-Math.PI / 2);
  var g2 = new T.RingGeometry(R_WALK + 5, 170, 128, 14); g2.rotateX(-Math.PI / 2);
  gp.add(g1, groundCol); gp.add(g2, groundCol);

  /* ---- đảo giữa hồ + lòng hồ (nhìn thấy qua nước): một mặt tiện tròn từ tâm ra bờ ---- */
  var ISL_TOP = 0.45, prof = [];
  for (i = 0; i <= 60; i++) {
    var r = i / 60 * R_OUT, y;
    if (r < R_IN - 0.9) y = ISL_TOP;
    else if (r < R_IN + 0.5) y = A3.clamp(ISL_TOP - (r - (R_IN - 0.9)) / 1.4 * (ISL_TOP + 0.45), -0.45, ISL_TOP) ;
    else if (r < R_OUT - 0.7) { var u = (r - R_IN - 0.5) / (R_OUT - R_IN - 1.2); y = -0.45 - 0.5 * Math.sin(u * Math.PI); }
    else y = -0.45 + 0.45 * sstep(R_OUT - 0.7, R_OUT, r);
    prof.push([r, y]);
  }
  var ISL_SHORE = R_IN - 0.9 + (ISL_TOP - WATER_Y) / (ISL_TOP + 0.45) * 1.4;
  var deep = lin('#2F7880'), shallow = lin('#76B3A3'), bankC = lin('#C9B288'), islG = lin('#A6D08E');
  var bed = lathe(prof, 160);
  if (bed.attributes.normal.getY(Math.floor(bed.attributes.normal.count / 2)) < 0) bed = lathe(prof.slice().reverse(), 160);
  gp.add(bed, function (l, w) {
    var r = Math.hypot(w.x, w.z), nz = noise(w);
    if (r < R_IN - 0.9) return mixC(mixC(islG, grassD, nz * 0.5), sandC, sstep(R_IN - 1.6, R_IN - 0.9, r));
    if (w.y > WATER_Y + 0.02) return mixC(sandC, bankC, 0.3);
    var d = mixC(deep, shallow, sstep(-0.9, -0.3, w.y));
    return mixC(d, bankC, sstep(-0.25, -0.05, w.y) * 0.8);
  });
  WORLD.ground = gp.mesh(VC({ roughness: 0.95, envMapIntensity: 0.25 }), false, true); scene.add(WORLD.ground);

  /* ---- nước: đỉnh chuyển động bằng CPU (gợn sóng), trong suốt để thấy đáy; viền bọt ---- */
  var wg = new T.RingGeometry(ISL_SHORE - 0.3, R_OUT + 0.08, 160, 12);
  var wc = [], wp = wg.attributes.position, wDeep = lin('#4AA3AC'), wEdge = lin('#8ED0C8');
  for (i = 0; i < wp.count; i++) {
    var rr = Math.hypot(wp.getX(i), wp.getY(i)), edge = Math.min(rr - ISL_SHORE, R_OUT - rr);
    var cc = mixC(wDeep, wEdge, sstep(3.5, 0.3, edge)); wc.push(cc.r, cc.g, cc.b);
  }
  wg.setAttribute('color', new T.Float32BufferAttribute(wc, 3));
  var water = new T.Mesh(wg, new T.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.5, roughness: 0.07, metalness: 0.05, envMapIntensity: 0.9, depthWrite: false }));
  water.rotation.x = -Math.PI / 2; water.position.y = WATER_Y; water.renderOrder = 10; scene.add(water);
  WORLD.water = water; WORLD.waterBase = Float32Array.from(wp.array);
  WORLD.waterAmp = new Float32Array(wp.count);
  for (i = 0; i < wp.count; i++) { var r2 = Math.hypot(wp.getX(i), wp.getY(i)); WORLD.waterAmp[i] = sstep(0, 1.2, Math.min(r2 - ISL_SHORE, R_OUT - r2)); }
  var fg = new T.RingGeometry(R_OUT - 0.42, R_OUT + 0.02, 160, 1), fg2 = new T.RingGeometry(ISL_SHORE - 0.02, ISL_SHORE + 0.38, 96, 1);
  var fp = new Parts(); fp.add(fg, lin('#FFFFFF')); fp.add(fg2, lin('#FFFFFF'));
  var foam = new T.Mesh(fp.geometry(), new T.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.32, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.y = WATER_Y + 0.03; foam.renderOrder = 11; scene.add(foam); WORLD.foam = foam;

  /* ---- sỏi ven bờ + đá rêu lớn ---- */
  var sp = new Parts();
  var stoneCols = ['#C4BAA9', '#B3A998', '#CCC2B1', '#ADA497'].map(lin), moss = lin('#9CBF84');
  function stoneCol(base) { return shadeY(base, mixC(base, lin('#8E8577'), 0.45), mixC(base, lin('#FFFFFF'), 0.25)); }
  for (i = 0; i < 170; i++) {
    a = i / 170 * Math.PI * 2 + (rnd() - 0.5) * 0.02; var rs = R_OUT - 0.12 + rnd() * 0.3, s = 0.16 + rnd() * 0.18;
    sp.add(rockGeo(i + 3, 9, 6, 0.45), stoneCol(stoneCols[i % 4]), MX([Math.cos(a) * rs, 0.0 + rnd() * 0.04, Math.sin(a) * rs], [0, rnd() * 6, 0], [s * (1 + rnd() * 0.5), s * 0.6, s]));
  }
  for (i = 0; i < 64; i++) {
    a = i / 64 * Math.PI * 2 + rnd() * 0.05; var ri = ISL_SHORE - 0.15 + rnd() * 0.3, s2 = 0.18 + rnd() * 0.2;
    sp.add(rockGeo(i + 400, 9, 6, 0.45), stoneCol(stoneCols[(i + 1) % 4]), MX([Math.cos(a) * ri, WATER_Y + 0.02, Math.sin(a) * ri], [0, rnd() * 6, 0], [s2 * 1.3, s2 * 0.6, s2]));
  }
  function mossy(base) { var f = stoneCol(base); return function (l, w, n) { var c0 = f(l, w, n); return n.y > 0.5 ? mixC(c0, moss, sstep(0.5, 0.9, n.y) * 0.6) : c0; }; }
  // đá lớn: ngoài lối đi (không che rác trên bờ) và vài tảng trên đảo
  [[0.4, 29.4, 0.9], [1.25, 29.0, 0.7], [2.3, 29.8, 1.1], [3.0, 28.9, 0.6], [3.9, 29.6, 0.9], [4.8, 29.2, 0.75], [5.6, 29.9, 1.0], [6.05, 28.8, 0.55],
    [1.0, R_IN - 1.2, 0.8], [2.6, R_IN - 1.0, 0.6], [4.4, R_IN - 1.3, 0.9], [5.5, R_IN - 1.1, 0.55]].forEach(function (b, kk) {
    var y0 = b[1] < R_IN ? ISL_TOP : 0;
    sp.add(rockGeo(100 + kk, 22, 14), mossy(stoneCols[kk % 4]), MX([Math.cos(b[0]) * b[1], y0 + b[2] * 0.25, Math.sin(b[0]) * b[1]], [0, kk, 0], [b[2] * 1.3, b[2] * 0.8, b[2]]));
  });

  /* ---- chùa trên đảo: mái cong, tường kem, cột son; đèn lồng phát sáng tách riêng ---- */
  var pg = new Parts(), PY = ISL_TOP;
  var cream = shade('#F3E7CF'), stoneP = shade('#D2C6AC', 0.4, 0.15), redC = shade('#B5513D'), roofC = shade('#C8604A', 0.4, 0.2), roofD = lin('#9E4434'), goldC = shade('#E8B04A', 0.3, 0.35);
  function shade(hex, d, l) { return A3.shade(hex, d, l); }
  pg.add(new T.BoxGeometry(8.4, 0.35, 8.4), stoneP, MX([0, PY + 0.17, 0]));
  pg.add(new T.BoxGeometry(7.6, 0.3, 7.6), stoneP, MX([0, PY + 0.5, 0]));
  pg.add(new T.BoxGeometry(5, 2.4, 5), cream, MX([0, PY + 1.85, 0]));
  [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]].forEach(function (p) { pg.add(capsule(0.19, 2.3, 14, 4), redC, MX([p[0], PY + 1.85, p[1]])); });
  [[0, 2.51, 0], [0, -2.51, Math.PI], [2.51, 0, Math.PI / 2], [-2.51, 0, -Math.PI / 2]].forEach(function (d) {
    pg.add(new T.BoxGeometry(1.2, 1.7, 0.08), lin('#8A3A28'), MX([d[0], PY + 1.5, d[1]], [0, d[2], 0]));
    pg.add(new T.BoxGeometry(1.36, 0.1, 0.12), lin('#E8B04A'), MX([d[0], PY + 2.38, d[1]], [0, d[2], 0]));
  });
  function roof(w, h, y) {
    // mái bốn góc cong lõm, đuôi mái vểnh ở bốn góc
    var g = lathe([[0.001, -0.14], [w + 0.08, -0.1], [w, 0.05], [w * 0.8, 0.16], [w * 0.52, h * 0.42], [w * 0.26, h * 0.78], [0.001, h]], 4);
    g.rotateY(Math.PI / 4); pg.add(g, roofC, MX([0, y, 0]));
    var e = w * 0.707;
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (s) {
      var ang = Math.atan2(s[0], s[1]);
      var m = new T.Matrix4().makeTranslation(s[0] * e, y + 0.05, s[1] * e).multiply(new T.Matrix4().makeRotationY(ang)).multiply(new T.Matrix4().makeRotationX(0.95));
      pg.add(A3.capsule(0.09, 0.55, 8, 3), roofD, m.multiply(new T.Matrix4().makeTranslation(0, 0.25, 0)));
    });
  }
  roof(4.0, 1.7, PY + 3.1);
  pg.add(new T.BoxGeometry(3, 1.4, 3), cream, MX([0, PY + 4.6, 0]));
  roof(2.6, 1.3, PY + 5.3);
  pg.add(lathe([[0.001, 0], [0.32, 0], [0.28, 0.12], [0.12, 0.2], [0.2, 0.35], [0.06, 0.6], [0.15, 0.72], [0.001, 1.05]], 16), goldC, MX([0, PY + 6.5, 0]));
  scene.add(pg.mesh(VC({ roughness: 0.8 }), true, true));
  var lampM = VC({ roughness: 0.5, emissive: lin("#FF8A3A"), emissiveIntensity: 0.7 }), lp0 = new Parts();
  [[2.9, 2.9], [-2.9, 2.9], [2.9, -2.9], [-2.9, -2.9]].forEach(function (p) {
    lp0.add(sph(0.32, 16, 12), lin('#E8642F'), MX([p[0], PY + 2.4, p[1]], [0, 0, 0], [1, 1.25, 1]));
    lp0.add(cyl(0.16, 0.16, 0.08, 10), lin('#9E4434'), MX([p[0], PY + 2.83, p[1]]));
  });
  scene.add(lp0.mesh(lampM, false, false)); PAG_LAMPS.push(lampM);

  /* ---- cây: tán tròn mượt nhiều khối, bóng giả nướng sẵn; cây bồ đề trên đảo ---- */
  var trunks = new Parts(), leaves = new Parts();
  var bark = lin('#8B7158'), barkD = lin('#6E5A48');
  var greens = ['#8CC08A', '#7FB57E', '#98C890', '#86BA7C'].map(lin);
  function canopyCol(base) { return shadeY(base, mixC(base, lin('#4E7F5A'), 0.55), mixC(base, lin('#E8F5C8'), 0.35)); }
  function tree(x, y0, z, s, seed, res) {
    var r = A3.rng(seed);
    trunks.add(lathe([[0.2, 0], [0.16, 0.4], [0.13, 1.4], [0.1, 2.2], [0.001, 2.25]], 10), shadeY(bark, barkD, bark), MX([x, y0, z], null, s));
    var base = greens[seed % 4], n = res > 12 ? 5 : 3;
    for (var j = 0; j < n; j++) {
      var aa = j / n * Math.PI * 2 + r(), d = j === 0 ? 0 : 0.55 + r() * 0.25, rr3 = j === 0 ? 1.05 : 0.72 + r() * 0.2;
      leaves.add(new T.SphereGeometry(1, res, Math.round(res * 0.65)), canopyCol(base), MX([x + Math.cos(aa) * d * s, y0 + (2.3 + (j === 0 ? 0.55 : r() * 0.5)) * s, z + Math.sin(aa) * d * s], null, [rr3 * s, rr3 * 0.9 * s, rr3 * s]));
    }
  }
  for (i = 1; i < 9; i++) { a = i / 9 * Math.PI * 2 + 0.3; tree(Math.cos(a) * 8.8, ISL_TOP, Math.sin(a) * 8.8, 1.25 + (i % 3) * 0.2, i + 11, 16); }
  // cây vòng ngoài trồng xa lối đi để không che tầm nhìn
  for (i = 0; i < 40; i++) { a = i / 40 * Math.PI * 2 + (i % 3) * 0.05; var ro = 36 + (i % 4) * 4; tree(Math.cos(a) * ro, 0, Math.sin(a) * ro, 1.3 + (i % 5) * 0.2, i + 40, 10); }
  // bụi cây tròn có hoa ở ngoài lối đi
  [0.15, 0.95, 1.7, 2.6, 3.35, 4.1, 4.9, 5.7].forEach(function (ba, kk) {
    var x = Math.cos(ba) * 29.6, z = Math.sin(ba) * 29.6, sz = 0.7 + (kk % 3) * 0.15, base = greens[(kk + 1) % 4];
    for (var j = 0; j < 3; j++) leaves.add(new T.SphereGeometry(1, 12, 8), canopyCol(base), MX([x + (j - 1) * sz * 0.8 * Math.sin(ba), sz * 0.55, z - (j - 1) * sz * 0.8 * Math.cos(ba)], null, [sz, sz * 0.85, sz]));
    for (j = 0; j < 5; j++) leaves.add(new T.SphereGeometry(0.09, 6, 4), lin(kk % 2 ? '#F6B9CB' : '#FFF4E8'), MX([x + (rnd() - 0.5) * sz * 2, sz * (0.9 + rnd() * 0.4), z + (rnd() - 0.5) * sz * 2]));
  });
  (function bodhi() {
    // cây bồ đề: gốc có bạnh, tán rộng, rễ phụ thõng xuống
    var a0 = 0.3, x = Math.cos(a0) * 8.4, z = Math.sin(a0) * 8.4, s = 1.45, y0 = ISL_TOP, bk = A3.rng(91);
    var tg = A3.folds(lathe([[1.15, 0], [0.75, 0.35], [0.58, 1.0], [0.52, 2.2], [0.56, 3.0], [0.3, 3.5], [0.001, 3.6]], 28), 9, function (y) { return 0.14 * (1 - sstep(0, 3.2, y)) + 0.05; });
    trunks.add(tg, shadeY(bark, barkD, mixC(bark, lin('#FFFFFF'), 0.12)), MX([x, y0, z], null, s));
    for (k = 0; k < 6; k++) {
      var ang = k / 6 * Math.PI * 2 + 0.3;
      var m = new T.Matrix4().makeTranslation(x, y0 + 3.0 * s, z).multiply(new T.Matrix4().makeRotationY(ang)).multiply(new T.Matrix4().makeRotationZ(-0.95)).multiply(new T.Matrix4().makeTranslation(0, 0.9 * s, 0)).multiply(new T.Matrix4().makeScale(s, s, s));
      trunks.add(capsule(0.17, 1.8, 8, 3), bark, m);
    }
    for (k = 0; k < 10; k++) {
      var ra = bk() * Math.PI * 2, d = (1.6 + bk() * 1.8) * s, len = (1.6 + bk() * 1.3) * s;
      trunks.add(capsule(0.04, len, 5, 2), mixC(bark, lin('#BBA58A'), 0.4), MX([x + Math.cos(ra) * d, y0 + 4.2 * s - len / 2, z + Math.sin(ra) * d]));
    }
    var base = lin('#7DB27A'), blobs = [[0, 5.6, 0, 2.0]];
    for (k = 0; k < 8; k++) { var b1 = k / 8 * Math.PI * 2; blobs.push([Math.cos(b1) * 2.7, 4.6 + bk() * 0.7, Math.sin(b1) * 2.4, 1.35 + bk() * 0.4]); }
    for (k = 0; k < 4; k++) { var b2 = k / 4 * Math.PI * 2 + 0.6; blobs.push([Math.cos(b2) * 1.4, 6.0 + bk() * 0.5, Math.sin(b2) * 1.3, 1.25 + bk() * 0.3]); }
    blobs.forEach(function (b, j) { leaves.add(new T.SphereGeometry(1, 16, 11), canopyCol(mixC(base, greens[j % 4], 0.4)), MX([x + b[0] * s, y0 + b[1] * s, z + b[2] * s], null, [b[3] * s, b[3] * 0.82 * s, b[3] * s])); });
  })();
  scene.add(trunks.mesh(VC({ roughness: 0.9 }), true, true));
  scene.add(leaves.mesh(VC({ roughness: 0.85, envMapIntensity: 0.4 }), true, true));

  /* ---- đèn đá ngoài lối đi, lõi đèn phát sáng ấm ---- */
  var ls = new Parts(), lg = new Parts(), stone = lin('#D2C9B8');
  var stC = shadeY(stone, mixC(stone, lin('#8F877A'), 0.45), mixC(stone, lin('#FFFFFF'), 0.25)), glowT = glowTex('rgba(255,200,130,0.9)');
  [0.55, 1.6, 2.65, 3.7, 4.75, 5.8].forEach(function (la) {
    var x = Math.cos(la) * 28.7, z = Math.sin(la) * 28.7, S2 = 1.7;
    ls.add(lathe([[0.32, 0], [0.33, 0.06], [0.28, 0.12], [0.12, 0.16], [0.1, 0.7], [0.14, 0.74], [0.27, 0.78], [0.28, 0.84], [0.001, 0.85]], 16), stC, MX([x, 0, z], null, S2));
    for (var p2 = 0; p2 < 4; p2++) { var pa = p2 / 4 * Math.PI * 2 + Math.PI / 4; ls.add(capsule(0.035, 0.26, 6, 2), stC, MX([x + Math.cos(pa) * 0.17 * S2, 1.0 * S2, z + Math.sin(pa) * 0.17 * S2], null, S2)); }
    ls.add(lathe([[0.001, 0], [0.42, 0.0], [0.43, 0.04], [0.36, 0.1], [0.2, 0.2], [0.1, 0.3], [0.06, 0.36], [0.001, 0.37]], 16), stC, MX([x, 1.15 * S2, z], null, S2));
    ls.add(new T.SphereGeometry(0.07, 10, 8), stC, MX([x, 1.56 * S2, z], null, S2));
    lg.add(new T.SphereGeometry(0.15, 12, 10), lin('#FFD58A'), MX([x, 1.0 * S2, z], null, [S2, S2 * 1.25, S2]));
    var spr = new T.Sprite(new T.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    spr.position.set(x, 1.0 * S2, z); spr.scale.set(2.4, 2.4, 1); spr.visible = false; scene.add(spr); LANTERN_GLOWS.push(spr);
  });
  scene.add(ls.mesh(VC({ roughness: 0.92 }), true, true));
  var lgM = VC({ roughness: 0.5, emissive: lin('#FFB760'), emissiveIntensity: 0.8 });
  scene.add(lg.mesh(lgM, false, false)); PAG_LAMPS.push(lgM);

  /* ---- cỏ và hoa nhỏ ngoài lối đi ---- */
  var gr = new Parts(), tuftC = lin('#86BD72'), tuftF = shadeY(tuftC, mixC(tuftC, lin('#4F7F4A'), 0.4), mixC(tuftC, lin('#E7F4C2'), 0.3));
  for (i = 0; i < 260; i++) {
    var ga = rnd() * Math.PI * 2, gR = R_WALK + 1.4 + Math.pow(rnd(), 1.4) * 12, gx = Math.cos(ga) * gR, gz = Math.sin(ga) * gR;
    for (var b3 = 0; b3 < 3; b3++) gr.add(new T.ConeGeometry(0.06, 0.45, 4), tuftF, MX([gx + (b3 - 1) * 0.07, 0.2, gz], [(b3 - 1) * 0.3, 0, (b3 - 1) * 0.35]));
    if (i % 3 === 0) gr.add(new T.SphereGeometry(0.07, 6, 4), lin(['#FFFFFF', '#FFE08A', '#F7B8CC'][i % 3 === 0 ? (i / 3) % 3 : 0]), MX([gx + 0.15, 0.18, gz + 0.08]));
  }
  scene.add(gr.mesh(VC({ roughness: 0.9 }), false, true));

  /* ---- đồi xa mềm (không nhận ánh sáng, chìm trong sương) ---- */
  var hp = new Parts();
  for (i = 0; i < 16; i++) { var ha = i / 16 * Math.PI * 2 + rnd() * 0.2, hR = 100 + rnd() * 14, hs = 16 + rnd() * 12; hp.add(new T.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), lin(i % 2 ? '#BCD5C8' : '#C9DCCF'), MX([Math.cos(ha) * hR, 0, Math.sin(ha) * hR], null, [hs * 1.6, hs * 0.55, hs])); }
  scene.add(hp.mesh(new T.MeshBasicMaterial({ vertexColors: true, fog: true }), false, false));

  /* ---- lá sen và hoa sen trên mặt nước ---- */
  var lpd = new Parts(), lfl = new Parts(), padC = lin('#76AE68'), padE = lin('#9BCB84'), pink = lin('#F2A0BC'), white = lin('#FFF5F6');
  for (i = 0; i < 34; i++) {
    a = i * 2.399; var rp = R_IN + 1.5 + ((i * 37) % 90) / 90 * (R_OUT - R_IN - 3), px = Math.cos(a) * rp, pz = Math.sin(a) * rp, ps = 0.55 + (i % 4) * 0.12;
    var pad = new T.CircleGeometry(1, 22, 0.22, Math.PI * 2 - 0.44); pad.rotateX(-Math.PI / 2);
    var pp = pad.attributes.position; for (var q = 0; q < pp.count; q++) { var rq = Math.hypot(pp.getX(q), pp.getZ(q)); pp.setY(q, 0.1 * rq * rq); } pad.computeVertexNormals();
    lpd.add(pad, function (l) { return mixC(padC, padE, sstep(0.2, 1, Math.hypot(l.x, l.z))); }, MX([px, WATER_Y + 0.045, pz], [0, rnd() * 6, 0], ps));
    if (i % 3 === 0) {
      var fy = WATER_Y + 0.1, fs = 1.6;
      for (var layer = 0; layer < 2; layer++) {
        var np = layer ? 6 : 8, tilt = layer ? 0.55 : 1.0, sz2 = (layer ? 0.75 : 1) * fs;
        for (var k2 = 0; k2 < np; k2++) {
          var ya = k2 / np * Math.PI * 2 + layer * 0.4, pet = new T.SphereGeometry(1, 8, 5); pet.translate(0, 0, 1);
          var m3 = new T.Matrix4().makeTranslation(px, fy, pz).multiply(new T.Matrix4().makeRotationY(ya)).multiply(new T.Matrix4().makeRotationX(-tilt)).multiply(new T.Matrix4().makeScale(0.075 * sz2, 0.03 * sz2, 0.13 * sz2));
          lfl.add(pet, function (l) { return mixC(white, pink, sstep(0.3, 1.9, l.z)); }, m3);
        }
      }
      lfl.add(new T.SphereGeometry(0.06 * fs, 10, 6), lin('#F5CD52'), MX([px, fy + 0.06 * fs, pz], null, [1, 0.6, 1]));
    }
  }
  WORLD.pads = lpd.mesh(VC({ roughness: 0.55, side: T.DoubleSide }), false, true); scene.add(WORLD.pads);
  WORLD.lotus = lfl.mesh(VC({ roughness: 0.5 }), true, false); scene.add(WORLD.lotus);

  scene.add(sp.mesh(VC({ roughness: 0.9 }), true, true));
})();
// gợn sóng: chỉ đổi độ cao các đỉnh nước (máy yếu cập nhật cách khung)
var waterTick = 0;
function updateWater(time) {
  var W = WORLD; W.foam.material.opacity = 0.24 + 0.1 * Math.sin(time * 1.3);
  W.pads.position.y = W.lotus.position.y = 0.008 * Math.sin(time * 0.9);
  if (Q.low && (waterTick++ & 1)) return;
  var wp = W.water.geometry.attributes.position, wb = W.waterBase, amp = W.waterAmp;
  for (var i = 0; i < wp.count; i++) {
    var x = wb[i * 3], y = wb[i * 3 + 1];
    wp.array[i * 3 + 2] = (0.016 * Math.sin(x * 0.9 + time * 1.1) + 0.012 * Math.sin(y * 1.1 - time * 1.35) + 0.007 * Math.sin((x + y) * 2.0 + time * 2.1)) * amp[i];
  }
  wp.needsUpdate = true; W.water.geometry.computeVertexNormals();
}

/* ===================== Nhân vật chibi có khớp ===================== */
// Phong cách "Chibi mịn": đầu to (~45% chiều cao), mắt long lanh có điểm sáng, má hồng, miệng cười,
// áo xếp nếp, tay áo loe, bàn tay bao gọn. Cả người là MỘT SkinnedMesh (thêm một mesh bóng cho tóc, mắt, chuỗi hạt):
// mỗi khớp cũ (hips, spine, chestG, head, L/R, AL/AR, H) là một xương, mỗi mảnh gắn cứng vào một xương,
// nên mọi tư thế dựng sẵn (base, P_*, legIK, sitCross, itemArms) vẫn dùng nguyên.
var CH_MAT = shared(VC({ roughness: 0.72, envMapIntensity: 0.45, skinning: true }));
var CH_GLOSS = shared(VC({ roughness: 0.38, envMapIntensity: 0.8, skinning: true }));
var ITEM_MAT = shared(VC({ roughness: 0.62, side: T.DoubleSide }));
var ITEM_GLOW = shared(VC({ roughness: 0.5, emissive: lin('#FF8A3A'), emissiveIntensity: 1.0 }));
var eyeM = shared(M('#1E1410')), stickM = shared(M('#8A5A2B'));
var CC = {
  skin: lin('#F7D5B5'), skinD: lin('#E8B994'), hair: lin('#3A2E2A'), hairL: lin('#5E4A40'), pants: lin('#EFE9DC'), shoe: lin('#4A3F3A'),
  collar: lin('#F6F1E8'), blush: lin('#F7AFAE'), mouth: lin('#B5605A'), eye: lin('#140D0A'), eyeB: lin('#5A3A2C'), white: lin('#FFFFFF'),
  hat: lin('#E9D7A6'), hatD: lin('#CDB57E'), bead: lin('#7A4424'), ribbon: lin('#C9567A'), band: lin('#8FA7B5')
};
var HIDE = 1e-3;                       // xương co về gần 0 để ẩn mảnh (vạt áo, mí mắt) mà không tách mesh
// Bộ dựng nhân vật có xương: ghi mảnh theo xương, cuối cùng nướng thành SkinnedMesh
function Rig() { this.bones = []; this.list = []; }
Rig.prototype.bone = function (parent, x, y, z) { var b = new T.Group(); b.position.set(x || 0, y || 0, z || 0); parent.add(b); this.bones.push(b); return b; };
Rig.prototype.put = function (bone, geo, col, m, gloss) { this.list.push([bone, geo, col, m, gloss]); };
Rig.prototype.build = function (root) {
  root.updateMatrixWorld(true);
  var bones = this.bones, P = [new Parts(), new Parts()];
  this.list.forEach(function (it) {
    var mm = it[0].matrixWorld.clone(); if (it[3]) mm.multiply(it[3]);
    P[it[4] ? 1 : 0].add(it[1], it[2], mm, bones.indexOf(it[0]));
  });
  var sk = new T.Skeleton(bones), id = new T.Matrix4();
  [CH_MAT, CH_GLOSS].forEach(function (mat, i) {
    if (!P[i].g.length) return;
    var m = new T.SkinnedMesh(P[i].geometry(), mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    root.add(m); m.bind(sk, id);
  });
};
var HR = 0.6;                          // bán kính đầu
function onHead(yaw, pitch, r) { return new T.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(r || HR); }
function faceMX(pos, spin, scl) { return A3.MXlook(pos, pos.clone().normalize(), scl, spin); }
var FRONT = Math.PI * 0.5;             // trên SphereGeometry, phi = π/2 hướng ra +z (phía mặt)
// phần tóc rủ xuống lưng gắn vào ngực (chest) để khi cúi đầu tóc vẫn buông theo lưng, không chĩa ngang
function buildHair(rig, head, k, hat, chest) {
  var hs = function (l, w, n) { return mixC(CC.hair, CC.hairL, sstep(0.3, 1, n.y) * 0.8); };
  var put = function (g, m) { rig.put(head, g, hs, m, true); };
  var capEnd = k === 'cuhanh' ? 0.34 : 0.4;
  put(new T.SphereGeometry(HR * 1.055, 40, 14, 0, Math.PI * 2, 0, Math.PI * capEnd), MX([0, 0, -0.008], [0.08, 0, 0]));
  put(new T.SphereGeometry(HR * 1.06, 36, 20, FRONT + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * (k === 'ngan' ? 0.64 : 0.8)));
  // mái tóc: các lọn tròn dọc chân tóc trước trán
  for (var i = 0; i < 9; i++) {
    var ty = (i - 4) / 4 * 0.95, tp = onHead(ty, 0.29 - Math.abs(i - 4) * 0.028 - (i % 2) * 0.03, HR);
    put(new T.SphereGeometry(0.14, 12, 9), A3.MXlook(tp, tp.clone().normalize(), [0.62, 0.92, 0.38], -ty * 0.45));
  }
  if (k === 'bui') {
    if (!hat) { put(new T.SphereGeometry(0.24, 20, 14), MX([0, 0.53, -0.31])); rig.put(head, new T.TorusGeometry(0.155, 0.03, 8, 22), CC.band, MX([0, 0.44, -0.26], [Math.PI / 2 + 0.6, 0, 0]), true); }
  } else if (k === 'ngan') {
    [-1, 1].forEach(function (sd) { put(new T.SphereGeometry(0.16, 12, 9), MX([0.55 * sd, -0.12, -0.05], null, [0.55, 1, 0.8])); });
    if (!hat) put(new T.SphereGeometry(0.1, 10, 8), MX([0.05, HR * 1.04, 0.08], [0, 0, -0.5], [0.6, 1.2, 0.6]));
  } else if (k === 'dai') {
    rig.put(chest, A3.capsule(0.3, 0.75, 22, 6), hs, MX([0, 0.6, -0.38], [0.08, 0, 0], [1.55, 1, 0.5]), true);
    [-1, 1].forEach(function (sd) { put(A3.capsule(0.09, 0.45, 12, 4), MX([0.53 * sd, -0.4, 0.1], [0, 0, 0.08 * sd])); });
  } else if (k === 'bim') {
    [-1, 1].forEach(function (sd) {
      for (var j = 0; j < 5; j++) { var by = -0.32 - j * 0.15; rig.put(j < 2 ? head : chest, new T.SphereGeometry(0.12 - j * 0.01, 12, 9), hs, MX([0.47 * sd, j < 2 ? by : by + 1.22, -0.24], null, [1, 1.15, 1]), true); }
      [-1, 1].forEach(function (s2) { rig.put(chest, new T.SphereGeometry(0.06, 10, 7), CC.ribbon, MX([0.47 * sd + 0.06 * s2, 0.16, -0.22], [0, 0, 0.6 * s2], [1.3, 0.7, 0.6]), true); });
    });
  } else if (k === 'cuhanh') {
    if (!hat) {
      put(A3.lathe([[0.001, 0], [0.2, 0.04], [0.27, 0.15], [0.23, 0.28], [0.11, 0.4], [0.03, 0.5], [0.001, 0.56]], 22), MX([0, HR * 0.9, -0.04]));
      rig.put(head, new T.TorusGeometry(0.2, 0.035, 8, 24), CC.ribbon, MX([0, HR * 0.95, -0.04], [Math.PI / 2, 0, 0]), true);
    }
  }
}
// Bàn tay bao gọn kiểu chibi: lòng tay + khối bốn ngón (2 đốt) + ngón cái (2 đốt).
// Hệ toạ độ cổ tay: ngón chỉ theo -y, mu bàn tay hướng ra ngoài (+x với tay trái), ngón cái phía trước (+z).
function buildHand(rig, wrist, sd) {
  var g = rig.bone(wrist), sk = A3.shadeY(CC.skin, CC.skinD, mixC(CC.skin, CC.white, 0.15));
  rig.put(g, new T.SphereGeometry(0.075, 14, 10), sk, MX([0, -0.062, 0], null, [0.55, 0.92, 0.95]));
  var f = rig.bone(g, 0, -0.112, 0);
  rig.put(f, A3.capsule(0.031, 0.032, 12, 4), sk, MX([0, -0.024, -0.002], null, [1, 1, 1.75]));
  var j2 = rig.bone(f, 0, -0.05, 0);
  rig.put(j2, A3.capsule(0.029, 0.018, 12, 4), sk, MX([0, -0.018, -0.002], null, [1, 1, 1.7]));
  var th = rig.bone(g, -0.012 * sd, -0.035, 0.05); th.rotation.set(0.55, 0, -0.35 * sd);
  rig.put(th, A3.capsule(0.021, 0.03, 10, 3), sk, MX([0, -0.022, 0]));
  var tj = rig.bone(th, 0, -0.045, 0);
  rig.put(tj, A3.capsule(0.019, 0.016, 10, 3), sk, MX([0, -0.018, 0]));
  return { g: g, fingers: [{ f: f, j2: j2 }], th: th, tj: tj, sd: sd };
}
// curl: 0 duỗi thẳng, 1 nắm chặt
function setHand(H, curl, wx, wy, wz) {
  var s = -H.sd;
  H.fingers.forEach(function (f) { f.f.rotation.z = s * curl * 1.4; f.j2.rotation.z = s * curl * 1.45; });
  H.th.rotation.z = -0.35 * H.sd + s * curl * 0.5; H.tj.rotation.z = s * curl * 0.9;
  H.g.rotation.set(wx || 0, wy || 0, wz || 0);
}
function chibi(look) {
  look = look || {};
  var rb = robeOf(look.robe), rig = new Rig(), sY = A3.shadeY;
  var robe = lin(rb.robe), robeD = lin(rb.robeD), robeL = mixC(robe, CC.white, 0.18);
  var robeShade = function (l, w, n) { var k = n.y * 0.5 + 0.5; return k < 0.5 ? mixC(robeD, robe, k * 2) : mixC(robe, robeL, (k - 0.5) * 1.2); };
  var skinS = sY(CC.skin, CC.skinD, mixC(CC.skin, CC.white, 0.12)), pantsS = sY(CC.pants, mixC(CC.pants, lin('#8E8577'), 0.3), CC.pants);
  var shoeS = sY(CC.shoe, mixC(CC.shoe, lin('#000000'), 0.3), mixC(CC.shoe, CC.white, 0.25));
  var root = new T.Group();
  var hips = rig.bone(root, 0, 0.95, 0);
  function leg(sd) {
    var hip = rig.bone(hips, 0.16 * sd, 0, 0);
    rig.put(hip, A3.limb(0.13, 0.115, 0.5, 14), pantsS);
    var knee = rig.bone(hip, 0, -0.5, 0);
    rig.put(knee, A3.limb(0.115, 0.1, 0.4, 14), pantsS);
    var ank = rig.bone(knee, 0, -0.4, 0);
    rig.put(ank, new T.SphereGeometry(1, 16, 10), shoeS, MX([0, -0.035, 0.06], null, [0.115, 0.075, 0.175]));
    var ft = new T.Group(); ft.position.set(0, -0.03, 0.07); ank.add(ft);       // hướng bàn chân (dùng khi ngồi xếp bằng)
    return { hip: hip, knee: knee, ank: ank, ft: ft };
  }
  var L = leg(1), R = leg(-1);
  // vạt áo dưới xếp nếp, có mép gấp vào trong
  var skirt = rig.bone(hips);
  rig.put(skirt, A3.folds(A3.lathe([[0.43, -0.5], [0.47, -0.6], [0.51, -0.61], [0.5, -0.58], [0.44, -0.4], [0.37, -0.2], [0.32, -0.05], [0.3, 0.06]], 40), 12, function (y) { return 0.05 * sstep(-0.05, -0.58, y); }), robeShade);
  rig.put(skirt, new T.TorusGeometry(0.505, 0.02, 6, 48), robeD, MX([0, -0.6, 0], [Math.PI / 2, 0, 0]));
  // vạt áo phủ đùi khi ngồi xếp bằng
  var lap = rig.bone(hips);
  rig.put(lap, A3.folds(new T.SphereGeometry(0.62, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), 14, function () { return 0.03; }), robeShade, MX([0, -0.12, 0.16], null, [1.1, 0.36, 0.95]));
  var spine = rig.bone(hips);
  var chestG = rig.bone(spine);
  rig.put(chestG, A3.folds(A3.lathe([[0.3, -0.08], [0.33, 0.05], [0.335, 0.2], [0.32, 0.38], [0.28, 0.5], [0.2, 0.6], [0.11, 0.66], [0.09, 0.68]], 30), 6, function (y) { return 0.02 * (1 - sstep(0.15, 0.5, y)); }), robeShade);
  // cổ áo trắng bên trong + vạt chéo (giao lĩnh) + đai lưng
  rig.put(chestG, new T.TorusGeometry(0.12, 0.03, 8, 26), CC.collar, MX([0, 0.645, 0.015], [Math.PI / 2 - 0.25, 0, 0]));
  var lapel = new T.CatmullRomCurve3([[-0.07, 0.668, 0.104], [0.028, 0.583, 0.235], [0.138, 0.413, 0.315], [0.248, 0.226, 0.285], [0.324, 0.056, 0.142]].map(function (a) { return new T.Vector3(a[0], a[1], a[2]); }));
  rig.put(chestG, new T.TubeGeometry(lapel, 20, 0.022, 6, false), robeD);
  rig.put(chestG, new T.TorusGeometry(0.333, 0.032, 8, 36), robeD, MX([0, 0.0, 0], [Math.PI / 2, 0, 0]));
  rig.put(chestG, A3.capsule(0.085, 0.08, 12, 4), skinS, MX([0, 0.7, 0]));
  if (look.beads) {
    for (var bi = 0; bi < 22; bi++) {
      var ba = bi / 22 * Math.PI * 2, front = (Math.cos(ba) + 1) / 2;
      rig.put(chestG, new T.SphereGeometry(0.03, 8, 6), sY(CC.bead, mixC(CC.bead, lin('#2A160C'), 0.5), mixC(CC.bead, CC.white, 0.35)),
        MX([Math.sin(ba) * (0.18 + 0.14 * front), 0.62 - 0.3 * Math.pow(front, 1.6), Math.cos(ba) * 0.17 + 0.155 * front + 0.04 + 0.03 * front]), true);
    }
    rig.put(chestG, new T.SphereGeometry(0.04, 10, 8), CC.ribbon, MX([0, 0.29, 0.4]), true);
    rig.put(chestG, A3.lathe([[0.001, -0.118], [0.045, -0.11], [0.028, -0.014], [0.001, 0]], 10), CC.ribbon, MX([0, 0.27, 0.4]), true);
  }
  var head = rig.bone(chestG, 0, 1.22, 0);
  rig.put(head, new T.SphereGeometry(HR, 40, 28), function (l, w, n) { return mixC(CC.skinD, CC.skin, 0.55 + 0.45 * sstep(-0.9, 0.3, l.y / HR)); });
  [-1, 1].forEach(function (sd) {
    rig.put(head, new T.SphereGeometry(0.1, 10, 8), skinS, MX([HR * 0.92 * sd, -0.06, -0.02], null, [0.55, 1, 0.8]));
    rig.put(head, A3.skinPatch(0.17, 0.62, HR * 1.003), CC.blush, new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), onHead(0.6 * sd, -0.3, 1))));
    rig.put(head, A3.capsule(0.016, 0.085, 8, 3), CC.hair, faceMX(onHead(0.33 * sd, 0.12, HR * 0.985), Math.PI / 2 + 0.18 * sd));
  });
  rig.put(head, new T.SphereGeometry(0.026, 8, 6), mixC(CC.skin, CC.skinD, 0.7), faceMX(onHead(0, -0.2, HR * 0.99)));
  rig.put(head, new T.TorusGeometry(0.05, 0.015, 8, 18, Math.PI), CC.mouth, faceMX(onHead(0, -0.36, HR * 0.988), Math.PI));
  // mắt và mí là xương riêng: chớp mắt / nhắm mắt bằng cách co xương theo chiều dọc
  var eyes = [], lids = [];
  [-1, 1].forEach(function (sd) {
    var pos = onHead(0.31 * sd, -0.13, HR * 0.955), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), pos.clone().normalize());
    var eb = rig.bone(head, pos.x, pos.y, pos.z); eb.quaternion.copy(q);
    rig.put(eb, new T.SphereGeometry(0.097, 18, 14), function (l) { return mixC(CC.eyeB, CC.eye, sstep(-0.085, 0.07, l.y)); }, MX(null, null, [0.8, 1.12, 0.4]), true);
    rig.put(eb, new T.SphereGeometry(0.03, 10, 7), CC.white, MX([0.026 * sd, 0.043, 0.037], null, [1, 1, 0.5]), true);
    rig.put(eb, new T.SphereGeometry(0.014, 8, 6), CC.white, MX([-0.028 * sd, -0.043, 0.037], null, [1, 1, 0.5]), true);
    var lp = onHead(0.31 * sd, -0.15, HR * 0.995), lb = rig.bone(head, lp.x, lp.y, lp.z);
    lb.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), lp.clone().normalize());
    rig.put(lb, new T.TorusGeometry(0.068, 0.014, 6, 14, Math.PI), CC.eye, MX(null, [0, 0, Math.PI]), true);
    eyes.push(eb); lids.push(lb);
  });
  var hair = look.hair || 'bui';
  buildHair(rig, head, hair, look.hat, chestG);
  if (look.hat) {
    // nón lá: vỏ nón có độ dày, vân lá chạy vòng
    rig.put(head, A3.lathe([[0.001, 0.55], [0.28, 0.42], [0.68, 0.2], [1.08, -0.01], [1.13, -0.02], [1.12, 0.0], [0.7, 0.24], [0.3, 0.48], [0.001, 0.62]], 36),
      function (l, w, n) { var r = Math.hypot(l.x, l.z); return mixC(mixC(CC.hat, CC.hatD, 0.5 + 0.5 * Math.sin(r * 38)), CC.white, n.y > 0 ? 0.08 : 0); }, MX([0, HR * 0.62, 0]));
  }
  function arm(sd) {
    var sh = rig.bone(chestG, 0.36 * sd, 0.55, 0);
    rig.put(sh, new T.SphereGeometry(0.155, 16, 12), robeShade);
    rig.put(sh, A3.limb(0.14, 0.13, 0.43, 16), robeShade);
    var el = rig.bone(sh, 0, -0.43, 0);
    rig.put(el, new T.SphereGeometry(0.135, 14, 10), robeShade);
    rig.put(el, A3.lathe([[0.17, -0.3], [0.2, -0.355], [0.232, -0.36], [0.225, -0.33], [0.19, -0.22], [0.15, -0.08], [0.13, 0.02]], 22), robeShade);
    rig.put(el, new T.TorusGeometry(0.226, 0.016, 6, 26), robeD, MX([0, -0.355, 0], [Math.PI / 2, 0, 0]));
    rig.put(el, A3.capsule(0.055, 0.08, 10, 3), skinS, MX([0, -0.36, 0]));
    var hand = rig.bone(el, 0, -0.4, 0);
    return { sh: sh, el: el, hand: hand, H: buildHand(rig, hand, sd) };
  }
  var AL = arm(1), AR = arm(-1);
  rig.build(root);
  lap.scale.setScalar(HIDE); lids.forEach(function (l) { l.scale.setScalar(HIDE); });
  var c = { root: root, hips: hips, spine: spine, chestG: chestG, head: head, L: L, R: R, AL: AL, AR: AR, skirt: skirt, lap: lap, eyes: eyes, lids: lids, look: look,
    lookKey: lookKey({ robe: rb.k, hair: hair, hat: !!look.hat, beads: !!look.beads, hand: look.hand || 'none' }),
    cur: {}, walkP: 0, speed: 0, dirSign: 1, act: null, actT: 0, angle: 0, edge: 0, item: null, eyesClosed: false, crossOn: false, blinkT: 1 + Math.random() * 3 };
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
// hoa sen (dùng cho hoa cầm tay, hoa đăng, cá hóa thân): hai tầng cánh hồng trắng, nhụy vàng, đặt vào Parts tại ma trận m
function lotusParts(pp, m, open) {
  var pink = lin('#F2A0BC'), white = lin('#FFF5F6');
  open = open === undefined ? 1 : open;
  for (var layer = 0; layer < 3; layer++) {
    var np = [8, 6, 5][layer], tilt = [1.05, 0.6, 0.25][layer] * open + 0.15, sz = [1, 0.8, 0.6][layer];
    for (var k = 0; k < np; k++) {
      var ya = k / np * Math.PI * 2 + layer * 0.4, pet = new T.SphereGeometry(1, 8, 5); pet.translate(0, 0, 1);
      var mm = m.clone().multiply(new T.Matrix4().makeRotationY(ya)).multiply(new T.Matrix4().makeRotationX(-tilt)).multiply(new T.Matrix4().makeScale(0.075 * sz, 0.03 * sz, 0.13 * sz));
      pp.add(pet, function (l) { return mixC(white, pink, sstep(0.3, 1.9, l.z)); }, mm);
    }
  }
  pp.add(new T.SphereGeometry(0.05, 10, 6), lin('#F5CD52'), m.clone().multiply(MX([0, 0.05, 0], null, [1, 0.6, 1])));
}
function buildItem(c, hand) {
  if (hand === 'none') return;
  var p = itemArms(base(), hand);
  setPose(c, p, null); c.root.updateMatrixWorld(true);
  var hL = new T.Vector3(), hR = new T.Vector3(); c.AL.hand.getWorldPosition(hL); c.AR.hand.getWorldPosition(hR);
  var pp = new Parts(), sY = A3.shadeY, wood = lin('#8A5A2B'), woodS = sY(wood, mixC(wood, lin('#2A1A10'), 0.4), mixC(wood, CC.white, 0.2));
  if (hand === 'fan') {
    // nắm đúng chuôi quạt trong tay phải; đinh chốt dưới ngón út, quạt xòe lên chếch về phía vai trái
    var fgo = new T.Group(); c.AR.H.g.add(fgo);
    fgo.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1), new T.Vector3(1, 0, 0)));
    fgo.position.set(0.03, -0.125, -0.07);
    var R0 = 0.18, R1 = 0.5, N = 13, A0 = 0.34, SPAN = 0.66, paper = lin('#E36A3B'), paper2 = lin('#CF5530');
    // giấy quạt gấp nếp: mỗi nan một dải, nếp lồi lõm xen kẽ
    var fan = new T.RingGeometry(R0, R1, (N - 1) * 2, 2, Math.PI * A0, Math.PI * SPAN), fp = fan.attributes.position;
    for (var i = 0; i < fp.count; i++) { var ang = Math.atan2(fp.getY(i), fp.getX(i)), u = (ang - Math.PI * A0) / (Math.PI * SPAN) * (N - 1) * 2; fp.setZ(i, (Math.round(u) % 2 ? 0.012 : -0.012) * Math.hypot(fp.getX(i), fp.getY(i)) / R1); }
    fan.computeVertexNormals();
    pp.add(fan, function (l) { var a = Math.atan2(l.y, l.x), u = (a - Math.PI * A0) / (Math.PI * SPAN) * (N - 1); return mixC(Math.floor(u) % 2 ? paper2 : paper, lin('#F7D9A8'), sstep(R1 - 0.07, R1 - 0.01, Math.hypot(l.x, l.y)) * 0.6); });
    for (var j = 0; j < N; j++) { var aj = Math.PI * (A0 + j * SPAN / (N - 1)), Lr = (j === 0 || j === N - 1) ? R1 : R0 + 0.02; pp.add(new T.BoxGeometry(0.018, Lr, 0.008), woodS, MX([Math.cos(aj) * Lr / 2, Math.sin(aj) * Lr / 2, j * 0.0015 - 0.008], [0, 0, aj - Math.PI / 2])); }
    pp.add(new T.TorusGeometry(R1, 0.01, 6, 30, Math.PI * SPAN), lin('#F2C14E'), MX(null, [0, 0, Math.PI * A0]));
    pp.add(new T.CylinderGeometry(0.016, 0.016, 0.04, 10), lin('#C98A3A'), MX(null, [Math.PI / 2, 0, 0]));
    fgo.add(pp.mesh(ITEM_MAT, true, true));
    c.item = fgo; return;
  }
  var g = new T.Group(); c.root.add(g);
  if (hand === 'lantern') {
    // cán cầm tay trái chếch vào giữa và ra trước; đèn treo đầu cán, phía trước người như soi đường
    var tip = new T.Vector3(-0.05, hL.y + 0.32, hL.z + 0.62), mid = hL.clone().add(tip).multiplyScalar(0.5);
    var pm = new T.Matrix4().lookAt(hL, tip, new T.Vector3(0, 1, 0)).multiply(new T.Matrix4().makeRotationX(Math.PI / 2));
    pm.setPosition(mid);
    pp.add(new T.CylinderGeometry(0.02, 0.02, hL.distanceTo(tip), 6), woodS, pm);
    pp.add(new T.CylinderGeometry(0.006, 0.006, 0.18, 4), lin('#5E241A'), MX([tip.x, tip.y - 0.09, tip.z]));
    [0.16, 0.57].forEach(function (dy) { pp.add(A3.lathe([[0.001, -0.025], [0.085, -0.02], [0.08, 0.02], [0.001, 0.025]], 14), lin('#9E4434'), MX([tip.x, tip.y - dy, tip.z])); });
    pp.add(A3.lathe([[0.001, -0.17], [0.03, -0.16], [0.02, -0.02], [0.001, 0]], 8), lin('#E39B2E'), MX([tip.x, tip.y - 0.6, tip.z]));
    g.add(pp.mesh(ITEM_MAT, true, true));
    var lg = new Parts();
    lg.add(A3.folds(new T.SphereGeometry(0.17, 18, 12), 10, function () { return 0.04; }), function (l) { return mixC(lin('#E8642F'), lin('#FFC27A'), sstep(0.1, -0.12, Math.abs(l.y) - 0.1)); }, MX([tip.x, tip.y - 0.36, tip.z], null, [1, 1.25, 1]));
    g.add(lg.mesh(ITEM_GLOW, false, false));
    var gs = new T.Sprite(new T.SpriteMaterial({ map: glowTex('rgba(255,170,90,1)'), transparent: true, depthWrite: false })); gs.scale.setScalar(1.1); gs.position.set(tip.x, tip.y - 0.36, tip.z); g.add(gs);
    c.AL.H.g.attach(g); c.item = g; return;
  }
  if (hand === 'lotus') {
    var m0 = hL.clone().add(hR).multiplyScalar(0.5).add(new T.Vector3(0, 0.1, 0.02));
    pp.add(new T.CylinderGeometry(0.24, 0.2, 0.04, 18), A3.shade('#6FA864'), MX([m0.x, m0.y, m0.z]));
    lotusParts(pp, new T.Matrix4().makeTranslation(m0.x, m0.y + 0.02, m0.z).multiply(new T.Matrix4().makeScale(1.7, 1.7, 1.7)));
    g.add(pp.mesh(ITEM_MAT, true, true));
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
  var cr = !!p.cross;
  if (c.crossOn !== cr) { c.crossOn = cr; c.skirt.scale.setScalar(cr ? HIDE : 1); c.lap.scale.setScalar(cr ? 1 : HIDE); }
  // vạt áo nghiêng theo đùi (quỳ, nhặt rác) và đung đưa nhẹ khi bước
  if (!cr) c.skirt.rotation.set(0.5 * Math.min(0, (q.lhx + q.rhx) / 2), 0, 0.05 * (q.lhx - q.rhx));
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
function closeEyes(c, on) {
  if (c.eyesClosed === on) return; c.eyesClosed = on;
  c.eyes.forEach(function (e) { e.scale.set(1, on ? HIDE : 1, 1); }); c.lids.forEach(function (l) { l.scale.setScalar(on ? 1 : HIDE); });
}
// chớp mắt ngẫu nhiên khi mắt đang mở
function blink(c, dt) {
  if (c.eyesClosed) return;
  c.blinkT -= dt;
  var s = c.blinkT < 0.14 && c.blinkT > 0 ? 0.1 + 0.9 * Math.abs(c.blinkT - 0.07) / 0.07 : 1;
  if (c.blinkT <= 0) c.blinkT = 2.2 + Math.random() * 3;
  c.eyes.forEach(function (e) { e.scale.y = s; });
}
function ease(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }
function seg(t, a, b) { return ease((t - a) / (b - a)); }
function lerp(a, b, k) { return a + (b - a) * k; }
function mix(p, q, k) { var o = {}; J.forEach(function (j) { o[j] = lerp(p[j], q[j], k); }); if (k > 0.5 && q.cross) o.cross = 1; else if (p.cross && k <= 0.5) o.cross = 1; return o; }
// chắp tay: cẳng tay dựng lên, hai lòng bàn tay áp vào nhau trước ngực, đầu ngón hướng lên (góc tìm bằng dò số theo vị trí và hướng bàn tay)
var PRAY = { sx: -0.894, sz: -0.325, sy: -0.596, el: -1.773, wx: -0.491, wy: -0.622, wz: 0.268 };
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
  // đứng yên vẫn thở nhẹ: ngực phồng, vai nhấc theo nhịp
  var p = base(), br = 0.5 + 0.5 * Math.sin(time * 2.0 + c.angle * 5); p.sp = 0.015 * br; p.breath = 0.3 * br; p.lsz += 0.02 * br; p.rsz -= 0.02 * br;
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
function applyPose(c, dt, time) { setPose(c, pose(c, time), dt, 12); blink(c, dt || 0); }
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
  if (me) disposeTree(me.root);
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
  disposeTree(r.root); r.tag.remove(); r.bub.remove();
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
  Q.startProbe();
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
    if (MO.monk) disposeTree(MO.monk.root);
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
  if (ZEN.ch) disposeTree(ZEN.ch.root);
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
  updateWater(time);
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
  if (VIEW === 'hall') moUpdate(dt);
  if (A3.DBG && HAL.dbg && HAL.dbg.frameCam) HAL.dbg.frameCam(camera, me, dt);
  if (VIEW === 'hall') renderer.render(hall, camera);
  else if (VIEW === 'zen') { if (S.inLake || ZEN.ch) { HAL.zenText = zenUpdate(dt); } renderer.render(scene, camera); }
  else if (!(window.HAL && HAL.covered)) renderer.render(scene, camera);

  if (S.inLake && me) {
    Object.keys(remotes).forEach(function (id) {
      var r = remotes[id], p = project(r, 3.05);
      var vis = p.z < 1 && Math.abs(p.nx) < 1.05 && Math.abs(p.ny) < 1.05 && r.root.position.distanceTo(me.root.position) < 26;
      r.tag.hidden = !vis;
      if (vis) { r.tag.style.left = p.x + 'px'; r.tag.style.top = p.y + 'px'; r.bub.style.left = p.x + 'px'; r.bub.style.top = (p.y - 26) + 'px'; }
      else r.bub.hidden = true;
      r.tag.className = 'tag' + (S.ev && S.ev.c === r && !S.ev.done ? ' rel' : '');
    });
    var mp = project(me, 3.3); myBub.style.left = mp.x + 'px'; myBub.style.top = mp.y + 'px';
    var hl = $('hintL'), hr = $('hintR'); hl.hidden = hr.hidden = true; relBub.hidden = true;
    if (S.ev && !S.ev.done) {
      var c = S.ev.c, p2 = project(c, 3.05);
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
  if (S.inLake) Q.tick(dt);
  A3.debugTick(renderer);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function makePreview(cv) {
  var r2 = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r2.setPixelRatio(Q.pixelRatio()); r2.outputEncoding = T.sRGBEncoding;
  r2.shadowMap.enabled = !Q.low; r2.shadowMap.type = T.PCFSoftShadowMap;
  var sc2 = new T.Scene(), env2 = A3.makeEnv(r2, '#FFE9F0', '#FFF4E6', '#F4D6C8');
  sc2.environment = env2;
  sc2.add(new T.HemisphereLight(lin('#FFF3E3'), lin('#E9C9B8'), 0.35));
  var dl = new T.DirectionalLight(lin('#FFE3C0'), 0.8); dl.position.set(3, 6, 5); dl.castShadow = true; dl.shadow.mapSize.set(512, 512);
  (function (sc) { sc.left = -2; sc.right = 2; sc.top = 3.5; sc.bottom = -1; sc.near = 1; sc.far = 15; })(dl.shadow.camera);
  dl.shadow.bias = -0.0008; dl.shadow.normalBias = 0.02; dl.shadow.radius = 3; sc2.add(dl);
  // bệ tròn hồng viền vàng, mép bo mềm
  var pp = new Parts();
  pp.add(A3.lathe([[0.001, -0.24], [1.3, -0.24], [1.36, -0.18], [1.36, -0.06], [1.28, 0], [0.001, 0]], 48), A3.shade('#F4B6C8', 0.25, 0.15));
  pp.add(new T.TorusGeometry(1.08, 0.025, 8, 64), lin('#F2C14E'), MX([0, 0.005, 0], [Math.PI / 2, 0, 0]));
  sc2.add(pp.mesh(VC({ roughness: 0.6 }), false, true));
  var cam2 = new T.PerspectiveCamera(32, 1, 0.1, 50); cam2.position.set(0, 1.9, 7.9); cam2.lookAt(0, 1.5, 0);
  var ch = null, alive = true, last = performance.now(), tt = 0, spin = 0;
  function set(look) { if (ch) disposeTree(ch.root); ch = chibi(look); sc2.add(ch.root); }
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
    stop: function () { alive = false; if (ch) disposeTree(ch.root); env2.dispose(); r2.dispose(); }
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
// móc kiểm thử (chỉ khi bật ?debug): điều khiển nhân vật, thả cá, xem cảnh từ trình duyệt
if (A3.DBG) HAL.dbg = {
  T: T, scene: scene, camera: camera, renderer: renderer, sun: sun, me: function () { return me; }, remotes: remotes, trash: trash,
  act: function (n) { if (n === 'throw' || n === 'release') $('go').click(); else if (n === 'pick') { var k = Object.keys(trash)[0]; if (k !== undefined) { act(me, 'pick'); send({ t: 'act', n: 'pick' }); if (Net.isHost) hostPick(+k, Net.id); } } else myAct(n); },
  chibi: chibi, makeFish: makeFish, setPose: setPose, base: base, pose: pose, P_zen: P_zen, prayArms: prayArms, PRAY: PRAY, fish: function () { return S.fish; },
  frameCam: null
};
})();

/* Hồ An Lạc — cảnh 3D nhiều người chơi trong cùng Wi-Fi.
 * Máy chủ hồ chạy server socket (Android, LakeServer.java) chỉ để chuyển tiếp tin nhắn;
 * luật chơi chung (rác trên bờ) do máy chủ hồ quyết định ở file này. */
(function () {
'use strict';
var T = window.THREE;
var A = window.Android || null;          // cầu nối Android; không có khi chạy thử trên trình duyệt
var $ = function (id) { return document.getElementById(id); };

/* ===================== Lưu trên máy ===================== */
var store = {
  get: function (k, d) { try { var v = localStorage.getItem('hal_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem('hal_' + k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }
};
var ROBES = [
  { k: 'lam', name: 'Áo lam', robe: '#7F95A3', robeD: '#687E8C' },
  { k: 'nau', name: 'Áo tràng nâu', robe: '#8A6248', robeD: '#74503A' },
  { k: 'trang', name: 'Áo dài trắng', robe: '#F7F4EE', robeD: '#E2DCD0' },
  { k: 'hong', name: 'Áo dài hồng', robe: '#F4B6C8', robeD: '#E295AD' },
  { k: 'vang', name: 'Áo tràng vàng', robe: '#E8B04A', robeD: '#C98A3A' }
];
function robeOf(k) { for (var i = 0; i < ROBES.length; i++) if (ROBES[i].k === k) return ROBES[i]; return ROBES[0]; }
function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

var S = {
  phuoc: store.get('phuoc', 1250),
  turns: 5, bag: store.get('bag', 0),
  name: store.get('name', 'Tịnh Tâm'), robe: store.get('robe', 'lam'),
  ev: null, fish: [], returning: null, inLake: false, hosting: false, nextEv: 0
};
(function loadTurns() { var t = store.get('turns', null); S.turns = (t && t.d === today()) ? t.n : 5; })();
function saveTurns() { store.set('turns', { d: today(), n: S.turns }); }

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

var WATER = M('#5FAAB0', { roughness: 0.18, metalness: 0.15, transparent: true, opacity: 0.94 });
var R_IN = 12.8, R_OUT = 24, R_WALK = 26.6;
(function buildWorld() {
  var ground = mesh(new T.CircleGeometry(160, 64), M('#93C27A'), false); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  var sand = mesh(new T.RingGeometry(R_OUT - 0.2, R_OUT + 1.3, 128), M('#E3CC9A'), false); sand.rotation.x = -Math.PI / 2; sand.position.y = 0.02; scene.add(sand);
  var path = mesh(new T.RingGeometry(R_WALK - 0.9, R_WALK + 0.9, 128), M('#DCC79F'), false); path.rotation.x = -Math.PI / 2; path.position.y = 0.015; scene.add(path);
  var water = mesh(new T.RingGeometry(R_IN, R_OUT, 160, 4), WATER, false); water.rotation.x = -Math.PI / 2; water.position.y = 0.04; scene.add(water);
  var deep = mesh(new T.RingGeometry(R_IN + 3, R_OUT - 3, 160), M('#4E979E', { roughness: 0.2, transparent: true, opacity: 0.5 }), false); deep.rotation.x = -Math.PI / 2; deep.position.y = 0.05; scene.add(deep);
  var island = mesh(cyl(R_IN + 0.1, R_IN + 0.6, 0.7, 64), M('#A9D292'), false); island.position.y = 0.1; scene.add(island);
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
    var l = mesh(sph(0.32, 14, 10), M('#E8642F', { emissive: 0xFF8A3A, emissiveIntensity: 0.9 }), false); l.scale.y = 1.25; l.position.set(p[0], 2.6, p[1]); pag.add(l);
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
    var pad = mesh(cyl(0.6, 0.6, 0.04, 16), padM, false); pad.position.set(Math.cos(a) * rp, 0.08, Math.sin(a) * rp); scene.add(pad);
    if (i % 3 === 0) {
      var fl = new T.Group(); fl.position.copy(pad.position); fl.position.y = 0.12;
      for (var k = 0; k < 6; k++) { var pt = mesh(new T.ConeGeometry(0.1, 0.4, 6), pinkM, false); pt.position.set(Math.cos(k) * 0.1, 0.18, Math.sin(k) * 0.1); pt.rotation.z = Math.cos(k) * 0.5; pt.rotation.x = Math.sin(k) * 0.5; fl.add(pt); }
      scene.add(fl);
    }
  }
})();

/* ===================== Nhân vật chibi có khớp ===================== */
var skinM = M('#F5D2B0'), hairM = M('#3A2E2A', { roughness: 0.55 }), pantsM = M('#EFE9DC'), shoeM = M('#4A3F3A'), eyeM = M('#1E1410'), whiteM = M('#FFFFFF');
var blushM = new T.MeshBasicMaterial({ color: 0xF4A6B8, transparent: true, opacity: 0.7 }), mouthM = M('#B5605A'), noseM = M('#EFC6A2');
function chibi(rb) {
  var robe = M(rb.robe), robeD = M(rb.robeD);
  var root = new T.Group();
  var hips = new T.Group(); hips.position.y = 0.95; root.add(hips);
  function leg(sd) {
    var hip = new T.Group(); hip.position.set(0.16 * sd, 0, 0); hips.add(hip);
    var th = mesh(cyl(0.12, 0.11, 0.5), pantsM); th.position.y = -0.25; hip.add(th);
    var knee = new T.Group(); knee.position.y = -0.5; hip.add(knee);
    var sh = mesh(cyl(0.11, 0.1, 0.4), pantsM); sh.position.y = -0.2; knee.add(sh);
    var ft = mesh(new T.BoxGeometry(0.2, 0.1, 0.32), shoeM); ft.position.set(0, -0.41, 0.06); knee.add(ft);
    return { hip: hip, knee: knee };
  }
  var L = leg(1), R = leg(-1);
  var skirtM = M(rb.robe); skirtM.side = T.DoubleSide;
  var skirt = mesh(new T.CylinderGeometry(0.3, 0.5, 0.75, 22, 1, true), skirtM); skirt.position.y = -0.3; hips.add(skirt);
  var spine = new T.Group(); hips.add(spine);
  var waist = mesh(sph(0.31, 18, 12), robe); waist.scale.y = 0.6; spine.add(waist);
  var chest = mesh(cyl(0.29, 0.33, 0.62, 18), robe); chest.position.y = 0.3; spine.add(chest);
  var flap = mesh(new T.BoxGeometry(0.05, 0.6, 0.02), robeD); flap.position.set(0.08, 0.3, 0.31); flap.rotation.z = 0.15; spine.add(flap);
  var neck = mesh(cyl(0.09, 0.1, 0.12), skinM); neck.position.y = 0.66; spine.add(neck);
  var head = new T.Group(); head.position.y = 1.18; spine.add(head);
  head.add(mesh(sph(0.52, 26, 20), skinM));
  var cap = mesh(new T.SphereGeometry(0.555, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), hairM); cap.position.y = 0.02; head.add(cap);
  var back = mesh(new T.SphereGeometry(0.56, 26, 16, Math.PI, Math.PI, 0, Math.PI * 0.72), hairM); back.position.z = -0.02; head.add(back);
  var bun = mesh(sph(0.2), hairM); bun.position.set(0, 0.42, -0.32); head.add(bun);
  [-1, 1].forEach(function (sd) {
    var ear = mesh(sph(0.1, 10, 8), skinM); ear.position.set(0.52 * sd, -0.04, 0); head.add(ear);
    var eye = mesh(sph(0.075, 12, 10), eyeM, false); eye.scale.set(0.9, 1.25, 0.45); eye.position.set(0.18 * sd, -0.04, 0.48); head.add(eye);
    var gl = mesh(sph(0.025, 8, 6), whiteM, false); gl.position.set(0.18 * sd + 0.02, 0.0, 0.52); head.add(gl);
    var brow = mesh(new T.BoxGeometry(0.13, 0.025, 0.02), hairM, false); brow.position.set(0.18 * sd, 0.1, 0.5); brow.rotation.z = -0.15 * sd; head.add(brow);
    var bl = new T.Mesh(new T.CircleGeometry(0.075, 14), blushM); bl.position.set(0.3 * sd, -0.17, 0.43); bl.rotation.y = 0.55 * sd; head.add(bl);
  });
  var nose = mesh(sph(0.045, 10, 8), noseM, false); nose.position.set(0, -0.12, 0.52); head.add(nose);
  var mouth = mesh(new T.TorusGeometry(0.055, 0.016, 6, 14, Math.PI), mouthM, false); mouth.position.set(0, -0.23, 0.49); mouth.rotation.z = Math.PI; head.add(mouth);
  function arm(sd) {
    var sh = new T.Group(); sh.position.set(0.36 * sd, 0.55, 0); spine.add(sh);
    var jnt = mesh(sph(0.15, 12, 10), sd > 0 ? robe : robeD); sh.add(jnt);
    var up = mesh(cyl(0.12, 0.15, 0.44), sd > 0 ? robe : robeD); up.position.y = -0.21; sh.add(up);
    var el = new T.Group(); el.position.y = -0.43; sh.add(el);
    var ej = mesh(sph(0.15, 12, 10), sd > 0 ? robe : robeD); el.add(ej);
    var fa = mesh(cyl(0.14, 0.18, 0.36), sd > 0 ? robe : robeD); fa.position.y = -0.17; el.add(fa);
    var hand = new T.Group(); hand.position.y = -0.4; el.add(hand);
    hand.add(mesh(sph(0.1, 12, 10), skinM));
    return { sh: sh, el: el, hand: hand };
  }
  var AL = arm(1), AR = arm(-1);
  return { root: root, hips: hips, spine: spine, head: head, L: L, R: R, AL: AL, AR: AR,
    cur: {}, walkP: 0, speed: 0, dirSign: 1, act: null, actT: 0, angle: 0 };
}
var JOINTS = ['hipY', 'spine', 'head', 'lsx', 'lsz', 'rsx', 'rsz', 'lel', 'rel', 'lhip', 'rhip', 'lkn', 'rkn'];
function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }
function seg(t, a, b) { return ease((t - a) / (b - a)); }
function lerp(a, b, k) { return a + (b - a) * k; }
var ACT_LEN = { throw: 1.7, pick: 1.25, pray: 2.6, bow: 2.6, niem: 2.6 };
function pose(c, time) {
  var p = { hipY: 0.95, spine: 0.02 * Math.sin(time * 1.6 + c.angle * 5), head: 0, lsx: 0.08, lsz: 0.14, rsx: 0.08, rsz: -0.14, lel: -0.18, rel: -0.18, lhip: 0, rhip: 0, lkn: 0.05, rkn: 0.05 };
  if (c.speed > 0.05) {
    var s = Math.sin(c.walkP), k = Math.min(1, c.speed / 2.6);
    p.lhip = -0.6 * s * k; p.rhip = 0.6 * s * k;
    p.lkn = 0.1 + 0.75 * Math.max(0, Math.sin(c.walkP + 1.6)) * k; p.rkn = 0.1 + 0.75 * Math.max(0, -Math.sin(c.walkP + 1.6)) * k;
    p.lsx = 0.5 * s * k + 0.05; p.rsx = -0.5 * s * k + 0.05; p.lel = -0.45; p.rel = -0.45;
    p.hipY = 0.95 + 0.05 * Math.abs(Math.cos(c.walkP)); p.spine = 0.08 * k;
  }
  var a = c.act, t = c.actT;
  function pray(w) {
    p.lsx = lerp(p.lsx, -0.95, w); p.rsx = lerp(p.rsx, -0.95, w); p.lsz = lerp(p.lsz, -0.5, w); p.rsz = lerp(p.rsz, 0.5, w);
    p.lel = lerp(p.lel, -1.55, w); p.rel = lerp(p.rel, -1.55, w);
  }
  if (a === 'pray') { var w = seg(t, 0, 0.35) * (1 - seg(t, 2.1, 2.5)); pray(w); p.head = 0.18 * w; }
  if (a === 'bow') { var wb = seg(t, 0, 0.3) * (1 - seg(t, 2.0, 2.5)); pray(wb); var bw = seg(t, 0.35, 0.8) * (1 - seg(t, 1.5, 2.0)); p.spine = lerp(p.spine, 0.62, bw); p.head = 0.25 * bw; p.lhip = lerp(p.lhip, -0.15, bw); p.rhip = p.lhip; }
  if (a === 'niem') { var wn = seg(t, 0, 0.35) * (1 - seg(t, 2.1, 2.5)); pray(wn); p.head = 0.12 * wn + 0.06 * Math.sin(t * 9) * wn; }
  if (a === 'throw') {
    var crouch = seg(t, 0, 0.45) * (1 - seg(t, 0.55, 0.8));
    var swing = seg(t, 0.55, 0.78) * (1 - seg(t, 0.95, 1.6));
    p.hipY = 0.95 - 0.2 * crouch; p.lkn = lerp(p.lkn, 0.9, crouch); p.rkn = p.lkn; p.lhip = lerp(p.lhip, -0.75, crouch); p.rhip = p.lhip;
    p.spine = lerp(p.spine, 0.55, crouch) - 0.18 * swing; p.head = 0.25 * crouch - 0.1 * swing;
    var armX = lerp(-0.55, -1.95, swing), aw = Math.max(crouch, swing);
    p.lsx = lerp(p.lsx, armX, aw); p.rsx = lerp(p.rsx, armX, aw); p.lsz = lerp(p.lsz, -0.18, aw); p.rsz = lerp(p.rsz, 0.18, aw);
    p.lel = lerp(p.lel, -0.35, aw); p.rel = lerp(p.rel, -0.35, aw);
  }
  if (a === 'pick') {
    var d = seg(t, 0, 0.45) * (1 - seg(t, 0.7, 1.2));
    p.hipY = 0.95 - 0.28 * d; p.lkn = lerp(p.lkn, 1.1, d); p.rkn = p.lkn; p.lhip = lerp(p.lhip, -0.9, d); p.rhip = p.lhip;
    p.spine = lerp(p.spine, 0.75, d); p.rsx = lerp(p.rsx, -0.9, d); p.rel = lerp(p.rel, -0.1, d); p.head = 0.3 * d;
  }
  return p;
}
function applyPose(c, dt, time) {
  var tg = pose(c, time), k = 1 - Math.exp(-dt * 12);
  JOINTS.forEach(function (j) { var v = c.cur[j]; c.cur[j] = v === undefined ? tg[j] : v + (tg[j] - v) * k; });
  var q = c.cur;
  c.hips.position.y = q.hipY; c.spine.rotation.x = q.spine; c.head.rotation.x = q.head;
  c.AL.sh.rotation.x = q.lsx; c.AL.sh.rotation.z = q.lsz; c.AR.sh.rotation.x = q.rsx; c.AR.sh.rotation.z = q.rsz;
  c.AL.el.rotation.x = q.lel; c.AR.el.rotation.x = q.rel;
  c.L.hip.rotation.x = q.lhip; c.R.hip.rotation.x = q.rhip; c.L.knee.rotation.x = q.lkn; c.R.knee.rotation.x = q.rkn;
}
function act(c, name) { c.act = name; c.actT = 0; }
function placeOnPath(c) { c.root.position.set(Math.cos(c.angle) * R_WALK, 0, Math.sin(c.angle) * R_WALK); }
function faceTo(c, dx, dz, dt) {
  var want = Math.atan2(dx, dz), cur = c.root.rotation.y;
  var d = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
  c.root.rotation.y = cur + d * (1 - Math.exp(-dt * 8));
}
function faceWater(c, dt) { faceTo(c, -Math.cos(c.angle), -Math.sin(c.angle), dt); }
function faceWalk(c, dt) { faceTo(c, Math.sin(c.angle) * c.dirSign, -Math.cos(c.angle) * c.dirSign, dt); }

/* ===================== Cá ===================== */
function makeFish(col) {
  var g = new T.Group(); var m = M(col, { roughness: 0.45 });
  var b = mesh(sph(0.2, 16, 12), m); b.scale.set(0.55, 0.7, 1.6); g.add(b);
  var belly = mesh(sph(0.16, 12, 10), M('#FFC08A')); belly.scale.set(0.5, 0.45, 1.4); belly.position.y = -0.06; g.add(belly);
  var tailG = new T.Group(); tailG.position.z = -0.3; g.add(tailG);
  var tail = mesh(new T.ConeGeometry(0.18, 0.32, 4), M('#E4572E', { transparent: true, opacity: 0.9 })); tail.rotation.x = Math.PI / 2; tail.scale.set(0.25, 1, 1); tail.position.z = -0.12; tailG.add(tail);
  var fin = mesh(new T.ConeGeometry(0.08, 0.22, 4), M('#E4572E')); fin.position.set(0, 0.14, 0.02); fin.scale.set(0.3, 1, 1.6); g.add(fin);
  [-1, 1].forEach(function (s) { var e = mesh(sph(0.025, 8, 6), eyeM, false); e.position.set(0.09 * s, 0.04, 0.26); g.add(e); });
  g.userData.tail = tailG; return g;
}
function handPos(c) { var v = new T.Vector3(), w = new T.Vector3(); c.AL.hand.getWorldPosition(v); c.AR.hand.getWorldPosition(w); return v.add(w).multiplyScalar(0.5); }
function startThrow(c, isMe, back) {
  act(c, 'throw');
  var f = makeFish(isMe ? '#E4572E' : ['#F08A3C', '#F2B33D', '#FBF6F0'][Math.floor(Math.random() * 3)]);
  scene.add(f);
  var F = { obj: f, owner: c, t: 0, state: 'held', isMe: isMe, back: !!back, turn: Math.random() < 0.5 ? 1 : -1 };
  S.fish.push(F);
  return F;
}
var splashes = [];
function splash(pos) {
  var ring = mesh(new T.RingGeometry(0.2, 0.32, 32), new T.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.9 }), false);
  ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, 0.07, pos.z); scene.add(ring);
  splashes.push({ m: ring, t: 0 });
}
function faceObj(o, dx, dz) { o.rotation.set(0, Math.atan2(dx, dz), 0); }
function updateFish(dt) {
  for (var i = S.fish.length - 1; i >= 0; i--) {
    var F = S.fish[i], o = F.obj, c = F.owner; F.t += dt;
    if (F.state === 'held') {
      o.position.copy(handPos(c)); o.rotation.set(0, c.root.rotation.y, 0);
      if (c.act !== 'throw' || c.actT >= 0.7) {
        F.state = 'air';
        F.v = new T.Vector3(-Math.cos(c.angle), 0, -Math.sin(c.angle)).multiplyScalar(5.2).add(new T.Vector3(0, 4.6, 0)); F.t = 0;
      }
    } else if (F.state === 'air') {
      F.v.y -= 12 * dt; o.position.addScaledVector(F.v, dt);
      o.rotation.x = -Math.atan2(F.v.y, 5);
      if (o.position.y < 0.05 && F.v.y < 0) {
        o.position.y = -0.05; splash(o.position); F.state = 'swim'; F.t = 0; F.spot = o.position.clone();
        F.ang = Math.atan2(o.position.z, o.position.x); F.r = Math.hypot(o.position.x, o.position.z);
        if (F.isMe) (function (fx) {
          setTimeout(function () {
            if (fx.back) toast('Chú cá chép quay lại tạ ơn bạn', 'Cá đang lượn quanh chờ bạn. Niệm “A Di Đà Phật” để tiễn cá đi.');
            else toast('Chú cá đã về với dòng sông', 'Mong chú cá bơi đi bình an, tự tại.');
          }, 900);
        })(F);
      }
    } else if (F.state === 'swim') {
      F.ang += F.turn * dt * 0.12; F.r = Math.max(R_IN + 1.2, F.r - dt * 0.6);
      o.position.set(Math.cos(F.ang) * F.r, -0.06, Math.sin(F.ang) * F.r);
      faceObj(o, -Math.sin(F.ang) * F.turn - Math.cos(F.ang) * 0.4, Math.cos(F.ang) * F.turn - Math.sin(F.ang) * 0.4);
      if (F.back && F.t > 1.6) { F.state = 'return'; F.t = 0; F.from = o.position.clone(); if (F.isMe) { S.returning = F; renderHUD(); } }
      else if (!F.back && F.t > 3) { F.state = 'fade'; F.t = 0; }
    } else if (F.state === 'return') {
      var k = Math.min(1, F.t / 1.5);
      if (k < 1) { o.position.lerpVectors(F.from, F.spot, ease(k)); faceObj(o, F.spot.x - F.from.x, F.spot.z - F.from.z); }
      else { F.state = 'circle'; F.t = 0; }
    } else if (F.state === 'circle') {
      var th = F.t * 1.8;
      o.position.set(F.spot.x + Math.cos(th) * 0.9, -0.04 + 0.03 * Math.sin(F.t * 5), F.spot.z + Math.sin(th) * 0.9);
      faceObj(o, -Math.sin(th), Math.cos(th));
      if (Math.random() < dt * 0.6) splash(o.position);
    } else if (F.state === 'leave') {
      var out = new T.Vector3(-F.spot.x, 0, -F.spot.z).normalize();
      o.position.addScaledVector(out, dt * 2.4); faceObj(o, out.x, out.z);
      if (F.t > 1.6) { F.state = 'fade'; F.t = 0; }
    } else if (F.state === 'fade') {
      o.position.y -= dt * 0.4;
      if (F.t > 1.2) { scene.remove(o); S.fish.splice(i, 1); continue; }
    }
    if (o.userData.tail) o.userData.tail.rotation.y = Math.sin(F.t * 14) * 0.5;
  }
  for (var s = splashes.length - 1; s >= 0; s--) {
    var sp = splashes[s]; sp.t += dt; var sc = 1 + sp.t * 5; sp.m.scale.set(sc, sc, sc);
    sp.m.material.opacity = Math.max(0, 0.9 - sp.t * 0.9);
    if (sp.t > 1) { scene.remove(sp.m); splashes.splice(s, 1); }
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
  me = chibi(robeOf(S.robe)); me.angle = Math.random() * Math.PI * 2; placeOnPath(me); me.root.rotation.y = Math.atan2(-Math.cos(me.angle), -Math.sin(me.angle));
  scene.add(me.root);
  $('meName').textContent = S.name; $('meAv').textContent = (S.name.trim()[0] || 'T').toUpperCase(); $('meAv').style.background = robeOf(S.robe).robe;
}
function getRemote(id, info) {
  var r = remotes[id];
  if (!r) {
    var rb = robeOf(info && info.robe);
    r = chibi(rb); r.id = id; r.name = (info && info.name) || 'Bạn đồng tu'; r.robeK = rb.k;
    r.angle = info && typeof info.a === 'number' ? info.a : 0; r.netA = r.angle; r.netV = 0;
    placeOnPath(r); scene.add(r.root);
    r.tag = document.createElement('div'); r.tag.className = 'tag'; r.tag.textContent = r.name; labelsEl.appendChild(r.tag);
    r.bub = document.createElement('div'); r.bub.className = 'bub'; r.bub.hidden = true; labelsEl.appendChild(r.bub);
    remotes[id] = r; renderCount();
  } else if (info) {
    if (info.name && info.name !== r.name) { r.name = info.name; r.tag.textContent = r.name; }
    if (info.robe && info.robe !== r.robeK) {          // đổi trang phục: dựng lại nhân vật
      var keep = { angle: r.angle, netA: r.netA, netV: r.netV };
      removeRemote(id); r = getRemote(id, { name: info.name, robe: info.robe, a: keep.angle });
      r.netA = keep.netA; r.netV = keep.netV;
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
function helloMsg(to) { var o = { t: 'hello', name: S.name, robe: S.robe, a: me ? me.angle : 0 }; if (to) o.to = to; return o; }
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
        startThrow(r, false, o.back);
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
  ROBES.forEach(function (rb) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'robe' + (rb.k === S.robe ? ' on' : '');
    b.innerHTML = '<i style="background:' + rb.robe + '"></i>' + rb.name;
    b.addEventListener('click', function () { S.robe = rb.k; store.set('robe', S.robe); renderRobes(); });
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
}
function exitLake(msg) {
  S.inLake = false; Net.leaving = true;
  try { if (Net.ws) Net.ws.close(); } catch (e) { /* bỏ qua */ }
  Net.ws = null;
  if (S.hosting && A) { try { A.stopHost(); } catch (e) { /* bỏ qua */ } }
  S.hosting = false; S.hostIp = '';
  clearRemotes(); clearTrash();
  S.fish.forEach(function (F) { scene.remove(F.obj); }); S.fish = [];
  $('hud').hidden = true; $('lobby').hidden = false; $('hintL').hidden = $('hintR').hidden = true;
  lobbyError(msg || '');
  lakes = {}; renderLakes();
  if (A) { try { A.startDiscovery(); } catch (e) { /* bỏ qua */ } }
}
$('leave').addEventListener('click', function () { exitLake(''); });

/* ===================== Giao diện trong hồ ===================== */
function addPhuoc(n) { S.phuoc += n; store.set('phuoc', S.phuoc); renderHUD(); }
function renderCount() { $('count').textContent = (1 + Object.keys(remotes).length) + ' người đang ở hồ'; }
function renderHUD() {
  $('phuoc').textContent = S.phuoc.toLocaleString('vi-VN');
  $('bag').textContent = S.bag;
  var d = ''; for (var i = 0; i < 5; i++) d += '<span class="dot' + (i < S.turns ? '' : ' e') + '"></span>';
  $('dots').innerHTML = d;
  var busy = me && me.act === 'throw';
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
    var c = S.ev.c; addPhuoc(2);
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
  if (!me || S.returning || me.act === 'throw') return;
  if (S.turns <= 0) {
    if (S.phuoc >= 100) { S.phuoc -= 100; store.set('phuoc', S.phuoc); S.turns = 1; saveTurns(); toast('Đã đổi 100 phước', 'Bạn có thêm 1 lượt thả cá.'); renderHUD(); }
    return;
  }
  walkDir = 0;
  var back = Math.random() < 0.25;
  startThrow(me, true, back);
  send({ t: 'act', n: 'throw', back: back });
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
    if (me.act === 'throw' || me.act === 'pick') dir = 0;
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
  renderer.render(scene, camera);

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
})();

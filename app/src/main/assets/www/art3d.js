/* Hồ An Lạc — bộ công cụ dựng hình 3D phong cách "Chibi mịn" (dùng chung cho game.js).
 * Ý chính: màu nướng sẵn vào đỉnh (vertex color) để gộp nhiều mảnh thành một lần vẽ,
 * màu viết bằng mã hex sRGB rồi đổi sang linear vì renderer xuất sRGB. */
(function () {
'use strict';
var T = window.THREE;

/* ---------- màu và số ---------- */
function lin(hex) { return new T.Color(hex).convertSRGBToLinear(); }
function mixC(a, b, k) { return a.clone().lerp(b, k); }
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
// số ngẫu nhiên có hạt giống: cảnh dựng ra giống nhau mỗi lần mở
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- ma trận đặt mảnh ---------- */
var _d = new T.Object3D();
function setScl(o, s) { if (s === undefined) o.scale.set(1, 1, 1); else if (typeof s === 'number') o.scale.set(s, s, s); else o.scale.set(s[0], s[1], s[2]); }
function MX(pos, rot, scl) {
  _d.position.set(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0);
  _d.rotation.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, rot && rot[3] || 'XYZ');
  setScl(_d, scl); _d.updateMatrix(); return _d.matrix.clone();
}
// quay trục +z của mảnh theo hướng dir, đặt tại pos (mắt, má, lông mày trên mặt cầu)
function MXlook(pos, dir, scl, spin) {
  _d.position.copy(pos); _d.rotation.set(0, 0, 0); _d.lookAt(pos.clone().add(dir));
  if (spin) _d.rotateZ(spin);
  setScl(_d, scl); _d.updateMatrix(); return _d.matrix.clone();
}

/* ---------- Parts: gom mảnh có màu đỉnh thành một geometry (một lần vẽ) ----------
 * col: THREE.Color, hoặc hàm (điểm gốc, điểm đã đặt, pháp tuyến) -> Color.
 * bone: chỉ số xương khi dựng nhân vật có xương (mỗi mảnh gắn cứng vào một xương). */
function Parts() { this.g = []; this.nv = 0; this.ni = 0; this.skin = false; }
var _vl = new T.Vector3(), _vw = new T.Vector3(), _nw = new T.Vector3();
Parts.prototype.add = function (geo, col, m, bone) {
  var g = geo.clone();
  if (!g.index) { var ix = []; for (var q = 0; q < g.attributes.position.count; q++) ix.push(q); g.setIndex(ix); }
  if (!g.attributes.normal) g.computeVertexNormals();
  var pl = g.attributes.position.array.slice(0);
  if (m) g.applyMatrix4(m);
  var p = g.attributes.position.array, n = g.attributes.normal.array, cnt = p.length / 3;
  var c = new Float32Array(cnt * 3), fixed = col && col.isColor ? col : null;
  for (var i = 0; i < cnt; i++) {
    var cc = fixed;
    if (!cc) { _vl.set(pl[i * 3], pl[i * 3 + 1], pl[i * 3 + 2]); _vw.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); _nw.set(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]); cc = col(_vl, _vw, _nw); }
    c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b;
  }
  if (bone !== undefined) this.skin = true;
  this.g.push({ p: p, n: n, c: c, i: g.index.array, b: bone || 0 });
  this.nv += cnt; this.ni += g.index.count;
  return this;
};
Parts.prototype.geometry = function () {
  var P = new Float32Array(this.nv * 3), N = new Float32Array(this.nv * 3), C = new Float32Array(this.nv * 3);
  var I = this.nv > 65535 ? new Uint32Array(this.ni) : new Uint16Array(this.ni), SI = null, SW = null;
  if (this.skin) { SI = new Uint16Array(this.nv * 4); SW = new Float32Array(this.nv * 4); }
  var vo = 0, io = 0;
  this.g.forEach(function (x) {
    P.set(x.p, vo * 3); N.set(x.n, vo * 3); C.set(x.c, vo * 3);
    for (var k = 0; k < x.i.length; k++) I[io + k] = x.i[k] + vo;
    var cnt = x.p.length / 3;
    if (SI) for (var v = 0; v < cnt; v++) { SI[(vo + v) * 4] = x.b; SW[(vo + v) * 4] = 1; }
    vo += cnt; io += x.i.length;
  });
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(P, 3));
  g.setAttribute('normal', new T.BufferAttribute(N, 3));
  g.setAttribute('color', new T.BufferAttribute(C, 3));
  if (SI) { g.setAttribute('skinIndex', new T.BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new T.BufferAttribute(SW, 4)); }
  g.setIndex(new T.BufferAttribute(I, 1));
  g.computeBoundingSphere();
  return g;
};
Parts.prototype.mesh = function (mat, cast, recv) {
  var m = new T.Mesh(this.geometry(), mat); m.castShadow = !!cast; m.receiveShadow = recv !== false; return m;
};

/* ---------- hình cơ bản bo tròn ---------- */
function lathe(pts, segs) { return new T.LatheGeometry(pts.map(function (a) { return new T.Vector2(Math.max(1e-4, a[0]), a[1]); }), segs || 32); }
// viên nhộng mượt, tâm ở gốc, dọc trục y
function capsule(r, len, segs, rings) {
  rings = rings || 6; var pts = [], i, a;
  for (i = 0; i <= rings; i++) { a = -Math.PI / 2 + (i / rings) * Math.PI / 2; pts.push([Math.cos(a) * r, -len / 2 + Math.sin(a) * r]); }
  for (i = 0; i <= rings; i++) { a = (i / rings) * Math.PI / 2; pts.push([Math.cos(a) * r, len / 2 + Math.sin(a) * r]); }
  return lathe(pts, segs || 16);
}
// viên nhộng thon: bán kính r0 ở đầu trên (y = 0), r1 ở đầu dưới (y = -len)
function limb(r0, r1, len, segs) {
  var pts = [], i, a, R = 5;
  for (i = 0; i <= R; i++) { a = -Math.PI / 2 + i / R * Math.PI / 2; pts.push([Math.cos(a) * r1, -len + Math.sin(a) * r1]); }
  for (i = 0; i <= R; i++) { a = i / R * Math.PI / 2; pts.push([Math.cos(a) * r0, Math.sin(a) * r0]); }
  return lathe(pts, segs || 16);
}
// nếp gấp quanh trục (nếp áo, gân vỏ cây)
function folds(geo, n, ampFn) {
  var p = geo.attributes.position;
  for (var i = 0; i < p.count; i++) {
    var x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + ampFn(y) * Math.sin(Math.atan2(x, z) * n);
    p.setXYZ(i, x * k, y, z * k);
  }
  geo.computeVertexNormals(); return geo;
}
// đá tròn sần nhẹ
function rockGeo(seed, w, h, amp) {
  amp = amp === undefined ? 1 : amp;
  var g = new T.SphereGeometry(1, w || 14, h || 10), p = g.attributes.position, r = rng(seed);
  var f1 = 1.5 + r() * 2, f2 = 2 + r() * 3, o1 = r() * 9, o2 = r() * 9;
  for (var i = 0; i < p.count; i++) {
    var x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    var d = 1 + amp * 0.09 * Math.sin(x * f1 + o1) * Math.sin(z * f1 + o2) + amp * 0.04 * Math.sin(y * f2 + x * f2 + o2);
    p.setXYZ(i, x * d, y * d, z * d);
  }
  g.computeVertexNormals(); return g;
}
// bóng giả: tối dần phía dưới, sáng phía trên
function shadeY(base, dark, light) { return function (l, w, n) { var k = n.y * 0.5 + 0.5; return k < 0.5 ? mixC(dark, base, k * 2) : mixC(base, light, (k - 0.5) * 2); }; }
function shade(hex, d, l) { var b = lin(hex); return shadeY(b, mixC(b, lin('#3A2A20'), d === undefined ? 0.35 : d), mixC(b, lin('#FFFFFF'), l === undefined ? 0.18 : l)); }
// miếng vá ôm sát mặt cầu bán kính r (má hồng): chỏm quanh +y, bóp dẹt theo z
function skinPatch(ang, sq, r) {
  var g = new T.SphereGeometry(1, 20, 4, 0, Math.PI * 2, 0, ang), p = g.attributes.position, v = new T.Vector3();
  for (var i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i) * sq).normalize().multiplyScalar(r); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}

/* ---------- vật liệu ---------- */
function VC(o) { return new T.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.4 }, o || {})); }
function canvasTex(c) { var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }
// môi trường mềm từ vòm trời gradient: bề mặt mịn có ánh phản chiếu nhẹ (dựng một lần cho mỗi renderer)
function makeEnv(renderer, top, hor, bot, sunCol) {
  var es = new T.Scene(), g = new T.SphereGeometry(50, 32, 16), p = g.attributes.position, c = [];
  var A = lin(top || '#B8DDF0'), H = lin(hor || '#FFF1E0'), B = lin(bot || '#B5D29C');
  for (var i = 0; i < p.count; i++) { var y = p.getY(i) / 50, col = y > 0 ? mixC(H, A, Math.pow(y, 0.6)) : mixC(H, B, Math.pow(-y, 0.5)); c.push(col.r, col.g, col.b); }
  g.setAttribute('color', new T.Float32BufferAttribute(c, 3));
  es.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
  var sb = new T.Mesh(new T.SphereGeometry(5, 16, 8), new T.MeshBasicMaterial({ color: lin(sunCol || '#FFF4DE').multiplyScalar(3) }));
  sb.position.set(30, 32, -6); es.add(sb);
  var pm = new T.PMREMGenerator(renderer), tex = pm.fromScene(es, 0.02).texture;
  pm.dispose(); g.dispose();
  return tex;
}

/* ---------- cá: uốn thân bằng CPU, đuôi quẫy mềm ---------- */
// lệch ngang tăng dần về phía đuôi (z âm); curv uốn cả thân khi rẽ
function bendFish(m, phase, amp, curv) {
  var b = m.userData.base, p = m.geometry.attributes.position.array;
  for (var i = 0; i < b.length; i += 3) {
    var z = b[i + 2], w = sstep(0.18, -0.62, z);
    p[i] = b[i] + amp * w * Math.sin(phase - z * 7) - curv * z * z;
  }
  m.geometry.attributes.position.needsUpdate = true;
}

/* ---------- dọn bộ nhớ GPU ---------- */
// gỡ một vật khỏi cảnh và giải phóng hình học, vật liệu, texture của nó; đồ dùng chung (userData.shared) được giữ lại
function disposeTree(o) {
  if (!o) return;
  if (o.parent) o.parent.remove(o);
  o.traverse(function (n) {
    if (n.skeleton) n.skeleton.dispose();
    if (n.geometry && !n.isSprite && !n.geometry.userData.shared) n.geometry.dispose();   // hình của Sprite là đồ dùng chung trong three.js
    [].concat(n.material || []).forEach(function (m) {
      if (m.userData.shared) return;
      if (m.map && !(m.map.userData && m.map.userData.shared)) m.map.dispose();
      m.dispose();
    });
  });
}

/* ---------- cờ chất lượng cho máy yếu ----------
 * Bật tay: ?low (tắt bằng ?low=0) hoặc localStorage hal_low = true.
 * Tự bật: fps trung bình dưới 40 trong 4 giây đầu ở hồ (ghi nhớ cho lần sau). */
var Quality = (function () {
  var q = /[?&]low(=([^&]*))?/.exec(location.search), low = false;
  try { low = JSON.parse(localStorage.getItem('hal_low') || 'false'); } catch (e) { /* bỏ qua */ }
  if (q) { low = q[2] !== '0'; try { localStorage.setItem('hal_low', JSON.stringify(low)); } catch (e) { /* bỏ qua */ } }
  var Q = { low: !!low, forced: !!q, listeners: [], probe: null };
  Q.pixelRatio = function () { return Math.min(Q.low ? 1.5 : 2, window.devicePixelRatio || 1); };
  Q.onChange = function (fn) { Q.listeners.push(fn); };
  Q.set = function (on) {
    if (Q.low === on) return; Q.low = on;
    try { localStorage.setItem('hal_low', JSON.stringify(on)); } catch (e) { /* bỏ qua */ }
    Q.listeners.forEach(function (fn) { fn(on); });
  };
  // gọi mỗi khung hình khi đang ở hồ; bắt đầu đo khi vừa vào hồ
  Q.startProbe = function () { if (!Q.low && !Q.forced) Q.probe = { t: 0, n: 0, skip: 1 }; };
  Q.tick = function (dt) {
    var p = Q.probe; if (!p) return;
    if (p.skip > 0) { p.skip -= dt; return; }       // bỏ giây đầu: còn đang dựng nhân vật, biên dịch shader
    p.t += dt; p.n++;
    if (p.t >= 4) { Q.probe = null; if (p.n / p.t < 40) Q.set(true); }
  };
  return Q;
})();

/* ---------- bộ đo (?debug hoặc localStorage hal_debug = true) ---------- */
var DBG = /[?&]debug/.test(location.search);
try { DBG = DBG || JSON.parse(localStorage.getItem('hal_debug') || 'false'); } catch (e) { /* bỏ qua */ }
var dbgEl = null, dbgLast = performance.now(), dbgN = 0;
function debugTick(renderer) {
  if (!DBG) return;
  if (!dbgEl) {
    dbgEl = document.createElement('div');
    dbgEl.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99;font:11px monospace;color:#fff;background:rgba(0,0,0,.5);padding:2px 5px;pointer-events:none';
    document.body.appendChild(dbgEl);
  }
  dbgN++;
  var now = performance.now(), span = now - dbgLast, info = renderer.info;
  window.__calls = info.render.calls; window.__tris = info.render.triangles;
  if (span >= 500) {
    dbgEl.textContent = Math.round(dbgN * 1000 / span) + ' fps · ' + info.render.calls + ' draw · ' + Math.round(info.render.triangles / 1000) + 'k tam giác · ' + info.memory.geometries + ' geo' + (Quality.low ? ' · thấp' : '');
    dbgLast = now; dbgN = 0;
  }
}

window.A3 = {
  lin: lin, mixC: mixC, clamp: clamp, sstep: sstep, rng: rng, MX: MX, MXlook: MXlook,
  Parts: Parts, lathe: lathe, capsule: capsule, limb: limb, folds: folds, rockGeo: rockGeo, shadeY: shadeY, shade: shade, skinPatch: skinPatch,
  VC: VC, canvasTex: canvasTex, makeEnv: makeEnv, bendFish: bendFish, disposeTree: disposeTree,
  Quality: Quality, debugTick: debugTick, DBG: DBG
};
})();

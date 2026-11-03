/* Hồ An Lạc — các màn hình phụ: Tích phước (thắp hương, gõ mõ, thiền), Trang phục, Bộ sưu tập cá.
 * Dùng chung trạng thái với cảnh hồ qua window.HAL (game.js). */
(function () {
'use strict';
var H = window.HAL; if (!H) return;
var S = H.S;
var $ = function (id) { return document.getElementById(id); };
var scr = $('screen'), nav = $('nav');
var tab = 'ho', preview = null, timers = [], cleanups = [];

/* ---------- kiểu dáng riêng cho màn hình phụ ---------- */
var css = document.createElement('style');
css.textContent = [
'#toast{z-index:40}',
'.pg{max-width:520px;margin:0 auto;padding:16px max(16px, env(safe-area-inset-right,0px)) 24px max(16px, env(safe-area-inset-left,0px));display:flex;flex-direction:column;gap:12px;box-sizing:border-box}',
'.pg h1{margin:0;font:800 26px/1.1 var(--display);color:var(--ink)}',
'.pg .lead{margin:2px 0 0;font-size:13px;color:var(--ink-2);line-height:1.4}',
'.hd{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}',
'.pp{display:flex;align-items:center;gap:6px;background:#fff;border-radius:999px;padding:5px 12px 5px 9px;font:700 15px var(--display);box-shadow:0 4px 14px rgba(31,92,90,.12);white-space:nowrap}',
'.cardx{background:#fff;border-radius:20px;padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 4px 14px rgba(31,92,90,.08)}',
'.bal{display:flex;justify-content:space-between;align-items:center;gap:10px}',
'.bal small{display:block;font-size:12px;color:var(--ink-2)}',
'.bal b{font:800 24px/1.1 var(--display)}',
'.bal .tn{font:700 18px var(--display);color:#9E3C16}',
'.xch{display:flex;align-items:center;gap:10px;background:#FFF6E8;border-radius:14px;padding:8px 8px 8px 12px;font-size:12.5px;color:#5A3C10}',
'.xch span{flex:1}',
'.b1{height:42px;border:0;border-radius:999px;background:var(--jade);color:#fff;font:600 13.5px var(--body);padding:0 16px;white-space:nowrap}',
'.b1:disabled{opacity:.55}',
'.b1.gh{background:#F3F8F7;color:var(--jade);border:1.5px solid var(--line)}',
'.b1.big{height:52px;font:800 18px var(--display);width:100%}',
'.act{display:flex;align-items:center;gap:12px;background:#fff;border-radius:18px;padding:10px 12px;box-shadow:0 2px 10px rgba(31,92,90,.08)}',
'.act .ti{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center}',
'.act .bd{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}',
'.act .nm{font:700 16px/1.15 var(--display)}',
'.act .ds{font-size:12px;line-height:1.35;color:var(--ink-2)}',
'.act .mt{display:flex;align-items:center;gap:6px;margin-top:3px;font-size:11.5px;font-weight:600;flex-wrap:wrap}',
'.plus{color:#9E3C16;background:#FFF1DC;border-radius:999px;padding:1px 8px}',
'.sub2{color:var(--ink-2);font-weight:500}',
'.done{flex:none;height:40px;padding:0 12px;border-radius:999px;background:#E6F3EA;color:#2F6B45;font:600 12.5px var(--body);display:flex;align-items:center}',
'.note2{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-2)}',
/* trang phục */
'.pv{position:relative;height:300px;border-radius:0 0 26px 26px;background:linear-gradient(180deg,#FBEBD6,#F6E3CC 70%,#EEF5F3);overflow:hidden}',
'.pv canvas{position:absolute;inset:0;width:100%;height:100%}',
'.pv .hd{position:absolute;left:16px;right:16px;top:14px}',
'.pv .sel{position:absolute;left:0;right:0;bottom:10px;text-align:center;font:700 17px var(--display);color:#7A3A2C}',
'.tabs{display:flex;gap:6px;background:#E3EEEC;border-radius:999px;padding:4px}',
'.tabs button{flex:1;height:38px;border:0;border-radius:999px;background:transparent;font:600 13px var(--body);color:var(--ink-2)}',
'.tabs button.on{background:#fff;color:var(--jade);box-shadow:0 2px 6px rgba(31,92,90,.12)}',
'.grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
'.it{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;border-radius:16px;background:#fff;border:2px solid transparent;font-family:var(--body);min-width:0}',
'.it.sel{border-color:var(--jade);box-shadow:0 4px 12px rgba(31,92,90,.16)}',
'.it .n{font-size:12px;font-weight:600;color:var(--ink);line-height:1.2;text-align:center}',
'.it .s{font-size:11px;line-height:1.2;text-align:center;color:var(--ink-2)}',
'.it .s.own{color:#2F6B45}.it .s.cost{color:#9E3C16;font-weight:600}',
'.it .bdg{position:absolute;top:6px;right:6px;width:20px;height:20px;border-radius:10px;display:grid;place-items:center}',
'.it svg.ic2{width:46px;height:46px}',
/* bộ sưu tập */
'.fd{border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 6px 18px rgba(31,92,90,.1)}',
'.fd .wt{height:120px;background:linear-gradient(180deg,#CDEBEA,#8FCFD1);display:grid;place-items:center;position:relative}',
'.fd .wt svg{animation:sw 2.8s ease-in-out infinite alternate}',
'@keyframes sw{from{transform:translate(-6px,2px)}to{transform:translate(8px,-3px)}}',
'.fd .in{padding:10px 14px 12px;display:flex;flex-direction:column;gap:8px}',
'.rar{display:inline-block;font-size:10.5px;font-weight:600;border-radius:999px;padding:1px 8px;margin-left:8px;vertical-align:middle}',
'.r1{background:#E6F3EA;color:#2F6B45}.r2{background:#E3EEF8;color:#2E5C8A}.r3{background:#FFF1DC;color:#8A4A0C}',
'.stats{display:flex;gap:6px;align-items:center}',
'.stc{display:flex;flex-direction:column;align-items:center;background:#F3F8F7;border-radius:12px;padding:4px 10px;min-width:56px}',
'.stc b{font:700 16px/1.1 var(--display)}.stc span{font-size:10.5px;color:var(--ink-2)}',
/* hoạt động */
'.ax{min-height:100%;display:flex;flex-direction:column;background:#EEF5F3}',
'.ax .top{display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 12px) 16px 8px}',
'.ax .top h2{flex:1;margin:0;font:800 22px var(--display)}',
'.back{width:44px;height:44px;border-radius:22px;border:0;background:#fff;color:var(--jade);display:grid;place-items:center;box-shadow:0 2px 8px rgba(31,92,90,.12)}',
'.ins{margin:0 16px;text-align:center;font:600 14px var(--body);color:var(--saffron-ink);background:var(--saffron-soft);border-radius:999px;padding:8px 14px}',
'.steps{display:flex;gap:6px;justify-content:center;margin-top:8px}.steps i{width:8px;height:8px;border-radius:4px;background:#D6E3E1}.steps i.on{background:var(--saffron);width:20px}',
'.rw{position:fixed;inset:0;z-index:30;background:rgba(35,64,63,.35);display:grid;place-items:center;padding:20px}',
'.rw .bx2{background:#fff;border-radius:24px;padding:20px;max-width:340px;width:100%;box-sizing:border-box;text-align:center;display:flex;flex-direction:column;gap:8px;box-shadow:0 0 0 3px #F2C14E,0 12px 30px rgba(201,138,18,.3);animation:pop .35s cubic-bezier(.3,1.5,.5,1) both}',
'@keyframes pop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}',
'.rw h3{margin:0;font:800 22px var(--display);color:var(--ink)}',
'.rw .pl{font:800 34px var(--display);color:#C98A12}',
'.rw p{margin:0;font-size:13.5px;color:var(--ink-2);line-height:1.45}',
'.rw .row2{display:flex;gap:8px;margin-top:6px}.rw .row2 .b1{flex:1}',
'@keyframes flick{from{transform:scale(.92,.85)}to{transform:scale(1.06,1.1)}}',
'.flame{transform-box:fill-box;transform-origin:50% 100%;animation:flick .25s ease-in-out infinite alternate}',
'@keyframes smoke{0%{transform:translate(0,0) scale(.6);opacity:0}20%{opacity:.7}100%{transform:translate(8px,-90px) scale(1.6);opacity:0}}',
'.smk{transform-box:fill-box;transform-origin:50% 100%;animation:smoke 3s ease-out infinite}',
'@keyframes ringin{from{transform:scale(1.9);opacity:.25}to{transform:scale(1);opacity:1}}',
'.ring{position:absolute;inset:0;border-radius:50%;border:4px solid #E39B2E;pointer-events:none}',
'.ring.go{animation:ringin var(--beat) linear both}',
'@keyframes bounce{0%{transform:scale(1)}30%{transform:scale(.92,.86)}100%{transform:scale(1)}}',
'.mo.hit{animation:bounce .22s ease-out}',
'@keyframes swing{0%{transform:rotate(0)}40%{transform:rotate(-28deg)}100%{transform:rotate(0)}}',
'.mallet{transform-box:view-box;transform-origin:250px 40px}.mallet.hit{animation:swing .22s ease-out}',
'.syl{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 6px;padding:0 16px;font:600 17px var(--body);color:#9AA9A7}',
'.syl span.on{color:var(--jade);transform:scale(1.15)}.syl span.ok{color:#C98A12}.syl span{display:inline-block;transition:transform .1s}',
'@keyframes breath{0%{transform:scale(.62)}40%{transform:scale(1)}100%{transform:scale(.62)}}',
'.breath{width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,#FFF8EA 0%,#F8E3C2 55%,rgba(248,227,194,.15) 75%);display:grid;place-items:center;animation:breath 10s ease-in-out infinite}',
'.pills{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}',
'.pill2{height:56px;min-width:96px;border-radius:18px;border:1.5px solid var(--line);background:#fff;font:700 16px var(--display);color:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1}',
'.pill2 small{font:600 11.5px var(--body);color:#9E3C16}',
'.pill2.on{border-color:var(--jade);box-shadow:0 0 0 2px var(--jade)}',
'@media (prefers-reduced-motion: reduce){.breath,.fd .wt svg,.smk{animation:none}}'
].join('\n');
document.head.appendChild(css);

var LOTUS_IC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9567A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19 C8 16 7.5 11 12 6 C16.5 11 16 16 12 19 Z"/><path d="M12 19 C7 19 3.5 16 3 12 C6.5 12 9.5 14.5 12 19"/><path d="M12 19 C17 19 20.5 16 21 12 C17.5 12 14.5 14.5 12 19"/></svg>';
var BACK_IC = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 L8 12 L15 19"/></svg>';
var CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 L10 17 L19 7"/></svg>';
var LOCK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7A5A3A" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11 V8 a4 4 0 0 1 8 0 V11"/></svg>';
function fmt(n) { return n.toLocaleString('vi-VN'); }
function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
function every(fn, ms) { var t = setInterval(fn, ms); timers.push(t); return t; }
function cleanup() {
  timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = [];
  cleanups.forEach(function (f) { try { f(); } catch (e) { /* bỏ qua */ } }); cleanups = [];
  if (preview) { preview.stop(); preview = null; }
}
function phuocPill() { return '<div class="pp">' + LOTUS_IC + '<span class="js-ph">' + fmt(S.phuoc) + '</span> phước</div>'; }
H.onChange = function () { Array.prototype.forEach.call(document.querySelectorAll('.js-ph'), function (e) { e.textContent = fmt(S.phuoc); }); };

/* ---------- điều hướng ---------- */
function setNav(t) { Array.prototype.forEach.call(nav.querySelectorAll('button'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); }); }
function show(t) {
  cleanup(); tab = t; setNav(t);
  scr.classList.remove('full'); nav.hidden = false;
  if (t === 'ho') { scr.hidden = true; scr.innerHTML = ''; H.covered = false; return; }
  scr.hidden = false; H.covered = true; scr.scrollTop = 0;
  ({ phuoc: pagePhuoc, ao: pageAo, ca: pageCa })[t]();
}
function activity(fn) { cleanup(); scr.classList.add('full'); nav.hidden = true; scr.hidden = false; H.covered = true; scr.scrollTop = 0; fn(); }
Array.prototype.forEach.call(nav.querySelectorAll('button'), function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-tab')); }); });
$('fishChip').addEventListener('click', function () { show('ca'); });
H.onEnter = function () { nav.hidden = false; show('ho'); };
H.onExit = function () { cleanup(); tab = 'ho'; scr.hidden = true; scr.innerHTML = ''; nav.hidden = true; H.covered = false; };

function reward(title, plus, text, again) {
  var w = document.createElement('div'); w.className = 'rw';
  w.innerHTML = '<div class="bx2" role="dialog" aria-label="' + esc(title) + '">' +
    '<svg width="54" height="40" viewBox="-27 -34 54 40" aria-hidden="true" style="margin:0 auto"><ellipse cx="-10" cy="-12" rx="7" ry="17" fill="#F7B5C8" transform="rotate(-35 -10 0)"/><ellipse cx="10" cy="-12" rx="7" ry="17" fill="#F7B5C8" transform="rotate(35 10 0)"/><path d="M0 0 Q-9 -16 0 -32 Q9 -16 0 0 Z" fill="#E06A8E"/><ellipse cx="0" cy="2" rx="18" ry="4" fill="#78B86F"/></svg>' +
    '<h3>' + esc(title) + '</h3>' + (plus ? '<div class="pl">+' + plus + ' phước</div>' : '') + '<p>' + text + '</p>' +
    '<div class="row2"><button type="button" class="b1 gh" data-a="back">Về Tích phước</button><button type="button" class="b1" data-a="again">' + esc(again) + '</button></div></div>';
  scr.appendChild(w);
  return new Promise(function (res) {
    w.addEventListener('click', function (e) { var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (!a) return; w.remove(); res(a); });
  });
}
function topBar(title) {
  return '<div class="top"><button type="button" class="back" id="axBack" aria-label="Quay lại Tích phước">' + BACK_IC + '</button><h2>' + esc(title) + '</h2>' + phuocPill() + '</div>';
}
function bindBack() { $('axBack').addEventListener('click', function () { show('phuoc'); }); }

/* =====================================================================
 * TÍCH PHƯỚC
 * ===================================================================== */
function pagePhuoc() {
  var g = S.prog, didIncense = g.lastIncense === H.today();
  var tyToday = H.store.get('tyDay', { d: '', n: 0 }); var tyN = tyToday.d === H.today() ? tyToday.n : 0;
  scr.innerHTML = '<div class="pg">' +
    '<div class="hd"><div><h1>Tích phước</h1><p class="lead">Làm việc thiện nhỏ mỗi ngày để có thêm lượt thả cá.</p></div></div>' +
    '<div class="cardx"><div class="bal"><div><small>Phước điểm của bạn</small><b class="js-ph">' + fmt(S.phuoc) + '</b></div><div style="text-align:right"><small>Lượt thả hôm nay</small><span class="tn" id="tpTurns">Còn ' + S.turns + ' lượt</span></div></div>' +
    '<div class="xch"><span><b>100 phước</b> đổi được 1 lượt thả thêm</span><button type="button" class="b1" id="tpX"' + (S.phuoc < 100 ? ' disabled' : '') + '>Đổi 1 lượt</button></div></div>' +
    '<div class="note2"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="#F2C14E"/><circle cx="15" cy="10" r="6" fill="#EEF5F3"/></svg>Ngày rằm và mùng 1: tỉ lệ cá hóa thân tăng</div>' +
    actCard('#FFF1DC', ICON.incense, 'Thắp hương điểm danh', 'Mỗi ngày một nén hương ở chùa nhỏ bên hồ.', '+20 phước', 'Chuỗi ' + g.streak + ' ngày' + (didIncense ? ' · đã thắp hôm nay' : ''), didIncense ? '<span class="done">Đã thắp</span>' : '<button type="button" class="b1" data-go="incense">Thắp hương</button>') +
    actCard('#F6ECE2', ICON.mo, 'Gõ mõ, tụng kinh', 'Gõ mõ đúng nhịp theo một bài niệm ngắn.', '+15 mỗi bài', 'Đúng nhịp từ 12/16 được thêm +5', '<button type="button" class="b1" data-go="mo">Gõ mõ</button>') +
    actCard('#E4F1E6', ICON.trash, 'Nhặt rác bên bờ sông', 'Đi dạo quanh hồ, thấy rác thì chạm để nhặt.', '+5 mỗi túi 8 món', 'Túi đang có ' + S.bag + '/8', '<button type="button" class="b1" data-go="lake">Ra hồ</button>') +
    actCard('#FDEAF0', ICON.pray, 'Tùy hỷ', 'Khi có người thả cá, chắp tay hoặc niệm Phật. Cả hai cùng được phước.', '+2 mỗi lần', 'Tổng cộng ' + g.tuyhy + ' lần', '<button type="button" class="b1" data-go="lake">Ra hồ</button>') +
    actCard('#E5EEF5', ICON.zen, 'Thiền bên hồ', 'Ngồi yên 3, 5 hoặc 10 phút theo nhịp thở.', '+10 đến +40', 'Không chạm màn hình khi thiền', '<button type="button" class="b1" data-go="zen">Ngồi thiền</button>') +
    '</div>';
  $('tpX').addEventListener('click', function () {
    if (S.phuoc < 100) return;
    H.addPhuoc(-100); S.turns++; H.saveTurns(); H.renderHUD();
    $('tpTurns').textContent = 'Còn ' + S.turns + ' lượt'; $('tpX').disabled = S.phuoc < 100;
    H.toast('Đã đổi 100 phước', 'Bạn có thêm 1 lượt thả cá.');
  });
  Array.prototype.forEach.call(scr.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () {
      var g2 = b.getAttribute('data-go');
      if (g2 === 'lake') { show('ho'); H.toast('Đi dạo quanh hồ', 'Giữ mũi tên hai bên để đi. Thấy rác thì chạm để nhặt, thấy người thả cá thì tùy hỷ.'); }
      if (g2 === 'incense') activity(actIncense);
      if (g2 === 'mo') activity(actMo);
      if (g2 === 'zen') activity(actZen);
    });
  });
}
function actCard(bg, icon, name, desc, plus, sub, btn) {
  return '<div class="act"><div class="ti" style="background:' + bg + '">' + icon + '</div><div class="bd"><span class="nm">' + name + '</span><span class="ds">' + desc + '</span><span class="mt"><span class="plus">' + plus + '</span><span class="sub2">' + sub + '</span></span></div>' + btn + '</div>';
}
var ICON = {
  incense: '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M13 26 L12 8 M17 26 L17 6 M21 26 L22 8" stroke="#9B3B2A" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.4" fill="#E36A3B"/><circle cx="17" cy="5.5" r="1.4" fill="#E36A3B"/><circle cx="22" cy="7.5" r="1.4" fill="#E36A3B"/><path d="M7 24 L27 24 L25 31 L9 31 Z" fill="#C98A3A"/><rect x="6" y="22" width="22" height="3" rx="1.5" fill="#E39B2E"/></svg>',
  mo: '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M5 21 C5 12 12 7 19 8 C26 9 30 14 29 21 C28 27 22 30 16 29 C9 28 5 26 5 21 Z" fill="#B5652C"/><path d="M9 23 C14 25 22 25 27 22" stroke="#6E3510" stroke-width="1.8" fill="none"/><path d="M24 4 L31 11" stroke="#8A5A2B" stroke-width="1.8"/><circle cx="23" cy="3.5" r="2.6" fill="#C98A3A"/></svg>',
  trash: '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M9 12 L25 12 L24 29 C24 30.5 23 31 21.5 31 L12.5 31 C11 31 10 30.5 10 29 Z" fill="#5E9F5A"/><path d="M14 8 C14 5 20 5 20 8 L20 12 M14 8 L14 12" stroke="#3F7A44" stroke-width="1.8" fill="none"/><path d="M14 17 L14 26 M17 17 L17 26 M20 17 L20 26" stroke="#CFE6B8" stroke-width="1.8"/></svg>',
  pray: '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M17 29 C17 22 15 14 13.5 9 C13 7 15 6 16 7.5 L17 10 L18 7.5 C19 6 21 7 20.5 9 C19 14 17 22 17 29 Z" fill="#F5D2B0"/><path d="M17 10 L17 28" stroke="#D9A07E" stroke-width="1.4"/><circle cx="8" cy="9" r="1.6" fill="#F2C14E"/><circle cx="26" cy="7" r="1.3" fill="#F2C14E"/></svg>',
  zen: '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="8" r="4.2" fill="#F5D2B0"/><path d="M12 6.5 Q17 1 22 6.5 Q17 4.5 12 6.5 Z" fill="#3A2E2A"/><path d="M11 22 C11 15 13.5 13 17 13 C20.5 13 23 15 23 22 Z" fill="#7F95A3"/><path d="M5 26 C8 22 14 22 17 24 C20 22 26 22 29 26 C25 28.5 9 28.5 5 26 Z" fill="#687E8C"/><path d="M3 31 Q17 28 31 31" stroke="#8FCFD1" stroke-width="1.8" fill="none"/></svg>'
};

/* ---------- Thắp hương ---------- */
function actIncense() {
  scr.innerHTML = '<div class="ax">' + topBar('Thắp hương') +
    '<div style="position:relative;flex:1;display:flex;justify-content:center;align-items:flex-start;padding-top:4px">' +
    '<svg id="ihS" viewBox="0 0 390 520" style="width:100%;max-width:440px;height:auto;touch-action:none" role="img" aria-label="Bàn thờ trong chùa nhỏ bên hồ, có hai cây nến và bát hương">' +
    '<defs><radialGradient id="ihG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFE9B0"/><stop offset="1" stop-color="#FFE9B0" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="ihW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E3326"/><stop offset="1" stop-color="#6E2A1E"/></linearGradient></defs>' +
    '<rect x="0" y="0" width="390" height="520" fill="url(#ihW)"/>' +
    '<rect x="70" y="20" width="250" height="240" rx="120" fill="#5E241A"/>' +
    '<circle cx="195" cy="140" r="110" fill="url(#ihG)"/>' +
    '<g transform="translate(195 175)"><ellipse cx="-26" cy="-10" rx="16" ry="40" fill="#F2C14E" transform="rotate(-35 -26 20)"/><ellipse cx="26" cy="-10" rx="16" ry="40" fill="#F2C14E" transform="rotate(35 26 20)"/><path d="M0 34 Q-22 -10 0 -56 Q22 -10 0 34 Z" fill="#FFD966"/><ellipse cx="0" cy="40" rx="62" ry="12" fill="#E3A62E"/></g>' +
    '<rect x="20" y="280" width="350" height="26" rx="6" fill="#C98A3A"/><rect x="34" y="306" width="322" height="214" fill="#9B3B2A"/>' +
    '<path d="M60 330 H330 M60 500 H330" stroke="#E3A62E" stroke-width="3"/>' +
    candle(95) + candle(295) +
    '<g id="ihBowl"><ellipse cx="195" cy="290" rx="54" ry="10" fill="#7A5A2A"/><path d="M141 290 Q145 330 195 334 Q245 330 249 290 Z" fill="#B88A3A"/><ellipse cx="195" cy="290" rx="50" ry="8" fill="#5E4426"/>' +
    '<path d="M180 288 L178 262 M210 288 L213 266" stroke="#7A3A2C" stroke-width="2.4" stroke-linecap="round"/></g>' +
    '<g id="ihPlanted" opacity="0"><path d="M195 288 L195 196" stroke="#9B3B2A" stroke-width="4" stroke-linecap="round"/><circle cx="195" cy="196" r="4" fill="#FF7A2F"/>' +
    '<path class="smk" d="M195 192 q-6 -10 0 -20 q6 -10 0 -20" fill="none" stroke="#F3EDE4" stroke-width="3" stroke-linecap="round"/>' +
    '<path class="smk" style="animation-delay:1s" d="M195 192 q6 -10 0 -20 q-6 -10 0 -20" fill="none" stroke="#F3EDE4" stroke-width="3" stroke-linecap="round"/>' +
    '<path class="smk" style="animation-delay:2s" d="M195 192 q-5 -8 0 -16 q5 -8 0 -16" fill="none" stroke="#F3EDE4" stroke-width="3" stroke-linecap="round"/></g>' +
    '<g id="ihTray"><rect x="140" y="420" width="110" height="20" rx="6" fill="#E3C27A"/><path d="M152 424 L238 418 M152 430 L238 424 M152 436 L238 430" stroke="#9B3B2A" stroke-width="3" stroke-linecap="round"/>' +
    '<circle id="ihPulse" cx="195" cy="428" r="34" fill="none" stroke="#F2C14E" stroke-width="3" opacity=".8"><animate attributeName="r" values="26;40;26" dur="1.6s" repeatCount="indefinite"/></circle></g>' +
    '<g id="ihStick" opacity="0"><line id="ihLine" x1="0" y1="0" x2="0" y2="0" stroke="#9B3B2A" stroke-width="4" stroke-linecap="round"/><circle id="ihTip" r="4" fill="#5E241A"/><circle id="ihEmber" r="9" fill="#FFB547" opacity="0"/></g>' +
    '</svg></div>' +
    '<div class="steps" id="ihSteps"><i class="on"></i><i></i><i></i></div>' +
    '<p class="ins" id="ihIns" style="margin:10px 16px calc(env(safe-area-inset-bottom,0px) + 18px)">Chạm vào nén hương trên khay để cầm lên</p></div>';
  bindBack();
  function candle(x) {
    return '<g><rect x="' + (x - 12) + '" y="200" width="24" height="84" rx="4" fill="#D9442B"/><rect x="' + (x - 12) + '" y="200" width="7" height="84" fill="#F07A5A" opacity=".5"/>' +
      '<rect x="' + (x - 20) + '" y="280" width="40" height="10" rx="3" fill="#E3A62E"/><circle cx="' + x + '" cy="182" r="26" fill="url(#ihG)"/>' +
      '<path class="flame" d="M' + x + ' 166 Q' + (x - 9) + ' 184 ' + x + ' 196 Q' + (x + 9) + ' 184 ' + x + ' 166 Z" fill="#FFB547"/><path class="flame" d="M' + x + ' 176 Q' + (x - 4) + ' 187 ' + x + ' 194 Q' + (x + 4) + ' 187 ' + x + ' 176 Z" fill="#FFF1C4"/></g>';
  }
  var svg = $('ihS'), stick = $('ihStick'), line = $('ihLine'), tip = $('ihTip'), ember = $('ihEmber');
  var FL = [{ x: 95, y: 186 }, { x: 295, y: 186 }], BOWL = { x: 195, y: 290 };
  var step = 0, lit = false, holding = false, pos = { x: 195, y: 410 };
  function setStep(n, text) { step = n; $('ihIns').textContent = text; Array.prototype.forEach.call($('ihSteps').children, function (e, i) { e.className = i <= Math.min(n, 2) ? 'on' : ''; }); }
  function pt(e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
  function draw() {
    stick.setAttribute('opacity', holding ? 1 : 0);
    line.setAttribute('x1', pos.x); line.setAttribute('y1', pos.y); line.setAttribute('x2', pos.x + 18); line.setAttribute('y2', pos.y + 110);
    tip.setAttribute('cx', pos.x); tip.setAttribute('cy', pos.y); tip.setAttribute('fill', lit ? '#FF7A2F' : '#5E241A');
    ember.setAttribute('cx', pos.x); ember.setAttribute('cy', pos.y); ember.setAttribute('opacity', lit ? 0.55 : 0);
  }
  function near(a, b, r) { return Math.hypot(a.x - b.x, a.y - b.y) < r; }
  function tryLight() { if (!lit && (near(pos, FL[0], 30) || near(pos, FL[1], 30))) { lit = true; draw(); setStep(2, 'Hương đã cháy. Kéo nén hương cắm vào bát hương'); } }
  function plant() {
    holding = false; draw(); $('ihPlanted').setAttribute('opacity', 1); setStep(3, 'Nguyện cầu bình an');
    later(finish, 1800);
  }
  function finish() {
    var g = S.prog, td = H.today();
    var first = g.lastIncense !== td, plus = 0, text;
    if (first) {
      var y = new Date(); y.setDate(y.getDate() - 1); var yd = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
      g.streak = g.lastIncense === yd ? g.streak + 1 : 1; g.lastIncense = td; H.saveProg(); plus = 20; H.addPhuoc(20);
      text = 'Chuỗi thắp hương: <b>' + g.streak + ' ngày liên tiếp</b>. Thắp đủ 30 ngày để mở áo tràng vàng.';
    } else text = 'Hôm nay bạn đã nhận phước thắp hương rồi. Mai quay lại để giữ chuỗi nhé.';
    reward('Nguyện cầu bình an', plus, text, 'Thắp lại').then(function (a) { if (a === 'back') show('phuoc'); else activity(actIncense); });
  }
  svg.addEventListener('pointerdown', function (e) {
    var p = pt(e);
    if (step === 0 && near(p, { x: 195, y: 428 }, 60)) { holding = true; pos = { x: p.x, y: p.y - 40 }; draw(); setStep(1, 'Kéo đầu nén hương chạm vào ngọn nến để châm lửa'); $('ihPulse').setAttribute('opacity', 0); }
    if (holding) { try { svg.setPointerCapture(e.pointerId); } catch (x) { /* bỏ qua */ } svg._drag = true; }
    if (holding && !lit && (near(p, FL[0], 40) || near(p, FL[1], 40))) { pos = { x: p.x, y: p.y }; tryLight(); draw(); }
    if (holding && lit && near(p, BOWL, 60)) plant();
  });
  svg.addEventListener('pointermove', function (e) {
    if (!holding || !svg._drag) return;
    var p = pt(e); pos = { x: p.x, y: p.y - 30 }; tryLight(); draw();
  });
  svg.addEventListener('pointerup', function () {
    svg._drag = false;
    if (holding && lit && near(pos, BOWL, 70)) plant();
    else if (holding && !lit && near(pos, BOWL, 70)) $('ihIns').textContent = 'Hãy châm lửa ở ngọn nến trước đã';
  });
  draw();
}

/* ---------- Gõ mõ ---------- */
function actMo() {
  var SYL = 'Nam mô A Di Đà Phật Nam mô A Di Đà Phật Nam mô Quán Thế Âm Bồ Tát'.split(' ');
  SYL = SYL.concat(['Nam', 'mô']).slice(0, 16);
  var BEAT = 60000 / 70;
  scr.innerHTML = '<div class="ax">' + topBar('Gõ mõ, tụng kinh') +
    '<div class="syl" id="moSyl" aria-live="off">' + SYL.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
    '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:10px 16px">' +
    '<div id="moJudge" style="height:24px;font:700 18px var(--display);color:#C98A12"></div>' +
    '<div style="position:relative;width:240px;height:240px">' +
    '<span class="ring" id="moRing" style="--beat:' + BEAT + 'ms;opacity:0"></span>' +
    '<button type="button" id="moBtn" aria-label="Gõ mõ" style="position:absolute;inset:20px;border-radius:50%;border:4px dashed rgba(227,155,46,.5);background:radial-gradient(circle at 40% 35%,#FFF6E8,#F6ECE2);display:grid;place-items:center;touch-action:manipulation">' +
    '<svg class="mo" id="moSvg" width="170" height="150" viewBox="0 0 300 260" aria-hidden="true">' +
    '<ellipse cx="150" cy="232" rx="110" ry="16" fill="#9B3B2A"/>' +
    '<path d="M40 160 C40 80 100 40 160 44 C230 48 270 100 262 166 C254 220 200 240 150 236 C90 232 40 214 40 160 Z" fill="#B5652C"/>' +
    '<path d="M64 150 C76 100 120 74 176 80" stroke="#D99060" stroke-width="10" stroke-linecap="round" fill="none" opacity=".7"/>' +
    '<path d="M70 186 C120 206 200 206 244 178" stroke="#6E3510" stroke-width="10" stroke-linecap="round" fill="none"/>' +
    '<circle cx="104" cy="128" r="9" fill="#6E3510"/>' +
    '<g class="mallet" id="moMallet"><path d="M250 40 L178 120" stroke="#8A5A2B" stroke-width="12" stroke-linecap="round"/><circle cx="172" cy="128" r="20" fill="#C98A3A"/></g></svg></button></div>' +
    '<div id="moCount" style="font-size:13px;color:var(--ink-2);text-align:center">Gõ vào mõ khi vòng vàng khép lại</div>' +
    '<button type="button" class="b1 big" id="moStart" style="max-width:320px">Bắt đầu tụng</button></div></div>';
  bindBack();
  var t0 = 0, running = false, judged = [], good = 0, early = 0, late = 0, miss = 0, cur = -1;
  var syl = $('moSyl').children;
  function now() { return performance.now(); }
  function ringPulse() { var r = $('moRing'); r.classList.remove('go'); void r.offsetWidth; r.style.opacity = 1; r.classList.add('go'); }
  function judge(text, col) { var j = $('moJudge'); j.textContent = text; j.style.color = col; }
  function hit() {
    var m = $('moSvg'), ml = $('moMallet'); m.classList.remove('hit'); ml.classList.remove('hit'); void m.getBoundingClientRect(); m.classList.add('hit'); ml.classList.add('hit');
    if (!running) return;
    var k = Math.round((now() - t0) / BEAT); if (k < 0 || k > 15) return;
    var d = now() - (t0 + k * BEAT);
    if (judged[k]) return;
    if (Math.abs(d) <= 170) { judged[k] = 'ok'; good++; syl[k].className = 'ok'; judge('Đúng nhịp', '#C98A12'); }
    else if (d < 0) { judged[k] = 'e'; early++; judge('Sớm', '#6B7C7A'); }
    else { judged[k] = 'l'; late++; judge('Trễ', '#6B7C7A'); }
    $('moCount').textContent = 'Đúng nhịp ' + good + ' · Sớm ' + early + ' · Trễ ' + late;
  }
  $('moBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); hit(); });
  $('moBtn').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(); } });
  $('moStart').addEventListener('click', function () {
    $('moStart').hidden = true; var n = 3; judge('3', '#23403F');
    var ci = every(function () {
      n--;
      if (n > 0) { judge(String(n), '#23403F'); return; }
      clearInterval(ci); judge('Gõ!', '#C98A12');
      running = true; t0 = now() + BEAT; judged = []; ringPulse(); var lastRing = 0;
      var tick = every(function () {
        var r = Math.floor((now() - t0) / BEAT) + 1;
        if (r > lastRing && r <= 15) { lastRing = r; ringPulse(); }
        var k = Math.round((now() - t0) / BEAT);
        if (k !== cur && k >= 0 && k <= 15) {
          cur = k; Array.prototype.forEach.call(syl, function (s, i) { if (s.className !== 'ok') s.className = i === k ? 'on' : ''; });
        }
        for (var i = 0; i < 16; i++) if (!judged[i] && now() > t0 + i * BEAT + 200) { judged[i] = 'm'; miss++; }
        if (now() > t0 + 15 * BEAT + 400) { clearInterval(tick); running = false; done(); }
      }, 30);
    }, BEAT);
  });
  function done() {
    var plus = 15 + (good >= 12 ? 5 : 0); H.addPhuoc(plus);
    reward('Tụng xong một bài', plus, good + '/16 tiếng mõ đúng nhịp' + (good >= 12 ? ', được thêm +5 phước.' : '. Đúng nhịp từ 12 tiếng trở lên sẽ được thêm +5 phước.'), 'Tụng tiếp').then(function (a) { if (a === 'back') show('phuoc'); else activity(actMo); });
  }
}

/* ---------- Thiền ---------- */
function actZen() {
  var OPTS = [{ m: 3, p: 10 }, { m: 5, p: 20 }, { m: 10, p: 40 }], pick = OPTS[1];
  scr.innerHTML = '<div class="ax" id="zx" style="background:linear-gradient(180deg,#2E4A5A 0%,#5A7486 45%,#C9B79C 100%);color:#fff">' + topBar('Thiền bên hồ') +
    '<div id="zChoose" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:16px">' +
    '<div class="breath" style="animation-duration:14s"><svg width="70" height="60" viewBox="-35 -50 70 60" aria-hidden="true"><ellipse cx="-12" cy="-16" rx="9" ry="22" fill="#F7B5C8" transform="rotate(-35 -12 0)"/><ellipse cx="12" cy="-16" rx="9" ry="22" fill="#F7B5C8" transform="rotate(35 12 0)"/><path d="M0 0 Q-12 -22 0 -44 Q12 -22 0 0 Z" fill="#E06A8E"/></svg></div>' +
    '<p style="margin:0;font-size:14px;text-align:center;max-width:300px;line-height:1.5">Chọn thời gian, đặt máy xuống và thở theo vòng tròn. Chạm vào màn hình sẽ ngắt phiên thiền.</p>' +
    '<div class="pills" id="zPills">' + OPTS.map(function (o, i) { return '<button type="button" class="pill2' + (i === 1 ? ' on' : '') + '" data-i="' + i + '">' + o.m + ' phút<small>+' + o.p + ' phước</small></button>'; }).join('') + '</div>' +
    '<button type="button" class="b1 big" id="zStart" style="max-width:320px;background:#F2C14E;color:#3A2A0A">Bắt đầu thiền</button></div>' +
    '<div id="zRun" hidden style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:16px">' +
    '<div style="position:relative;width:260px;height:260px;display:grid;place-items:center">' +
    '<svg width="260" height="260" viewBox="0 0 260 260" style="position:absolute;inset:0" aria-hidden="true"><circle cx="130" cy="130" r="122" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="4"/><circle id="zProg" cx="130" cy="130" r="122" fill="none" stroke="#F2C14E" stroke-width="4" stroke-linecap="round" stroke-dasharray="766.5" stroke-dashoffset="766.5" transform="rotate(-90 130 130)"/></svg>' +
    '<div class="breath" id="zBreath"><span id="zTxt" style="font:700 20px var(--display);color:#5A3C10">Hít vào</span></div></div>' +
    '<div id="zTime" style="font:800 34px var(--display);font-variant-numeric:tabular-nums">05:00</div>' +
    '<div style="display:flex;gap:10px"><button type="button" class="b1 gh" id="zStop" data-safe="1">Dừng</button><button type="button" class="b1 gh" id="zFast" data-safe="1">Tua nhanh (bản thử)</button></div></div></div>';
  bindBack();
  Array.prototype.forEach.call($('zPills').children, function (b) { b.addEventListener('click', function () { pick = OPTS[+b.getAttribute('data-i')]; Array.prototype.forEach.call($('zPills').children, function (x) { x.classList.toggle('on', x === b); }); }); });
  var running = false, elapsed = 0, speed = 1, last = 0, zx = $('zx');
  $('zStart').addEventListener('click', function () {
    $('zChoose').hidden = true; $('zRun').hidden = false; running = true; elapsed = 0; last = performance.now(); var bs = performance.now();
    zx.querySelector('.top').style.opacity = 0.35;
    var tk = every(function () {
      if (!running) return;
      var n = performance.now(); elapsed += (n - last) / 1000 * speed; last = n;
      var total = pick.m * 60, left = Math.max(0, total - elapsed);
      $('zTime').textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(Math.floor(left % 60)).padStart(2, '0');
      $('zProg').setAttribute('stroke-dashoffset', String(766.5 * (1 - Math.min(1, elapsed / total))));
      var ph = ((n - bs) / 1000) % 10; $('zTxt').textContent = ph < 4 ? 'Hít vào' : 'Thở ra';
      if (left <= 0) { clearInterval(tk); running = false; finish(); }
    }, 100);
  });
  function interrupt() {
    if (!running) return; running = false;
    reward('Phiên thiền bị ngắt', 0, 'Hãy thử lại khi tâm sẵn sàng. Đặt máy xuống và không chạm màn hình cho đến khi hết giờ.', 'Thiền lại').then(function (a) { if (a === 'back') show('phuoc'); else activity(actZen); });
  }
  function onDown(e) { if (!running) return; var t = e.target; while (t && t !== zx) { if (t.getAttribute && t.getAttribute('data-safe') === '1' && t.id === 'zFast') return; t = t.parentNode; } interrupt(); }
  zx.addEventListener('pointerdown', onDown);
  $('zStop').addEventListener('click', interrupt);
  $('zFast').addEventListener('click', function () { speed = speed === 1 ? 30 : 1; $('zFast').textContent = speed === 1 ? 'Tua nhanh (bản thử)' : 'Tốc độ thật'; });
  function finish() {
    H.addPhuoc(pick.p);
    reward('Tâm an, cảnh lặng', pick.p, 'Bạn đã thiền trọn ' + pick.m + ' phút bên hồ.', 'Thiền tiếp').then(function (a) { if (a === 'back') show('phuoc'); else activity(actZen); });
  }
}

/* =====================================================================
 * TRANG PHỤC
 * ===================================================================== */
var aoTab = 'ao', aoSel = { ao: null, pk: 'beads', toc: null };
function robeIcon(c, d) { return '<svg class="ic2" viewBox="-24 -70 48 66" aria-hidden="true"><path d="M-14 -64 Q-22 -40 -20 -12 Q0 -8 20 -12 Q22 -40 14 -64 Z" fill="' + c + '"/><path d="M-14 -64 Q-22 -40 -20 -12 Q-14 -10 -8 -10 Q-14 -40 -6 -64 Z" fill="' + d + '"/><path d="M-14 -60 Q-22 -48 -22 -36" stroke="' + d + '" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M14 -60 Q22 -48 22 -36" stroke="' + c + '" stroke-width="10" stroke-linecap="round" fill="none"/></svg>'; }
var FACE = '<circle cx="0" cy="-94" r="29" fill="#3A2E2A"/><circle cx="0" cy="-90" r="26" fill="#F5D2B0"/><circle cx="-27" cy="-88" r="4.5" fill="#EFC6A2"/><circle cx="27" cy="-88" r="4.5" fill="#EFC6A2"/><path d="M-27 -94 Q-28 -120 0 -120 Q28 -120 27 -94 Q22 -106 12 -107 Q6 -101 -2 -107 Q-16 -108 -27 -94 Z" fill="#3A2E2A"/><ellipse cx="-10" cy="-88" rx="3.2" ry="4" fill="#2E2420"/><ellipse cx="10" cy="-88" rx="3.2" ry="4" fill="#2E2420"/><path d="M-4.5 -76 Q0 -71 4.5 -76 Z" fill="#B5605A"/>';
var HAIR_IC = {
  bui: '<circle cx="4" cy="-124" r="9" fill="#3A2E2A"/>',
  ngan: '',
  dai: '<path d="M-28 -98 Q-33 -66 -26 -54 L-15 -56 Q-22 -70 -18 -98 Z M28 -98 Q33 -66 26 -54 L15 -56 Q22 -70 18 -98 Z" fill="#3A2E2A"/>',
  bim: '<circle cx="-24.5" cy="-74" r="4.6" fill="#3A2E2A"/><circle cx="-25" cy="-66" r="4.1" fill="#3A2E2A"/><circle cx="-24.8" cy="-58.5" r="3.6" fill="#3A2E2A"/><circle cx="24.5" cy="-74" r="4.6" fill="#3A2E2A"/><circle cx="25" cy="-66" r="4.1" fill="#3A2E2A"/><circle cx="24.8" cy="-58.5" r="3.6" fill="#3A2E2A"/><path d="M-28.5 -54 L-21 -54 L-24.8 -50 Z M21 -54 L28.5 -54 L24.8 -50 Z" fill="#C9567A"/>',
  cuhanh: '<circle cx="0" cy="-130" r="10" fill="#3A2E2A"/><circle cx="0" cy="-142" r="4.5" fill="#3A2E2A"/><rect x="-7" y="-122" width="14" height="3.4" rx="1.7" fill="#C9567A"/>'
};
function hairIcon(k) { var back = k === 'dai' ? HAIR_IC.dai : ''; return '<svg class="ic2" viewBox="-40 -150 80 100" aria-hidden="true">' + back + FACE + (k === 'dai' ? '' : HAIR_IC[k]) + '</svg>'; }
var ACC_IC = {
  beads: '<svg class="ic2" viewBox="0 0 44 44" aria-hidden="true">' + (function () { var s = ''; for (var i = 0; i < 12; i++) s += '<circle cx="' + (22 + 13 * Math.cos(i * 0.5236)).toFixed(1) + '" cy="' + (19 + 11 * Math.sin(i * 0.5236)).toFixed(1) + '" r="2.4" fill="#6E3A1E"/>'; return s; })() + '<path d="M22 30 L22 40" stroke="#C9567A" stroke-width="2"/></svg>',
  hat: '<svg class="ic2" viewBox="0 0 44 44" aria-hidden="true"><path d="M2 30 L22 8 L42 30 Q22 35 2 30 Z" fill="#E9D7A6"/><path d="M22 8 L42 30 Q32 32 22 32 Z" fill="#D6C08A"/></svg>',
  fan: '<svg class="ic2" viewBox="0 0 44 44" aria-hidden="true"><path d="M22 36 L4 18 A26 26 0 0 1 40 18 Z" fill="#E36A3B"/><path d="M22 36 L4 18 M22 36 L12 11 M22 36 L22 8 M22 36 L32 11 M22 36 L40 18" stroke="#9B3B2A" stroke-width="1"/><path d="M4 18 A26 26 0 0 1 40 18" stroke="#F2C14E" stroke-width="2" fill="none"/></svg>',
  lantern: '<svg class="ic2" viewBox="0 0 44 44" aria-hidden="true"><path d="M8 40 L34 6" stroke="#8A5A2B" stroke-width="2"/><ellipse cx="30" cy="26" rx="9" ry="11" fill="#E8642F"/><ellipse cx="28.5" cy="25" rx="3.5" ry="7" fill="#FFB36B" opacity=".75"/><rect x="25" y="14" width="10" height="3" fill="#9B3B2A"/><rect x="25" y="35" width="10" height="3" fill="#9B3B2A"/></svg>',
  lotus: '<svg class="ic2" viewBox="0 0 44 44" aria-hidden="true"><ellipse cx="16" cy="22" rx="5" ry="11" fill="#F4B6C8" transform="rotate(-30 16 28)"/><ellipse cx="28" cy="22" rx="5" ry="11" fill="#F4B6C8" transform="rotate(30 28 28)"/><path d="M22 32 Q15 20 22 8 Q29 20 22 32 Z" fill="#E68FAA"/><path d="M10 34 Q22 39 34 34" stroke="#6FA864" stroke-width="2" fill="none"/></svg>'
};
function isOwned(k) { return !!S.owned[k]; }
function canBuy(it) { return !!it.cost; }
function statusOf(it, wearing) {
  if (isOwned(it.k)) return wearing ? { t: wearing, c: 'own' } : { t: 'Đã có', c: 'own' };
  if (it.cost) return { t: it.cost + ' phước', c: 'cost' };
  return { t: it.need, c: '' };
}
function wearingOf(it) {
  var L = S.look;
  if (aoTab === 'ao') return L.robe === it.k ? 'Đang mặc' : '';
  if (aoTab === 'toc') return L.hair === it.k ? 'Đang để' : '';
  if (it.slot === 'beads') return L.beads ? 'Đang đeo' : '';
  if (it.slot === 'hat') return L.hat ? 'Đang đội' : '';
  return L.hand === it.k ? 'Đang cầm' : '';
}
function trialLook() {
  var L = JSON.parse(JSON.stringify(S.look)), k = aoSel[aoTab];
  if (aoTab === 'ao' && k) L.robe = k;
  if (aoTab === 'toc' && k) L.hair = k;
  if (aoTab === 'pk' && k) { var it = H.ACCS.filter(function (a) { return a.k === k; })[0]; if (it.slot === 'beads') L.beads = true; else if (it.slot === 'hat') L.hat = true; else L.hand = k; }
  return L;
}
function pageAo() {
  if (!aoSel.ao) aoSel.ao = S.look.robe; if (!aoSel.toc) aoSel.toc = S.look.hair;
  scr.innerHTML = '<div class="pv"><canvas id="aoCv" aria-label="Xem trước nhân vật của bạn"></canvas><div class="hd"><h1 style="margin:0;font:800 26px var(--display)">Trang phục</h1>' + phuocPill() + '</div><div class="sel" id="aoSelName"></div></div>' +
    '<div class="pg" style="padding-top:12px"><div class="tabs" role="tablist"><button type="button" data-t="ao">Áo</button><button type="button" data-t="pk">Phụ kiện</button><button type="button" data-t="toc">Kiểu tóc</button></div>' +
    '<div class="grid3" id="aoGrid"></div><button type="button" class="b1 big" id="aoMain"></button>' +
    '<p class="lead" style="text-align:center">Trang phục bạn mặc sẽ hiện trên nhân vật ở hồ, mọi người cùng hồ đều thấy.</p></div>';
  try { preview = H.makePreview($('aoCv')); } catch (e) { preview = null; }
  Array.prototype.forEach.call(scr.querySelectorAll('.tabs button'), function (b) { b.addEventListener('click', function () { aoTab = b.getAttribute('data-t'); renderAo(); }); });
  $('aoMain').addEventListener('click', mainAct);
  renderAo();
}
function list() { return aoTab === 'ao' ? H.ROBES : aoTab === 'toc' ? H.HAIRS : H.ACCS; }
function renderAo() {
  Array.prototype.forEach.call(scr.querySelectorAll('.tabs button'), function (b) { var on = b.getAttribute('data-t') === aoTab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  var g = $('aoGrid'); g.innerHTML = '';
  list().forEach(function (it) {
    var w = wearingOf(it), st = statusOf(it, w);
    var b = document.createElement('button'); b.type = 'button'; b.className = 'it' + (aoSel[aoTab] === it.k ? ' sel' : '');
    var icon = aoTab === 'ao' ? robeIcon(it.robe, it.robeD) : aoTab === 'toc' ? hairIcon(it.k) : ACC_IC[it.k];
    b.innerHTML = icon + '<span class="n">' + esc(it.name) + '</span><span class="s ' + st.c + '">' + esc(st.t) + '</span>' +
      (!isOwned(it.k) ? '<span class="bdg" style="background:#F3EDE4">' + LOCK + '</span>' : w ? '<span class="bdg" style="background:#1F5C5A">' + CHECK + '</span>' : '');
    b.addEventListener('click', function () { aoSel[aoTab] = it.k; renderAo(); });
    g.appendChild(b);
  });
  var cur = list().filter(function (x) { return x.k === aoSel[aoTab]; })[0];
  $('aoSelName').textContent = cur ? cur.name : '';
  var m = $('aoMain'), lbl, dis = false;
  if (cur) {
    var wear = wearingOf(cur);
    if (!isOwned(cur.k)) {
      if (cur.cost) { lbl = 'Mở khóa · ' + cur.cost + ' phước'; dis = S.phuoc < cur.cost; }
      else if (cur.needKey && H.needMet(cur.needKey)) lbl = 'Nhận miễn phí';
      else { lbl = cur.need + ' để mở'; dis = true; }
    } else if (aoTab === 'pk') {
      lbl = cur.slot === 'hand' ? (wear ? 'Cất đi' : 'Cầm trên tay') : cur.slot === 'hat' ? (wear ? 'Bỏ nón' : 'Đội nón') : (wear ? 'Tháo ra' : 'Đeo vào');
    } else if (wear) { lbl = aoTab === 'ao' ? 'Đang mặc' : 'Đang để kiểu này'; dis = true; }
    else lbl = aoTab === 'ao' ? 'Mặc áo này' : 'Đổi kiểu tóc này';
  }
  m.textContent = lbl || ''; m.disabled = dis;
  if (preview) preview.set(trialLook());
}
function equip(it) {
  var L = S.look;
  if (aoTab === 'ao') L.robe = it.k;
  else if (aoTab === 'toc') L.hair = it.k;
  else if (it.slot === 'beads') L.beads = !L.beads;
  else if (it.slot === 'hat') L.hat = !L.hat;
  else L.hand = L.hand === it.k ? 'none' : it.k;
  H.applyLook();
}
function mainAct() {
  var it = list().filter(function (x) { return x.k === aoSel[aoTab]; })[0]; if (!it) return;
  if (!isOwned(it.k)) {
    if (it.cost) { if (S.phuoc < it.cost) return; H.addPhuoc(-it.cost); }
    else if (!(it.needKey && H.needMet(it.needKey))) return;
    S.owned[it.k] = 1; H.store.set('owned', S.owned);
    var L = S.look;
    if (aoTab === 'pk' && it.slot === 'hand') L.hand = it.k; else if (aoTab === 'pk' && it.slot === 'hat') L.hat = true; else if (aoTab === 'pk') L.beads = true; else if (aoTab === 'ao') L.robe = it.k; else L.hair = it.k;
    H.applyLook(); H.toast('Đã mở khóa ' + it.name, it.cost ? 'Trừ ' + it.cost + ' phước.' : 'Chúc mừng thành tích của bạn.');
  } else equip(it);
  if (preview) preview.wave('pray');
  renderAo();
}

/* =====================================================================
 * BỘ SƯU TẬP CÁ
 * ===================================================================== */
var caSel = null;
function fishOpen(sp) { return H.UNLOCK_ALL_FISH || !sp.need || H.needMet(sp.needKey); }
function fishSvg(sp, w, h, grey) {
  var b = grey ? '#C9D6D3' : sp.body, be = grey ? '#C9D6D3' : sp.belly, fi = grey ? '#B8C7C3' : sp.fin;
  return '<svg width="' + w + '" height="' + h + '" viewBox="-35 -17 70 34" aria-hidden="true">' +
    '<path d="M-20 0 L-33 -11 C-29 -4 -29 4 -33 11 Z" fill="' + fi + '"/><path d="M-6 -10.5 C-2 -16.5 6 -16.5 11 -9.5 Z" fill="' + fi + '"/>' +
    '<path d="M-22 0 C-16 -9 -2 -12 10 -10 C18 -8 24 -4 26 0 C24 4 18 8 10 9 C-2 11 -16 8 -22 0 Z" fill="' + b + '"/>' +
    '<path d="M-16 3 C-4 8 10 8 22 3 C18 7 10 9 0 9 C-8 9 -14 6 -16 3 Z" fill="' + be + '"/>' +
    (sp.spot && !grey ? '<ellipse cx="2" cy="-4" rx="7" ry="3.4" fill="' + sp.spot + '"/>' : '') +
    '<path d="M5 3 L-1 9 L9 5 Z" fill="' + fi + '"/><circle cx="19" cy="-2.5" r="1.7" fill="' + (grey ? '#A9B9B5' : '#1E1410') + '"/>' +
    (sp.whisk ? '<path d="M25 1 Q30 3 31 7 M25 0 Q31 0 33 3" stroke="' + fi + '" stroke-width="1" fill="none"/>' : '') + '</svg>';
}
function pageCa() {
  if (!caSel) caSel = S.fishK;
  var openN = H.FISH.filter(fishOpen).length;
  scr.innerHTML = '<div class="pg"><div class="hd"><div><h1>Bộ sưu tập cá</h1><p class="lead">Các loài cá bạn đã phóng sinh</p></div><div style="text-align:right"><b style="font:800 22px var(--display);color:var(--jade)">' + openN + '<span style="font-size:14px;color:var(--ink-2)">/' + H.FISH.length + '</span></b><div style="font-size:11px;color:var(--ink-2)">loài đã mở</div></div></div>' +
    '<div class="fd" id="caD"></div>' +
    (H.UNLOCK_ALL_FISH ? '<p class="lead" style="margin:0">Bản thử cho bạn bè: mọi loài cá đều được mở sẵn.</p>' : '') +
    '<div class="grid3" id="caG"></div></div>';
  renderCa();
}
function renderCa() {
  var sp = H.fishOf(caSel), open = fishOpen(sp), st = S.stats[sp.k] || { rel: 0, back: 0, tf: 0 }, chosen = S.fishK === sp.k;
  var RAR = { 1: ['Phổ biến', 'r1'], 2: ['Hiếm', 'r2'], 3: ['Quý hiếm', 'r3'] }[sp.rar];
  $('caD').innerHTML = '<div class="wt">' + fishSvg(sp, 180, 88, !open) + (open ? '' : '<b style="position:absolute;font:800 34px var(--display);color:#fff">?</b>') + '</div>' +
    '<div class="in"><div><span style="font:700 19px var(--display)">' + esc(open ? sp.name : 'Loài chưa mở') + '</span><span class="rar ' + RAR[1] + '">' + RAR[0] + '</span></div>' +
    '<span style="font-size:12.5px;color:var(--ink-2)">' + esc(open ? sp.meaning : 'Mở khóa: ' + sp.need) + '</span>' +
    '<div class="stats"><div class="stc"><b>' + (open ? st.rel : '–') + '</b><span>Đã thả</span></div><div class="stc"><b>' + (open ? st.back : '–') + '</b><span>Tạ ơn</span></div>' +
    '<button type="button" class="b1" id="caPick" style="flex:1;min-width:0;height:44px"' + (!open || chosen ? ' disabled' : '') + '>' + (!open ? 'Chưa mở khóa' : chosen ? 'Đang chọn để thả' : 'Chọn cá này để thả') + '</button></div></div>';
  $('caPick').addEventListener('click', function () { H.setFish(sp.k); H.toast('Đã chọn ' + sp.name, 'Lần thả tới bạn sẽ thả ' + sp.name.toLowerCase() + '.'); renderCa(); });
  var g = $('caG'); g.innerHTML = '';
  H.FISH.forEach(function (f) {
    var o = fishOpen(f), s2 = S.stats[f.k] || { rel: 0 };
    var b = document.createElement('button'); b.type = 'button'; b.className = 'it' + (caSel === f.k ? ' sel' : '');
    b.setAttribute('aria-label', o ? f.name : 'Loài chưa mở');
    b.innerHTML = fishSvg(f, 64, 34, !o) + '<span class="n">' + esc(o ? f.name : '???') + '</span><span class="s">' + esc(o ? 'Đã thả ' + s2.rel : f.need) + '</span>' + (S.fishK === f.k ? '<span class="bdg" style="background:#1F5C5A">' + CHECK + '</span>' : '');
    b.addEventListener('click', function () { caSel = f.k; renderCa(); });
    g.appendChild(b);
  });
}
})();

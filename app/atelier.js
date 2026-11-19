// Sunset Vice Atelier — GTA-style multi-panel cover maker. Canvas 2D only, offline.
(function () {
  'use strict';
  var LAYOUTS = ['hero', 'split', 'quad', 'solo'];
  var GRADES = {
    sunset: ['#ff7a18', '#ff2e63', '#7b2ff7'],
    neon: ['#00e5ff', '#ff2e63', '#b537f2'],
    golden: ['#ffb347', '#ff8c42', '#ffd166'],
    mono: ['#888888', '#555555', '#222222'],
  };
  var SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };
  var params = new URLSearchParams(location.search);
  var state = {
    layout: LAYOUTS.indexOf(params.get('layout')) >= 0 ? params.get('layout') : 'hero',
    grade: params.get('grade') in GRADES ? params.get('grade') : 'sunset',
    size: params.get('size') in SIZES ? params.get('size') : '1080x1080',
    title: params.get('caption') || 'SUNSET HEIST',
    subtitle: 'VICE CITY — 2026',
    place: 'bottom',
    zoom: 1,
    selected: 0,
  };
  var photos = []; // {img, name, pan:{x,y}, zoom}
  var canvas = document.getElementById('cover');
  var ctx = canvas.getContext('2d');
  var statusEl = document.getElementById('status');
  var stage = document.getElementById('stage');

  function sizeWH() { return SIZES[state.size]; }
  function panels(w, h) {
    if (state.layout === 'hero') return [
      { x: 0, y: 0, w: w * 0.62, h: h },
      { x: w * 0.62, y: 0, w: w * 0.38, h: h / 2 },
      { x: w * 0.62, y: h / 2, w: w * 0.38, h: h / 2 },
    ];
    if (state.layout === 'split') return [
      { x: 0, y: 0, w: w / 2, h: h },
      { x: w / 2, y: 0, w: w / 2, h: h },
    ];
    if (state.layout === 'quad') return [
      { x: 0, y: 0, w: w / 2, h: h / 2 },
      { x: w / 2, y: 0, w: w / 2, h: h / 2 },
      { x: 0, y: h / 2, w: w / 2, h: h / 2 },
      { x: w / 2, y: h / 2, w: w / 2, h: h / 2 },
    ];
    return [{ x: 0, y: 0, w: w, h: h }];
  }
  function drawCover(c, w, h) {
    var ps = panels(w, h);
    c.fillStyle = '#14091a'; c.fillRect(0, 0, w, h);
    ps.forEach(function (p, i) {
      var ph = photos[i % Math.max(photos.length, 1)];
      c.save();
      c.beginPath(); c.rect(p.x, p.y, p.w, p.h); c.clip();
      if (ph && ph.img) {
        var z = (ph.zoom || 1) * state.zoom;
        var iw = ph.img.naturalWidth, ih = ph.img.naturalHeight;
        var s = Math.max(p.w / iw, p.h / ih) * z;
        var dw = iw * s, dh = ih * s;
        var dx = p.x + (p.w - dw) / 2 + (ph.pan.x || 0);
        var dy = p.y + (p.h - dh) / 2 + (ph.pan.y || 0);
        c.drawImage(ph.img, dx, dy, dw, dh);
        if (state.grade === 'mono') { c.filter = 'grayscale(1) contrast(1.15)'; c.drawImage(ph.img, dx, dy, dw, dh); c.filter = 'none'; }
      } else {
        var g0 = c.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
        g0.addColorStop(0, '#ff7a18'); g0.addColorStop(1, '#7b2ff7');
        c.fillStyle = g0; c.fillRect(p.x, p.y, p.w, p.h);
      }
      var cols = GRADES[state.grade];
      var g = c.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
      g.addColorStop(0, cols[0]); g.addColorStop(0.55, cols[1]); g.addColorStop(1, cols[2]);
      c.globalAlpha = state.grade === 'mono' ? 0.08 : 0.22;
      c.fillStyle = g; c.fillRect(p.x, p.y, p.w, p.h);
      c.globalAlpha = 1;
      c.restore();
      c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(2, w / 360);
      c.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
    });
    drawCaption(c, w, h, ps);
  }
  function drawCaption(c, w, h, ps) {
    var title = (state.title || '').toUpperCase();
    var fs = Math.round(w * 0.085);
    c.save();
    c.textAlign = 'center';
    c.font = '900 ' + fs + 'px system-ui, sans-serif';
    var y;
    if (state.place === 'top') y = h * 0.14;
    else if (state.place === 'hero') y = ps[0].y + ps[0].h * 0.5;
    else y = h * 0.88;
    c.translate(w / 2, y);
    c.rotate(-0.03);
    c.lineWidth = Math.max(3, fs / 12); c.strokeStyle = '#14091a';
    c.strokeText(title, 0, 0);
    c.fillStyle = '#ffffff'; c.fillText(title, 0, 0);
    c.restore();
    c.save();
    c.textAlign = 'center';
    c.font = '700 ' + Math.round(w * 0.022) + 'px system-ui, sans-serif';
    c.fillStyle = '#ffd166';
    var sy = state.place === 'top' ? h * 0.14 + fs * 0.9 : (state.place === 'hero' ? ps[0].y + ps[0].h * 0.5 + fs * 0.9 : h * 0.88 + fs * 0.9);
    c.fillText(state.subtitle, w / 2, Math.min(sy, h - 8));
    c.restore();
  }
  function render() {
    var wh = sizeWH();
    canvas.width = wh[0]; canvas.height = wh[1];
    drawCover(ctx, wh[0], wh[1]);
    syncUI();
    var q = new URLSearchParams();
    q.set('layout', state.layout); q.set('grade', state.grade);
    q.set('size', state.size); q.set('caption', state.title);
    history.replaceState(null, '', '?' + q.toString());
    window.__atelierReady = photos.length > 0;
  }
  function syncUI() {
    document.querySelectorAll('#layoutRow button').forEach(function (b) { b.classList.toggle('active', b.dataset.layout === state.layout); });
    document.querySelectorAll('#gradeRow button').forEach(function (b) { b.classList.toggle('active', b.dataset.grade === state.grade); });
    document.querySelectorAll('#sizeRow button').forEach(function (b) { b.classList.toggle('active', b.dataset.size === state.size); });
    var row = document.getElementById('photoRow');
    row.innerHTML = '';
    photos.forEach(function (p, i) {
      var t = document.createElement('img');
      t.className = 'thumb' + (i === state.selected ? ' active' : '');
      t.src = p.img.src; t.alt = p.name || ('photo ' + (i + 1));
      t.addEventListener('click', function () { state.selected = i; render(); });
      row.appendChild(t);
    });
    document.getElementById('title').value = state.title;
  }
  function addPhoto(img, name) {
    if (photos.length >= 3) photos.shift();
    photos.push({ img: img, name: name, pan: { x: 0, y: 0 }, zoom: 1 });
    state.selected = photos.length - 1;
    statusEl.textContent = photos.length + ' photo(s) loaded.';
    render();
  }
  function loadFile(file) {
    var img = new Image();
    img.onload = function () { addPhoto(img, file.name); };
    img.onerror = function () { statusEl.textContent = 'Could not load ' + file.name; };
    img.src = URL.createObjectURL(file);
  }
  function loadSample() {
    var img = new Image();
    img.onload = function () { addPhoto(img, 'pier.jpg'); };
    img.onerror = function () { statusEl.textContent = 'Sample photo missing — load your own photos.'; render(); };
    img.src = './samples/pier.jpg';
  }
  function exportPNG() {
    var wh = sizeWH();
    var off = document.createElement('canvas');
    off.width = wh[0]; off.height = wh[1];
    drawCover(off.getContext('2d'), wh[0], wh[1]);
    var done = function (blob) {
      window.__exportResult = { width: wh[0], height: wh[1], bytes: blob ? blob.size : 0, ok: !!blob };
      if (!blob) { statusEl.textContent = 'Export failed.'; return; }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vice-cover-' + state.size + '.png';
      a.click();
      statusEl.textContent = 'Exported ' + a.download + ' (' + blob.size + ' bytes).';
    };
    if (off.toBlob) off.toBlob(done, 'image/png');
    else done(null);
  }
  // Controls
  document.querySelectorAll('#layoutRow button').forEach(function (b) {
    b.addEventListener('click', function () { state.layout = b.dataset.layout; render(); });
  });
  document.querySelectorAll('#gradeRow button').forEach(function (b) {
    b.addEventListener('click', function () { state.grade = b.dataset.grade; render(); });
  });
  document.querySelectorAll('#sizeRow button').forEach(function (b) {
    b.addEventListener('click', function () { state.size = b.dataset.size; render(); });
  });
  document.getElementById('shuffleBtn').addEventListener('click', function () {
    state.layout = LAYOUTS[(LAYOUTS.indexOf(state.layout) + 1) % LAYOUTS.length]; render();
  });
  document.getElementById('photos').addEventListener('change', function (e) {
    Array.prototype.forEach.call(e.target.files, loadFile);
  });
  document.getElementById('title').addEventListener('input', function (e) { state.title = e.target.value; render(); });
  document.getElementById('subtitle').addEventListener('input', function (e) { state.subtitle = e.target.value; render(); });
  document.getElementById('place').addEventListener('change', function (e) { state.place = e.target.value; render(); });
  document.getElementById('zoom').addEventListener('input', function (e) { state.zoom = parseFloat(e.target.value); render(); });
  document.getElementById('exportBtn').addEventListener('click', exportPNG);
  stage.addEventListener('dragover', function (e) { e.preventDefault(); });
  stage.addEventListener('drop', function (e) {
    e.preventDefault();
    Array.prototype.forEach.call(e.dataTransfer.files, loadFile);
  });
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag || !photos[state.selected]) return;
    var r = canvas.getBoundingClientRect();
    var scale = canvas.width / r.width;
    photos[state.selected].pan.x += (e.clientX - drag.x) * scale;
    photos[state.selected].pan.y += (e.clientY - drag.y) * scale;
    drag = { x: e.clientX, y: e.clientY };
    render();
  });
  canvas.addEventListener('pointerup', function () { drag = null; });
  canvas.addEventListener('click', function (e) {
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width * canvas.width;
    var y = (e.clientY - r.top) / r.height * canvas.height;
    var ps = panels(canvas.width, canvas.height);
    var hit = ps.findIndex(function (p) { return x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h; });
    if (hit >= 0 && photos.length) { state.selected = Math.min(hit, photos.length - 1); render(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (e.key >= '1' && e.key <= '4') { state.layout = LAYOUTS[parseInt(e.key, 10) - 1]; render(); }
    if (e.key === 'e' || e.key === 'E') exportPNG();
  });
  // Auto-export hook used by headless verification: ?export=1 triggers one export after load.
  var wantExport = params.get('export') === '1';
  loadSample();
  render();
  if (wantExport) setTimeout(exportPNG, 600);
})();

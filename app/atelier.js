// Sunset Vice Atelier — all app logic: state, layout math, grades,
// caption drawing, export, query params, drag / pan / zoom.
// Canvas 2D only, fully offline; photos never leave the machine.
(function () {
  'use strict';

  var SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };
  var LAYOUT_ORDER = ['hero', 'split', 'quad', 'solo'];
  // Panel rects in normalised [x, y, w, h] coordinates.
  var LAYOUTS = {
    hero: [[0, 0, 0.62, 1], [0.62, 0, 0.38, 0.5], [0.62, 0.5, 0.38, 0.5]],
    split: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]],
    quad: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
    solo: [[0, 0, 1, 1]]
  };
  var GRADES = {
    sunset: { stops: [[0, 'rgba(255,122,24,0.34)'], [0.55, 'rgba(255,46,136,0.22)'], [1, 'rgba(90,20,120,0.30)']], filter: 'saturate(1.25) contrast(1.08)' },
    neon: { stops: [[0, 'rgba(46,230,255,0.30)'], [0.5, 'rgba(120,40,255,0.20)'], [1, 'rgba(255,46,136,0.32)']], filter: 'saturate(1.35) contrast(1.1)' },
    golden: { stops: [[0, 'rgba(255,197,61,0.30)'], [0.6, 'rgba(255,140,60,0.20)'], [1, 'rgba(255,90,40,0.26)']], filter: 'saturate(1.2) contrast(1.05)' },
    noir: { stops: [[0, 'rgba(255,255,255,0.06)'], [1, 'rgba(0,0,0,0.34)']], filter: 'grayscale(1) contrast(1.18) brightness(1.05)' }
  };

  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');

  var params = new URLSearchParams(location.search);
  var state = {
    layout: LAYOUTS[params.get('layout')] ? params.get('layout') : 'hero',
    grade: GRADES[params.get('grade')] ? params.get('grade') : 'sunset',
    size: SIZES[params.get('size')] ? params.get('size') : '1080x1080',
    title: (params.get('caption') || 'VICE CITY').slice(0, 24),
    subtitle: 'SUNSET STORIES',
    captionPos: params.get('pos') || 'bottom',
    selected: 0
  };
  var photos = []; // {img, name, zoom, panX, panY}
  var assign = {}; // panel index -> photo index
  var drag = null;

  function panelRects() { return LAYOUTS[state.layout]; }

  function photoFor(panel) {
    if (photos.length === 0) return null;
    var idx = assign[panel];
    if (idx === undefined || !photos[idx]) idx = panel % photos.length;
    return photos[idx];
  }


  function render(targetCtx, W, H) {
    var c = targetCtx || ctx;
    c.save();
    c.fillStyle = '#0d0712';
    c.fillRect(0, 0, W, H);
    panelRects().forEach(function (r, i) {
      var px = r[0] * W, py = r[1] * H, pw = r[2] * W, ph = r[3] * H;
      c.save();
      c.beginPath();
      c.rect(px, py, pw, ph);
      c.clip();
      var photo = photoFor(i);
      if (photo) drawPhotoCoverInto(c, photo, px, py, pw, ph);
      c.restore();
      // Thin white keyline between panels.
      c.strokeStyle = 'rgba(255,247,238,0.9)';
      c.lineWidth = Math.max(2, W * 0.004);
      c.strokeRect(px + c.lineWidth / 2, py + c.lineWidth / 2, pw - c.lineWidth, ph - c.lineWidth);
    });
    drawGradeOverlayInto(c, W, H);
    drawCaptionInto(c, W, H);
    c.restore();
  }

  // The draw helpers take an explicit context so export can reuse them.
  function drawPhotoCoverInto(c, photo, px, py, pw, ph) {
    var img = photo.img;
    var base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * photo.zoom;
    var dw = img.naturalWidth * base, dh = img.naturalHeight * base;
    var dx = px + (pw - dw) / 2 + photo.panX * pw;
    var dy = py + (ph - dh) / 2 + photo.panY * ph;
    c.save();
    c.filter = GRADES[state.grade].filter;
    c.drawImage(img, dx, dy, dw, dh);
    c.restore();
  }
  function drawGradeOverlayInto(c, W, H) {
    var g = c.createLinearGradient(0, 0, W, H);
    GRADES[state.grade].stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  function drawCaptionInto(c, W, H) {
    var title = state.title.toUpperCase() || 'VICE CITY';
    var bandH = H * 0.24;
    var y0 = state.captionPos === 'top' ? 0 : H - bandH;
    if (state.captionPos === 'hero') {
      var hero = panelRects()[0];
      y0 = hero[1] * H + hero[3] * H - bandH;
    }
    var band = c.createLinearGradient(0, y0, 0, y0 + bandH);
    band.addColorStop(0, 'rgba(10,4,16,0)');
    band.addColorStop(1, 'rgba(10,4,16,0.62)');
    c.fillStyle = band;
    c.fillRect(0, y0, W, bandH);
    var cx = W / 2, cy = y0 + bandH * 0.52;
    c.save();
    c.translate(cx, cy);
    c.rotate(-0.03);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    var px = Math.round(W * 0.105);
    c.font = '900 ' + px + 'px system-ui, "Segoe UI", Arial, sans-serif';
    c.shadowColor = 'rgba(255,46,136,0.55)';
    c.shadowBlur = px * 0.25;
    c.shadowOffsetY = px * 0.05;
    c.lineWidth = Math.max(3, px * 0.09);
    c.strokeStyle = '#160818';
    c.strokeText(title, 0, 0);
    c.fillStyle = '#fff7ee';
    c.fillText(title, 0, 0);
    c.restore();
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    try { c.letterSpacing = Math.round(W * 0.006) + 'px'; } catch (e) {}
    c.font = '700 ' + Math.round(W * 0.028) + 'px system-ui, "Segoe UI", Arial, sans-serif';
    c.fillStyle = '#ffc53d';
    c.fillText(state.subtitle.toUpperCase(), cx, y0 + bandH * 0.86);
    c.font = '700 ' + Math.round(W * 0.02) + 'px system-ui, "Segoe UI", Arial, sans-serif';
    c.fillStyle = 'rgba(255,247,238,0.9)';
    c.fillText('VICE CITY — 2026', cx, y0 + bandH * 0.12);
    c.restore();
  }

  function draw() {
    var dims = SIZES[state.size];
    canvas.width = dims[0];
    canvas.height = dims[1];
    render(ctx, dims[0], dims[1]);
    syncControls();
    syncUrl();
  }

  function syncControls() {
    document.querySelectorAll('#layoutRow button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.layout === state.layout ? 'true' : 'false');
    });
    document.querySelectorAll('#gradeRow button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.grade === state.grade ? 'true' : 'false');
    });
    document.querySelectorAll('#sizeRow button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.size === state.size ? 'true' : 'false');
    });
    var strip = document.getElementById('photoStrip');
    strip.innerHTML = '';
    photos.forEach(function (p, i) {
      var thumb = document.createElement('img');
      thumb.src = p.img.src;
      thumb.alt = p.name;
      thumb.title = p.name + ' — click to select';
      thumb.setAttribute('aria-pressed', i === state.selected ? 'true' : 'false');
      thumb.addEventListener('click', function () { state.selected = i; draw(); });
      strip.appendChild(thumb);
    });
    var zoom = document.getElementById('zoomRange');
    zoom.value = photos[state.selected] ? photos[state.selected].zoom : 1;
  }

  function syncUrl() {
    var q = new URLSearchParams();
    q.set('layout', state.layout);
    q.set('grade', state.grade);
    q.set('size', state.size);
    q.set('caption', state.title);
    q.set('pos', state.captionPos);
    history.replaceState(null, '', '?' + q.toString());
  }

  function exportPng() {
    var dims = SIZES[state.size];
    var off = document.createElement('canvas');
    off.width = dims[0];
    off.height = dims[1];
    render(off.getContext('2d'), dims[0], dims[1]);
    off.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vice-cover-' + state.size + '.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }, 'image/png');
  }

  function addPhoto(img, name) {
    if (photos.length >= 3) photos.shift();
    photos.push({ img: img, name: name, zoom: 1, panX: 0, panY: 0 });
    state.selected = photos.length - 1;
    draw();
  }

  function loadSample(src, name) {
    var img = new Image();
    img.onload = function () { addPhoto(img, name); };
    img.src = src;
  }

  // Controls.
  document.querySelectorAll('#layoutRow button').forEach(function (b) {
    b.addEventListener('click', function () { state.layout = b.dataset.layout; draw(); });
  });
  document.querySelectorAll('#gradeRow button').forEach(function (b) {
    b.addEventListener('click', function () { state.grade = b.dataset.grade; draw(); });
  });
  document.querySelectorAll('#sizeRow button').forEach(function (b) {
    b.addEventListener('click', function () { state.size = b.dataset.size; draw(); });
  });
  document.getElementById('shuffleBtn').addEventListener('click', function () {
    var next = (LAYOUT_ORDER.indexOf(state.layout) + 1) % LAYOUT_ORDER.length;
    state.layout = LAYOUT_ORDER[next];
    draw();
  });
  document.getElementById('exportBtn').addEventListener('click', exportPng);
  document.getElementById('titleInput').addEventListener('input', function (e) {
    state.title = e.target.value.slice(0, 24);
    draw();
  });
  document.getElementById('subtitleInput').addEventListener('input', function (e) {
    state.subtitle = e.target.value.slice(0, 40);
    draw();
  });
  document.getElementById('captionPos').addEventListener('change', function (e) {
    state.captionPos = e.target.value;
    draw();
  });
  document.getElementById('zoomRange').addEventListener('input', function (e) {
    var p = photos[state.selected];
    if (p) { p.zoom = parseFloat(e.target.value); draw(); }
  });
  document.getElementById('photoInput').addEventListener('change', function (e) {
    Array.prototype.forEach.call(e.target.files, function (file) {
      var img = new Image();
      img.onload = function () { addPhoto(img, file.name); };
      img.src = URL.createObjectURL(file);
    });
    e.target.value = '';
  });

  // Stage: click a panel assigns the selected photo; drag inside pans it.
  function panelAt(clientX, clientY) {
    var box = canvas.getBoundingClientRect();
    var x = (clientX - box.left) / box.width, y = (clientY - box.top) / box.height;
    for (var i = 0; i < panelRects().length; i++) {
      var r = panelRects()[i];
      if (x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]) return { index: i, x: x, y: y, rect: r };
    }
    return null;
  }
  canvas.addEventListener('pointerdown', function (e) {
    var hit = panelAt(e.clientX, e.clientY);
    if (!hit) return;
    drag = { panel: hit.index, moved: false, lastX: hit.x, lastY: hit.y };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var hit = panelAt(e.clientX, e.clientY);
    if (!hit) return;
    var photo = photoFor(drag.panel);
    if (photo) {
      photo.panX += (hit.x - drag.lastX) / hit.rect[2];
      photo.panY += (hit.y - drag.lastY) / hit.rect[3];
      photo.panX = Math.max(-0.5, Math.min(0.5, photo.panX));
      photo.panY = Math.max(-0.5, Math.min(0.5, photo.panY));
      if (Math.abs(hit.x - drag.lastX) + Math.abs(hit.y - drag.lastY) > 0.004) drag.moved = true;
      drag.lastX = hit.x;
      drag.lastY = hit.y;
      draw();
    }
  });
  canvas.addEventListener('pointerup', function () {
    if (drag && !drag.moved && photos[state.selected]) {
      assign[drag.panel] = state.selected;
      draw();
    }
    drag = null;
  });
  canvas.addEventListener('dragover', function (e) { e.preventDefault(); });
  canvas.addEventListener('drop', function (e) {
    e.preventDefault();
    Array.prototype.forEach.call(e.dataTransfer.files, function (file) {
      if (!file.type || file.type.indexOf('image/') !== 0) return;
      var img = new Image();
      img.onload = function () { addPhoto(img, file.name); };
      img.src = URL.createObjectURL(file);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (e.key >= '1' && e.key <= '4') { state.layout = LAYOUT_ORDER[Number(e.key) - 1]; draw(); }
    if (e.key === 'e' || e.key === 'E') exportPng();
  });

  // First paint never opens empty: auto-load the bundled samples.
  document.getElementById('titleInput').value = state.title;
  document.getElementById('captionPos').value = state.captionPos;
  loadSample('samples/pier.jpg', 'pier.jpg');
  loadSample('samples/boulevard.jpg', 'boulevard.jpg');
  draw();
})();

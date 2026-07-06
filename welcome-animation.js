/*
 * Përshëndetje — a living ASCII postcard of Pristina.
 *
 * Layers (back to front): sky driven by the real time of day → stars &
 * meteors → sun/moon → drifting clouds → two mountain ridges with snow
 * caps (pointer parallax) → city skyline with windows that wake up at
 * night → street with passing headlights. Birds cross by day, fireflies
 * hover over the rooftops at night.
 *
 * Interactions: move the pointer for parallax + a lantern glow at night,
 * click the sky for a shooting star, click the city to wake the windows.
 */
(function () {
  "use strict";

  var COLS = 100;
  var ROWS = 40;
  var FPS = 18;
  var CHAR_PX = 7;
  var INTRO_MS = 4600;
  var MORPH_MS = 900;
  var PULSE_LIFE_MS = 2600;

  var CHARS = " .:-=+*#%@";
  var TECH_CHARS = "{}();";

  var BAYER_8 = [
     0, 32,  8, 40,  2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44,  4, 36, 14, 46,  6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
     3, 35, 11, 43,  1, 33,  9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47,  7, 39, 13, 45,  5, 37,
    63, 31, 55, 23, 61, 29, 53, 21
  ];

  var GLYPHS = {
    I: ["###", " # ", " # ", " # ", "###"],
    L: ["#  ", "#  ", "#  ", "#  ", "###"],
    R: ["## ", "# #", "## ", "# #", "# #"]
  };
  var NAME = "ILIR";

  var BUILDING_W = 6;

  var el = null;
  var stageEl = null;
  var offscreen = null;
  var ctx = null;
  var ctxOut = null;
  var rafId = null;
  var resizeObs = null;
  var running = false;
  var shouldRun = false;
  var reducedMotion = false;
  var lastTick = 0;
  var timeOrigin = 0;
  var introStart = 0;
  var introPlayed = false;
  var pointer = { x: -1, y: -1, active: false };
  var meteors = [];
  var pulses = [];
  var nextMeteorAt = 0;
  var morphState = null;
  var nameMaskCache = { key: "", cells: null };

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isLightTheme() {
    return document.documentElement.classList.contains("theme-light");
  }

  // Pristina seasons: dimër (winter), pranverë (spring), verë (summer), vjeshtë (autumn)
  function season() {
    var m = new Date().getMonth();
    if (m === 11 || m <= 1) return "winter";
    if (m <= 4) return "spring";
    if (m <= 7) return "summer";
    return "autumn";
  }

  function hash(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function smoothstep(edge0, edge1, x) {
    var t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function timeWeights() {
    var h = new Date().getHours() + new Date().getMinutes() / 60;
    var night = Math.max(smoothstep(18.5, 21.5, h), 1 - smoothstep(5.5, 7.5, h));
    var midday = smoothstep(9, 11.5, h) * (1 - smoothstep(16, 18.5, h));
    var dawn = clamp(1 - night - midday, 0, 1);
    // The light theme prints a daytime edition: night hours become dusk
    if (isLightTheme()) {
      dawn += night;
      night = 0;
    }
    var sum = night + midday + dawn || 1;
    return { night: night / sum, midday: midday / sum, dawn: dawn / sum };
  }

  function celestialPos(weights) {
    var sunX = lerp(0.64, 0.78, weights.midday) + lerp(0.08, -0.08, weights.dawn);
    var sunY = lerp(0.38, 0.2, weights.midday) + weights.night * 0.06;
    return { x: COLS * sunX, y: streetY() * sunY };
  }

  function resetCanvas() {
    if (!offscreen) {
      offscreen = document.createElement("canvas");
      ctx = offscreen.getContext("2d", { alpha: false });
    }
    offscreen.width = COLS;
    offscreen.height = ROWS;
  }

  function resize() {
    if (!el || !stageEl) return;
    var rect = stageEl.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;

    var charW = CHAR_PX * 0.58;
    var charH = CHAR_PX;
    var nextCols = clamp(Math.floor(rect.width / charW), 48, 160);
    var nextRows = clamp(Math.floor(rect.height / charH), 20, 80);

    if (nextCols !== COLS || nextRows !== ROWS) {
      COLS = nextCols;
      ROWS = nextRows;
      resetCanvas();
    }

    var dpr = window.devicePixelRatio || 1;
    el.width = rect.width * dpr;
    el.height = rect.height * dpr;
    if (ctxOut) {
      ctxOut.scale(dpr, dpr);
      ctxOut.textBaseline = "top";
      // Setting width clears the (opaque) canvas to black. Repaint right
      // away — rAF may be paused (hidden tab), and a black hole is worse
      // than a slightly stale frame.
      ctxOut.fillStyle = isLightTheme() ? "#ede7d8" : "#070a0f";
      ctxOut.fillRect(0, 0, rect.width, rect.height);
      if (shouldRun && ctx) {
        var now = performance.now();
        renderCanvasAscii(buildFrame((now - timeOrigin) * 0.001, now).pixels);
      }
    }
  }

  /* ----- Scene geometry -----
     The welcome copy overlays the lower ~half of the stage, so the whole
     composition is anchored to streetY() ≈ 46% of the grid: everything
     interesting stays in the visible band above the text. */

  function streetY() {
    return Math.max(8, Math.floor(ROWS * 0.46));
  }

  function parallaxX(depth) {
    if (!pointer.active) return 0;
    return (pointer.x - 0.5) * depth;
  }

  function ridgeFarY(x) {
    var sy = streetY();
    var nx = (x + parallaxX(3)) * 0.085;
    return sy * (0.52
      + 0.12 * Math.sin(nx * 1.35 + 2.1)
      + 0.08 * Math.sin(nx * 0.52 + 0.7)
      + 0.03 * Math.sin(nx * 3.3));
  }

  function ridgeNearY(x) {
    var sy = streetY();
    var nx = (x + parallaxX(6)) * 0.11;
    return sy * (0.72
      + 0.08 * Math.sin(nx * 1.1 + 0.4)
      + 0.05 * Math.sin(nx * 2.3 + 3.2));
  }

  function buildingTop(x) {
    if (x % BUILDING_W === BUILDING_W - 1) return -1;
    var b = Math.floor(x / BUILDING_W);
    var h = 2 + Math.floor(hash(b * 13.7, 3.1) * streetY() * 0.42);
    return streetY() - h;
  }

  function hasAntenna(x) {
    var b = Math.floor(x / BUILDING_W);
    return (x % BUILDING_W === 2) && hash(b, 77) > 0.72;
  }

  function windowGlow(x, y, t, weights) {
    var seed = hash(x * 3.17, y * 7.91);
    var litRatio = 0.22 + weights.night * 0.55;
    if (seed > litRatio) return 0;
    return 0.72 + 0.28 * Math.sin(t * (0.4 + seed) + seed * 40);
  }

  function pulseBoost(x, y, now) {
    var boost = 0;
    for (var i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      var age = now - p.born;
      if (age > PULSE_LIFE_MS) continue;
      var radius = (age / PULSE_LIFE_MS) * 26;
      var band = Math.abs(Math.hypot(x - p.x, y - p.y) - radius);
      if (band < 3) boost += (1 - band / 3) * (1 - age / PULSE_LIFE_MS) * 1.2;
    }
    return boost;
  }

  /* ----- Colors ----- */

  function skyColor(nyTop, weights) {
    var dawnTop = [36, 34, 70], dawnBot = [190, 108, 82];
    var midTop = [38, 90, 156], midBot = [140, 190, 222];
    var nightTop = [5, 7, 20], nightBot = [18, 26, 46];
    // The print edition needs a bright sky so the paper shows through;
    // only faint hatching should survive near the top.
    if (isLightTheme()) {
      dawnTop = [205, 175, 150]; dawnBot = [242, 220, 190];
      midTop = [195, 218, 235]; midBot = [246, 248, 250];
    }
    var rgb = [0, 0, 0];
    for (var c = 0; c < 3; c++) {
      rgb[c] = weights.dawn * lerp(dawnBot[c], dawnTop[c], nyTop)
        + weights.midday * lerp(midBot[c], midTop[c], nyTop)
        + weights.night * lerp(nightBot[c], nightTop[c], nyTop);
    }
    return rgb;
  }

  function sceneColor(x, y, t, now, weights) {
    var sy = streetY();
    var rgb = skyColor(clamp(1 - y / sy, 0, 1), weights);

    var cel = celestialPos(weights);
    var bodyDist = Math.hypot(x - cel.x, y - cel.y);
    if (weights.night < 0.45) {
      if (bodyDist < 3) return [255, 244, 176, 0];
      if (bodyDist < 8) {
        var halo = (1 - bodyDist / 8) * 0.4;
        rgb[0] += halo * 200;
        rgb[1] += halo * 185;
        rgb[2] += halo * 80;
      }
    } else if (bodyDist < 2.5) {
      return [222, 226, 240, 0];
    } else if (bodyDist < 5) {
      var moonHalo = (1 - bodyDist / 5) * 0.25;
      rgb[0] += moonHalo * 180;
      rgb[1] += moonHalo * 185;
      rgb[2] += moonHalo * 200;
    }

    var rf = ridgeFarY(x);

    if (weights.night > 0.25 && y < rf - 1) {
      if (hash(x * 7.3, y * 11.1) > 0.965) {
        var tw = 0.55 + 0.45 * Math.sin(t * 2.5 + hash(x, y) * 20);
        return [255 * tw, 255 * tw, 220 * tw, 5];
      }
    }

    if (weights.night < 0.85) {
      for (var c = 0; c < 3; c++) {
        var cx = ((COLS * (0.15 + c * 0.3) + t * (5 + c * 2) + parallaxX(2)) % (COLS + 20)) - 10;
        var cy = ROWS * (0.1 + c * 0.06);
        var cd = Math.hypot(x - cx, (y - cy) * 1.6);
        if (cd < 5 + c) {
          var puff = (1 - cd / (6 + c)) * (1 - weights.night * 0.85);
          rgb[0] = lerp(rgb[0], 235, puff * 0.8);
          rgb[1] = lerp(rgb[1], 240, puff * 0.8);
          rgb[2] = lerp(rgb[2], 248, puff * 0.8);
        }
      }
    }

    // Lantern glow: pointer softly lights the night around it
    if (pointer.active && weights.night > 0.3) {
      var ld = Math.hypot(x - pointer.x * COLS, y - pointer.y * ROWS);
      if (ld < 9) {
        var lg = (1 - ld / 9) * 26 * weights.night;
        rgb[0] += lg * 1.3;
        rgb[1] += lg * 1.1;
        rgb[2] += lg * 0.6;
      }
    }

    if (y >= sy) {
      // Street with two looping cars, then a quick fade under the copy panel
      if (y <= sy + 1) {
        for (var k = 0; k < 2; k++) {
          var span = COLS + 24;
          var pos = (t * (7 + k * 4) + k * 53) % span - 12;
          var carX = k === 0 ? pos : COLS - pos;
          var dir = k === 0 ? 1 : -1;
          if (y === sy && Math.abs(x - carX) < 1.2) return [255, 210, 130, 7];
          if (y === sy && Math.abs(x - (carX - dir * 2)) < 1) return [190, 82, 66, 7];
        }
        var road = 13 + hash(x, y) * 9 - weights.night * 5;
        return [clamp(road, 0, 255), clamp(road + 2, 0, 255), clamp(road + 5, 0, 255), 0];
      }
      // Below the street the copy panel takes over: clean paper / clean dark
      if (isLightTheme()) return [252, 250, 242, 0];
      var deep = Math.max(0, 10 - (y - sy) * 2) + hash(x, y) * 3;
      return [deep, deep + 1, deep + 2, 0];
    }

    var bt = buildingTop(x);
    if (bt >= 0 && y >= bt) {
      var day = 1 - weights.night;
      var base = 10 + hash(Math.floor(x / BUILDING_W), 5) * 8;
      var body = [base + day * 24, base + day * 27, base + 6 + day * 33];
      if (y === bt) {
        body[0] += 12; body[1] += 12; body[2] += 14;
      }
      var isWin = y > bt && (x % BUILDING_W) % 2 === 1 && (y - bt) % 2 === 0;
      if (isWin) {
        var glow = windowGlow(x, y, t, weights) + pulseBoost(x, y, now);
        if (glow > 0.05) {
          glow = Math.min(glow, 1.4);
          return [clamp(200 * glow + 40, 0, 255), clamp(148 * glow + 30, 0, 255), clamp(58 * glow + 15, 0, 255), 1];
        }
        return [clamp(body[0] + 6, 0, 255), clamp(body[1] + 6, 0, 255), clamp(body[2] + 9, 0, 255), 0];
      }
      return [clamp(body[0], 0, 255), clamp(body[1], 0, 255), clamp(body[2], 0, 255), 2];
    }

    if (bt >= 0 && hasAntenna(x) && y >= bt - 2 && y < bt) {
      if (y === bt - 2) {
        var blink = Math.sin(t * 2.2 + x) > 0.6 ? 1 : 0.25;
        return [220 * blink, 62 * blink, 62 * blink, 5];
      }
      return [40, 44, 50, 2];
    }

    var rn = ridgeNearY(x);
    if (y >= rn) {
      var dayl = 1 - weights.night * 0.7;
      var shade = 18 + (y - rn) * 2.2 + hash(x, y) * 8;
      return [
        clamp((shade * 0.72 + 8) * dayl, 0, 255),
        clamp((shade + 13) * dayl, 0, 255),
        clamp((shade * 0.78 + 10) * dayl, 0, 255),
        9
      ];
    }

    if (y >= rf) {
      var dayf = 1 - weights.night * 0.6;
      var depth = y - rf;
      // Snow caps on the high crests
      if (depth < 1.4 && rf < streetY() * 0.55) {
        var snow = (205 - weights.night * 120);
        return [snow, snow + 4, snow + 14, 8];
      }
      var slate = 26 + depth * 2 + hash(x * 1.7, y) * 6;
      return [
        clamp((slate * 0.9 + 4) * dayf, 0, 255),
        clamp((slate * 0.95 + 8) * dayf, 0, 255),
        clamp((slate + 16) * dayf, 0, 255),
        8
      ];
    }

    return [clamp(Math.floor(rgb[0]), 0, 255), clamp(Math.floor(rgb[1]), 0, 255), clamp(Math.floor(rgb[2]), 0, 255), 0];
  }

  /* ----- Overlays ----- */

  function stampPixel(d, x, y, r, g, b, type) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    var i = (y * COLS + x) * 4;
    d[i] = clamp(Math.max(d[i], r), 0, 255);
    d[i + 1] = clamp(Math.max(d[i + 1], g), 0, 255);
    d[i + 2] = clamp(Math.max(d[i + 2], b), 0, 255);
    if (type !== undefined) d[i + 3] = type;
  }

  function spawnMeteor(cx, cy) {
    var dir = cx > COLS / 2 ? -1 : 1;
    meteors.push({
      x: cx,
      y: cy,
      vx: dir * (14 + Math.random() * 8),
      vy: 7 + Math.random() * 5,
      born: performance.now(),
      life: 1200 + Math.random() * 500
    });
  }

  function drawMeteors(d, now) {
    meteors = meteors.filter(function (m) { return now - m.born < m.life; });
    for (var i = 0; i < meteors.length; i++) {
      var m = meteors[i];
      var age = (now - m.born) / 1000;
      var fade = 1 - (now - m.born) / m.life;
      var hx = m.x + m.vx * age;
      var hy = m.y + m.vy * age;
      var len = Math.hypot(m.vx, m.vy);
      var ux = m.vx / len;
      var uy = m.vy / len;
      for (var s = 0; s < 6; s++) {
        var b = fade * (1 - s / 6);
        stampPixel(d, hx - ux * s * 0.9, hy - uy * s * 0.9, 255 * b, 240 * b, 190 * b, 5);
      }
    }
  }

  function drawBirds(d, t, weights) {
    if (weights.night > 0.5) return;
    // Summer skies over Pristina are full of swallows
    var count = season() === "summer" ? 8 : 5;
    for (var i = 0; i < count; i++) {
      var s = i * 19.3;
      var bx = ((t * (3.5 + i * 0.7) + hash(s, 1) * COLS * 2) % (COLS + 16)) - 8;
      var by = streetY() * (0.12 + hash(s, 2) * 0.3) + Math.sin(t * 1.3 + s) * 1.5;
      var flap = Math.sin(t * 6 + s) > 0 ? -0.6 : 0.2;
      var v = 150 * (1 - weights.night);
      stampPixel(d, bx - 1, by + flap, v * 0.4, v * 0.42, v * 0.5, 4);
      stampPixel(d, bx, by, v * 0.5, v * 0.52, v * 0.6, 4);
      stampPixel(d, bx + 1, by + flap, v * 0.4, v * 0.42, v * 0.5, 4);
    }
  }

  function drawSeasonal(d, t, weights) {
    var s = season();
    var sy = streetY();

    if (s === "winter") {
      // Slow snowfall, drifting sideways, settling at the street line
      for (var i = 0; i < 34; i++) {
        var seed = i * 12.9;
        var fy = (t * (2.2 + (i % 4) * 0.7) + hash(seed, 9) * ROWS * 3) % (sy + 1);
        var fx = (hash(seed, 7) * COLS + Math.sin(t * 0.7 + seed) * 3 + COLS) % COLS;
        var w = 200 + hash(seed, 5) * 55;
        stampPixel(d, fx, fy, w, w + 4, w + 14, 5);
      }
      return;
    }

    if (s === "autumn") {
      // Slanted rain hatching, heavier by night
      var drops = weights.night > 0.5 ? 30 : 22;
      for (var r = 0; r < drops; r++) {
        var rs = r * 17.3;
        var ry = (t * (13 + (r % 5) * 3) + hash(rs, 4) * ROWS * 2) % sy;
        var rx = (hash(rs, 3) * COLS - ry * 0.35 + COLS * 2) % COLS;
        stampPixel(d, rx, ry, 96, 116, 148, 10);
        stampPixel(d, rx + 0.5, ry - 1, 76, 94, 122, 10);
      }
      return;
    }

    if (s === "spring") {
      // Blossom petals loosed from somewhere upwind
      for (var p = 0; p < 14; p++) {
        var ps = p * 23.1;
        var py = (t * (1.6 + (p % 3) * 0.5) + hash(ps, 9) * ROWS * 3) % (sy + 1);
        var px = (hash(ps, 7) * COLS + Math.sin(t * 1.1 + ps) * 4 + COLS) % COLS;
        var blush = 0.7 + 0.3 * Math.sin(t * 2 + ps);
        stampPixel(d, px, py, 235 * blush, 168 * blush, 190 * blush, 5);
      }
    }
  }

  function drawFireflies(d, t, weights) {
    if (weights.night < 0.35) return;
    for (var f = 0; f < 9; f++) {
      var fs = f * 23.7 + 100;
      var fx = (hash(fs, 3) * COLS + Math.sin(t * 0.8 + fs) * 4 + COLS) % COLS;
      var fy = streetY() * (0.55 + hash(fs, 4) * 0.32) + Math.sin(t * 1.2 + fs) * 1.6;
      var blink = 0.4 + 0.6 * Math.max(0, Math.sin(t * 4 + fs));
      stampPixel(d, fx, fy, 200 * blink * weights.night, 255 * blink * weights.night, 120 * blink * weights.night, 5);
    }
  }

  /* ----- Intro: the name dissolves into the skyline ----- */

  function nameCells() {
    var key = COLS + "x" + ROWS;
    if (nameMaskCache.key === key) return nameMaskCache.cells;

    var xs = COLS >= 96 ? 3 : 2;
    var ys = ROWS >= 34 ? 2 : 1;
    var letterW = 3 * xs;
    var totalW = NAME.length * letterW + (NAME.length - 1) * xs;
    var startX = Math.max(0, Math.floor((COLS - totalW) / 2));
    var startY = Math.max(1, Math.floor(streetY() * 0.5 - (5 * ys) / 2));

    var cells = new Uint8Array(COLS * ROWS);
    for (var li = 0; li < NAME.length; li++) {
      var glyph = GLYPHS[NAME.charAt(li)];
      if (!glyph) continue;
      var gx = startX + li * (letterW + xs);
      for (var row = 0; row < 5; row++) {
        for (var col = 0; col < 3; col++) {
          if (glyph[row].charAt(col) !== "#") continue;
          for (var dy = 0; dy < ys; dy++) {
            for (var dx = 0; dx < xs; dx++) {
              var px = gx + col * xs + dx;
              var py = startY + row * ys + dy;
              if (px >= 0 && px < COLS && py >= 0 && py < ROWS) cells[py * COLS + px] = 1;
            }
          }
        }
      }
    }
    nameMaskCache = { key: key, cells: cells };
    return cells;
  }

  function buildFrame(t, now) {
    var img = ctx.createImageData(COLS, ROWS);
    var d = img.data;
    var weights = timeWeights();

    if (weights.night > 0.35 && now > nextMeteorAt) {
      spawnMeteor(hash(now, 1) * COLS, ROWS * (0.05 + hash(now, 2) * 0.15));
      nextMeteorAt = now + 5000 + Math.random() * 9000;
    }
    pulses = pulses.filter(function (p) { return now - p.born < PULSE_LIFE_MS; });

    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var rgb = sceneColor(x, y, t, now, weights);
        var p = (y * COLS + x) * 4;
        d[p] = Math.floor(rgb[0]);
        d[p + 1] = Math.floor(rgb[1]);
        d[p + 2] = Math.floor(rgb[2]);
        d[p + 3] = rgb[3] || 0;
      }
    }

    drawMeteors(d, now);
    drawBirds(d, t, weights);
    drawSeasonal(d, t, weights);
    drawFireflies(d, t, weights);

    var intro = introPlayed ? 1 : clamp((now - introStart) / INTRO_MS, 0, 1);
    if (intro < 1) {
      var light = isLightTheme();
      var mask = nameCells();
      var fadeIn = smoothstep(0.04, 0.24, intro);
      var dissolve = smoothstep(0.62, 0.96, intro);
      var sceneLift = lerp(0.3, 1, smoothstep(0.5, 0.95, intro));
      for (var yy = 0; yy < ROWS; yy++) {
        for (var xx = 0; xx < COLS; xx++) {
          var ii = (yy * COLS + xx) * 4;
          // Dark theme fades the scene up from black; the print edition
          // starts as blank paper and lets the scene "print in".
          if (light) {
            d[ii] = Math.floor(lerp(242, d[ii], sceneLift));
            d[ii + 1] = Math.floor(lerp(240, d[ii + 1], sceneLift));
            d[ii + 2] = Math.floor(lerp(232, d[ii + 2], sceneLift));
          } else {
            d[ii] = Math.floor(d[ii] * sceneLift);
            d[ii + 1] = Math.floor(d[ii + 1] * sceneLift);
            d[ii + 2] = Math.floor(d[ii + 2] * sceneLift);
          }
          if (mask[yy * COLS + xx]) {
            var hcell = hash(xx * 1.3, yy * 2.7);
            if (hcell < fadeIn && hcell >= dissolve) {
              var pulse = 0.82 + 0.18 * Math.sin(t * 3 + xx * 0.3);
              if (light) {
                d[ii] = Math.floor(150 * pulse);
                d[ii + 1] = Math.floor(95 * pulse);
                d[ii + 2] = Math.floor(35 * pulse);
              } else {
                d[ii] = Math.floor(255 * pulse);
                d[ii + 1] = Math.floor(208 * pulse);
                d[ii + 2] = Math.floor(122 * pulse);
              }
              d[ii + 3] = 3;
            }
          }
        }
      }
    } else {
      introPlayed = true;
    }

    return { pixels: d, weights: weights, intro: intro };
  }

  /* ----- Section morph patterns (home → section transition) ----- */

  function patternExperience(x, y, t) {
    var lum = 8;
    var bars = [0.14, 0.32, 0.5, 0.68, 0.84];
    var gy = streetY();
    for (var i = 0; i < bars.length; i++) {
      var bx = Math.floor(bars[i] * COLS);
      if (Math.abs(x - bx) <= 1 && y < gy) {
        lum = Math.max(lum, 140 + (1 - y / gy) * 40);
      }
      var nodes = [0.25, 0.45, 0.62, 0.78];
      for (var n = 0; n < nodes.length; n++) {
        var ny = Math.floor(gy - nodes[n] * (gy - 4));
        if (Math.abs(x - bx) <= 1 && Math.abs(y - ny) <= 1) {
          lum = 220 + Math.sin(t * 2 + i + n) * 20;
        }
      }
    }
    return lum;
  }

  function patternProjects(x, y, t) {
    var lum = 10;
    var boxes = [
      { x: 0.12, y: 0.22, w: 0.22, h: 0.28 },
      { x: 0.4, y: 0.18, w: 0.26, h: 0.34 },
      { x: 0.68, y: 0.26, w: 0.2, h: 0.24 }
    ];
    for (var b = 0; b < boxes.length; b++) {
      var box = boxes[b];
      var x0 = Math.floor(box.x * COLS);
      var y0 = Math.floor(box.y * ROWS);
      var x1 = Math.floor((box.x + box.w) * COLS);
      var y1 = Math.floor((box.y + box.h) * ROWS);
      var pulse = 0.85 + 0.15 * Math.sin(t * 1.5 + b);
      if ((x >= x0 && x <= x1 && (y === y0 || y === y1)) ||
          (y >= y0 && y <= y1 && (x === x0 || x === x1))) {
        lum = Math.max(lum, 200 * pulse);
      }
      if (x > x0 + 2 && x < x1 - 2 && y === y0 + 2) {
        lum = Math.max(lum, 120 * pulse);
      }
    }
    return lum;
  }

  function patternTech(x, y, t) {
    var lum = 12;
    for (var i = 0; i < 14; i++) {
      var seed = i * 31.1;
      var cx = Math.floor(hash(seed, 1) * (COLS - 4)) + 2;
      var speed = 4 + (i % 5) * 1.5;
      var cy = (t * speed + hash(seed, 2) * ROWS) % (ROWS + 6) - 3;
      var ch = TECH_CHARS.charAt(i % TECH_CHARS.length);
      var charW = ch === ";" ? 1 : 2;
      if (Math.abs(x - cx) <= charW && Math.abs(y - cy) <= 1) {
        lum = 210 + Math.sin(t * 3 + seed) * 30;
      }
    }
    return lum;
  }

  function patternContact(x, y, t) {
    var lum = 10;
    var cx = Math.floor(COLS * 0.5);
    var top = Math.floor(ROWS * 0.28);
    var bottom = Math.floor(ROWS * 0.62);
    var left = cx - Math.floor(COLS * 0.18);
    var right = cx + Math.floor(COLS * 0.18);
    var flap = Math.floor(COLS * 0.12);

    if (y === top && x >= left && x <= right) lum = 190;
    if (y > top && y <= top + flap) {
      var edge = Math.abs(x - cx) + (y - top);
      if (edge <= flap + 1) lum = Math.max(lum, 170);
    }
    if (y > top + flap && y <= bottom && (x === left || x === right)) lum = 200;
    if (y === bottom && x >= left && x <= right) lum = 200;
    if (y === bottom - 1 && x >= cx - 2 && x <= cx + 2) lum = 220;

    var pulse = 0.9 + 0.1 * Math.sin(t * 2);
    return lum * pulse;
  }

  function patternEducation(x, y, t) {
    var lum = 10;
    for (var i = 0; i < 4; i++) {
      var y0 = Math.floor(ROWS * (0.3 + i * 0.1));
      var x0 = Math.floor(COLS * 0.28);
      var x1 = Math.floor(COLS * 0.72);
      if (y >= y0 && y <= y0 + 2 && x >= x0 && x <= x1) {
        lum = 160 + Math.sin(t + i) * 25;
      }
    }
    return lum;
  }

  function sectionPatternLum(sectionId, x, y, t) {
    switch (sectionId) {
      case "experience": return patternExperience(x, y, t);
      case "projects": return patternProjects(x, y, t);
      case "tech": return patternTech(x, y, t);
      case "contact": return patternContact(x, y, t);
      case "education": return patternEducation(x, y, t);
      default: return patternProjects(x, y, t);
    }
  }

  function buildPatternPixels(t, sectionId) {
    var img = ctx.createImageData(COLS, ROWS);
    var d = img.data;
    var light = isLightTheme();
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var lum = sectionPatternLum(sectionId, x, y, t) / 255;
        var p = (y * COLS + x) * 4;
        var v = Math.floor(lum * 220 + 8);
        // Print mode draws the pattern as dark strokes on paper
        if (light) v = 236 - v;
        d[p] = v;
        d[p + 1] = Math.floor(v * 0.85);
        d[p + 2] = Math.floor(v * 0.55);
        d[p + 3] = 6;
      }
    }
    return d;
  }

  function blendDissolve(scenePx, patternPx, progress, seed) {
    var out = ctx.createImageData(COLS, ROWS);
    var d = out.data;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var i = (y * COLS + x) * 4;
        var src = hash(x + seed, y + seed * 0.7) < progress ? patternPx : scenePx;
        d[i] = src[i];
        d[i + 1] = src[i + 1];
        d[i + 2] = src[i + 2];
        d[i + 3] = src[i + 3];
      }
    }
    return out.data;
  }

  /* ----- ASCII rendering ----- */

  function renderCanvasAscii(pixels, charOverride) {
    if (!ctxOut) return;
    var rect = stageEl.getBoundingClientRect();
    var charW = rect.width / COLS;
    var charH = rect.height / ROWS;

    // Light theme prints the scene as ink on paper: char density follows
    // darkness instead of brightness, and colors are pressed toward ink.
    var light = isLightTheme();
    ctxOut.fillStyle = light ? "#ede7d8" : "#070a0f";
    ctxOut.fillRect(0, 0, rect.width, rect.height);

    var fs = clamp(rect.width / COLS / 0.58, 5, 11);
    ctxOut.font = fs + "px 'JetBrains Mono', ui-monospace, 'Cascadia Code', 'Courier New', monospace";

    var strength = 0.35;
    var charLen = CHARS.length - 1;

    for (var y = 0; y < ROWS; y++) {
      var row = y * COLS * 4;
      for (var x = 0; x < COLS; x++) {
        var i = row + x * 4;
        var r = pixels[i];
        var g = pixels[i + 1];
        var b = pixels[i + 2];
        var type = pixels[i + 3];

        var lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        // Print density curve is slightly relaxed so the sky stays airy
        var density = light ? (1 - lum) * 0.9 - 0.04 : lum;
        var threshold = (BAYER_8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
        var idx = Math.floor((density + threshold * strength - 0.05) * charLen);
        if (idx < 0) idx = 0;
        if (idx > charLen) idx = charLen;

        var ch = CHARS[idx];
        if (type === 1) ch = "@";
        else if (type === 2) ch = "#";
        else if (type === 3) ch = "@";
        else if (type === 4) ch = lum > 0.4 ? "w" : "v";
        else if (type === 5) ch = lum > 0.6 ? "*" : "+";
        else if (type === 7) ch = "o";
        else if (type === 10) ch = "/";
        else if (type === 8) ch = lum > 0.22 ? "%" : "=";
        else if (type === 9) ch = lum > 0.14 ? "#" : "%";

        if (charOverride) {
          var override = charOverride(y, x, lum);
          if (override) ch = override;
        }

        if (ch !== " ") {
          if (light) {
            var ir = Math.floor(r * 0.42 + 14);
            var ig = Math.floor(g * 0.42 + 14);
            var ib = Math.floor(b * 0.42 + 12);
            ctxOut.fillStyle = "rgb(" + ir + "," + ig + "," + ib + ")";
          } else {
            ctxOut.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
          }
          ctxOut.fillText(ch, x * charW, y * charH);
        }
      }
    }
  }

  function techCharOverride(y, x, lum) {
    var density = isLightTheme() ? 1 - lum : lum;
    if (density < 0.35) return null;
    return TECH_CHARS.charAt((x + y * 3) % TECH_CHARS.length);
  }

  /* ----- Badge ----- */

  function badgeForScene(weights, intro) {
    if (intro < 1) return "përshëndetje nga prishtina";
    var seasonAl = { winter: "dimër", spring: "pranverë", summer: "verë", autumn: "vjeshtë" }[season()];
    var timeAl = weights.night > 0.55 ? "natë" : weights.midday > 0.55 ? "mesditë" : "agim";
    return "prishtina · " + seasonAl + " · " + timeAl;
  }

  function morphBadge(sectionId) {
    var labels = {
      experience: "morph · timeline",
      projects: "morph · wireframes",
      tech: "morph · code rain",
      contact: "morph · envelope",
      education: "morph · stacks"
    };
    return labels[sectionId] || "morph · ascii";
  }

  /* ----- Loop ----- */

  function renderFrame(now) {
    if (!el || (!running && !morphState)) return;

    if (!morphState && now - lastTick < 1000 / FPS) {
      rafId = requestAnimationFrame(renderFrame);
      return;
    }
    lastTick = now;

    var t = (now - timeOrigin) * 0.001;

    if (morphState) {
      var progress = easeInOutCubic(clamp((now - morphState.start) / morphState.duration, 0, 1));
      var scene = buildFrame(t, now);
      var pattern = buildPatternPixels(t, morphState.target);
      var blended = blendDissolve(scene.pixels, pattern, progress, morphState.seed);
      var override = morphState.target === "tech" && progress > 0.5 ? techCharOverride : null;
      renderCanvasAscii(blended, override);

      var badge = document.getElementById("welcomeAnimBadge");
      if (badge) badge.textContent = morphBadge(morphState.target);

      if (progress >= 1) {
        var cb = morphState.callback;
        morphState = null;
        if (cb) cb();
        if (!shouldRun) {
          running = false;
          return;
        }
      }
      rafId = requestAnimationFrame(renderFrame);
      return;
    }

    var frame = buildFrame(t, now);
    renderCanvasAscii(frame.pixels);

    var badgeEl = document.getElementById("welcomeAnimBadge");
    if (badgeEl) badgeEl.textContent = badgeForScene(frame.weights, frame.intro);

    rafId = requestAnimationFrame(renderFrame);
  }

  function renderStatic() {
    if (!el) return;
    resize();
    introPlayed = true;
    var now = performance.now();
    var frame = buildFrame((now - timeOrigin) * 0.001, now);
    renderCanvasAscii(frame.pixels);
    var badge = document.getElementById("welcomeAnimBadge");
    if (badge) badge.textContent = badgeForScene(frame.weights, 1);
  }

  function start() {
    if (!el) return;
    shouldRun = true;
    morphState = null;
    if (running) return;
    resize();
    running = true;
    lastTick = 0;
    if (!introStart) introStart = performance.now();
    nextMeteorAt = performance.now() + 3000;

    if (reducedMotion) {
      renderStatic();
      return;
    }

    rafId = requestAnimationFrame(renderFrame);
  }

  function stop() {
    if (morphState) return;
    shouldRun = false;
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function morphTo(sectionId, callback) {
    if (!el || reducedMotion) {
      if (callback) callback();
      return;
    }
    morphState = {
      target: sectionId,
      start: performance.now(),
      duration: MORPH_MS,
      callback: callback,
      seed: Math.random() * 100
    };
    running = true;
    if (!rafId) rafId = requestAnimationFrame(renderFrame);
  }

  /* ----- Input ----- */

  function pointerToGrid(clientX, clientY) {
    var rect = stageEl.getBoundingClientRect();
    var nx = clamp((clientX - rect.left) / rect.width, 0, 1);
    var ny = clamp((clientY - rect.top) / rect.height, 0, 1);
    return {
      col: Math.floor(nx * COLS),
      row: Math.floor(ny * ROWS),
      nx: nx,
      ny: ny
    };
  }

  function onStageClick(e) {
    if (morphState || reducedMotion) return;
    var grid = pointerToGrid(e.clientX, e.clientY);
    if (grid.row < ridgeFarY(grid.col)) {
      spawnMeteor(grid.col, grid.row);
    } else {
      pulses.push({ x: grid.col, y: grid.row, born: performance.now() });
    }
  }

  function onPointerMove(e) {
    var grid = pointerToGrid(e.clientX, e.clientY);
    pointer.x = grid.nx;
    pointer.y = grid.ny;
    pointer.active = true;
  }

  function onPointerLeave() {
    pointer.active = false;
  }

  function init() {
    el = document.getElementById("welcomeAsciiCanvas");
    stageEl = document.getElementById("welcomeStage");
    reducedMotion = prefersReducedMotion();
    if (!el || !stageEl) return;

    ctxOut = el.getContext("2d", { alpha: false });
    timeOrigin = performance.now();

    resetCanvas();
    resize();
    stageEl.classList.add("is-interactive");

    stageEl.addEventListener("pointermove", onPointerMove);
    stageEl.addEventListener("pointerleave", onPointerLeave);
    stageEl.addEventListener("click", onStageClick);

    if (window.ResizeObserver) {
      resizeObs = new ResizeObserver(function () {
        if (shouldRun || running) resize();
      });
      resizeObs.observe(stageEl);
    } else {
      window.addEventListener("resize", resize);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (!morphState) {
          running = false;
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        }
      } else if (shouldRun) {
        running = false;
        start();
      }
    });
  }

  // Re-render the static frame when the theme flips under reduced motion;
  // the animated path picks the theme up on its next frame automatically.
  function refresh() {
    if (reducedMotion && shouldRun) renderStatic();
  }

  window.WelcomeAnimation = {
    init: init,
    start: start,
    stop: stop,
    resize: resize,
    morphTo: morphTo,
    refresh: refresh
  };
})();

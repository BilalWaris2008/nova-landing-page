/* NOVA hero background: a glowing 3D scene written in plain WebGL (no library, about 16 KB).
   Three layers give it depth: a rippling field of light dots, a floating constellation of
   nodes joined by fading lines, and small pulses of data travelling between the nodes.
   It adapts to the light and dark themes, pauses when off screen, and fails silently:
   without WebGL (or with reduced motion) the canvas is removed and only the gradient orbs show. */
(function () {
  var canvas = document.getElementById('heroCanvas');
  var hero = document.querySelector('.hero');
  function bail() { if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); }

  try {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canvas || !hero || reduce) { bail(); return; }

    var gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!gl) { bail(); return; }

    var small = window.innerWidth < 768;
    var fine = window.matchMedia('(pointer: fine)').matches;
    var DPR = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);

    /* ---------- Shaders ---------- */
    var WAVE = [
      'float waveAt(vec3 p, float t, vec2 m) {',
      '  float w = sin(p.x * 0.009 + t * 0.7) * 16.0 + cos(p.z * 0.012 - t * 0.55) * 14.0 + sin((p.x + p.z) * 0.006 + t * 0.4) * 10.0;',
      '  float dm = distance(p.xz, m);',
      '  return w + sin(dm * 0.045 - t * 2.6) * 26.0 * exp(-dm * 0.0045);',
      '}'
    ].join('\n');
    var POINT_VS = [
      'attribute vec3 aPos; attribute float aSeed;',
      'uniform mat4 uVP; uniform vec2 uMouse; uniform vec3 uColA, uColB;',
      'uniform float uTime, uDpr, uSize, uWave, uTw, uAlpha, uCoreMix;',
      'varying vec3 vCol; varying float vA; varying float vCore;',
      WAVE,
      'void main() {',
      '  vec3 p = aPos; float w = 0.0;',
      '  if (uWave > 0.5) { w = waveAt(p, uTime, uMouse); p.y += w; }',
      '  vec4 clip = uVP * vec4(p, 1.0);',
      '  gl_Position = clip;',
      '  float dist = max(clip.w, 1.0);',
      '  gl_PointSize = uSize * uDpr * (420.0 / dist) * (0.75 + 0.5 * aSeed);',
      '  float fade = 1.0 - smoothstep(500.0, 1700.0, dist);',
      '  float edge = 1.0 - smoothstep(0.75, 1.05, abs(clip.x / dist));',
      '  float tw = mix(aSeed, 0.55 + 0.45 * sin(uTime * 1.4 + aSeed * 40.0), uTw);',
      '  float crest = uWave > 0.5 ? smoothstep(-8.0, 38.0, w) : 0.0;',
      '  float t = clamp(p.x / 1800.0 + 0.5 + p.y * 0.0006, 0.0, 1.0);',
      '  vCol = mix(uColA, uColB, t) + crest * 0.22;',
      '  vA = uAlpha * fade * edge * tw * (0.5 + 0.7 * crest + 0.3 * (1.0 - uWave));',
      '  vCore = uCoreMix;',
      '}'
    ].join('\n');
    var POINT_FS = [
      'precision mediump float;',
      'uniform float uAdd; uniform vec3 uCore;',
      'varying vec3 vCol; varying float vA; varying float vCore;',
      'void main() {',
      '  float d = length(gl_PointCoord - 0.5) * 2.0;',
      '  float soft = pow(1.0 - smoothstep(0.0, 1.0, d), 1.7);',
      '  float core = (1.0 - smoothstep(0.0, 0.38, d)) * vCore;',
      '  vec3 col = mix(vCol, uCore, core);',
      '  float a = soft * vA;',
      '  gl_FragColor = vec4(col * a, a * (1.0 - uAdd));', // uAdd 1 = additive glow (dark), 0 = normal (light)
      '}'
    ].join('\n');
    var LINE_VS = [
      'attribute vec3 aPos; attribute float aA;',
      'uniform mat4 uVP; uniform vec2 uMouse; uniform vec3 uColA, uColB;',
      'uniform float uTime, uAlpha, uWave, uFlat;',
      'varying vec4 vC;',
      WAVE,
      'void main() {',
      '  vec3 p = aPos; float crest = 0.0;',
      '  if (uWave > 0.5) { float w = waveAt(p, uTime, uMouse); p.y += w; crest = smoothstep(-8.0, 38.0, w); }',
      '  vec4 clip = uVP * vec4(p, 1.0);',
      '  gl_Position = clip;',
      '  float dist = max(clip.w, 1.0);',
      '  float fade = 1.0 - smoothstep(500.0, 1700.0, dist);',
      '  float edge = 1.0 - smoothstep(0.75, 1.05, abs(clip.x / dist));',
      '  float base = mix(aA, 0.55 + 0.9 * crest, uFlat);',
      '  float span = mix(1200.0, 1800.0, uWave);',
      '  vC = vec4(mix(uColA, uColB, clamp(p.x / span + 0.5, 0.0, 1.0)), base * uAlpha * fade * edge);',
      '}'
    ].join('\n');
    var LINE_FS = [
      'precision mediump float; uniform float uAdd; varying vec4 vC;',
      'void main() { gl_FragColor = vec4(vC.rgb * vC.a, vC.a * (1.0 - uAdd)); }'
    ].join('\n');

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function program(vs, fs) {
      var p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      var u = {};
      var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) { var name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
      return { p: p, u: u, aPos: gl.getAttribLocation(p, 'aPos'), a1: gl.getAttribLocation(p, 'aSeed') >= 0 ? gl.getAttribLocation(p, 'aSeed') : gl.getAttribLocation(p, 'aA') };
    }
    var pointProg = program(POINT_VS, POINT_FS);
    var lineProg = program(LINE_VS, LINE_FS);

    /* ---------- Geometry ---------- */
    var COLS = small ? 44 : 78, ROWS = small ? 24 : 40, FLOOR_Y = -210;
    var field = new Float32Array(COLS * ROWS * 4);
    for (var r = 0, k = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++, k += 4) {
        field[k] = -1300 + 2600 * c / (COLS - 1) + (Math.random() - 0.5) * 14;
        field[k + 1] = FLOOR_Y;
        field[k + 2] = -1000 + 1250 * r / (ROWS - 1) + (Math.random() - 0.5) * 14;
        field[k + 3] = Math.random();
      }
    }
    var fieldBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fieldBuf);
    gl.bufferData(gl.ARRAY_BUFFER, field, gl.STATIC_DRAW);

    var contour = [];
    for (var cr = 0; cr < ROWS; cr++) for (var cc = 0; cc < COLS - 1; cc++) contour.push(cr * COLS + cc, cr * COLS + cc + 1);
    var contourBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, contourBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(contour), gl.STATIC_DRAW);

    var N = small ? 26 : 44, LINK = small ? 170 : 190, MAX_LINKS = N * 4;
    var BOX = { x: 600, yMin: -40, yMax: 260, zMin: -380, zMax: 100 };
    var nodes = new Float32Array(N * 4), vel = [];
    for (var i = 0; i < N; i++) {
      // nodes gather on the left and right, so the headline in the middle stays clean
      nodes[i * 4] = (Math.random() < 0.5 ? -1 : 1) * (170 + Math.pow(Math.random(), 0.85) * (BOX.x - 170));
      nodes[i * 4 + 1] = BOX.yMin + Math.random() * (BOX.yMax - BOX.yMin);
      nodes[i * 4 + 2] = BOX.zMin + Math.random() * (BOX.zMax - BOX.zMin);
      nodes[i * 4 + 3] = 0.25 + Math.random() * 0.75;
      vel.push([(Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.14]);
    }
    var nodeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nodeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.DYNAMIC_DRAW);

    var lines = new Float32Array(MAX_LINKS * 2 * 4);
    var lineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lines, gl.DYNAMIC_DRAW);

    var PULSES = small ? 4 : 8, pulses = [], pulseData = new Float32Array(PULSES * 4);
    for (var q = 0; q < PULSES; q++) pulses.push({ a: -1, b: -1, t: 1, speed: 0.25 + Math.random() * 0.3 });
    var pulseBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pulseBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pulseData, gl.DYNAMIC_DRAW);

    /* ---------- Camera maths (column-major 4x4 matrices) ---------- */
    function perspective(fov, aspect, near, far) {
      var f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
      return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
    }
    function lookAt(e, t) {
      var zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2], zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
      var xx = zz, xz = -zx, xl = Math.hypot(xx, xz); xx /= xl; xz /= xl;               // x = normalize(cross(up, z)) with up = (0,1,0)
      var yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;                          // y = cross(z, x)
      return [xx, yx, zx, 0, 0, yy, zy, 0, xz, yz, zz, 0,
        -(xx * e[0] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
    }
    function mul(a, b) {
      var o = new Array(16);
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
        o[i * 4 + j] = a[j] * b[i * 4] + a[4 + j] * b[i * 4 + 1] + a[8 + j] * b[i * 4 + 2] + a[12 + j] * b[i * 4 + 3];
      }
      return o;
    }

    /* ---------- Theme: colours blend smoothly between dark and light ---------- */
    var THEME = {
      dark:  { a: [0.50, 0.40, 1.00], b: [1.00, 0.62, 0.44], core: [1, 1, 1], add: 1, field: 1.15, nodes: 1.0, lines: 0.26, contour: 0.20, pulse: 1.0 },
      light: { a: [0.36, 0.25, 0.90], b: [0.96, 0.43, 0.16], core: [0.20, 0.14, 0.52], add: 0, field: 0.95, nodes: 0.85, lines: 0.38, contour: 0.30, pulse: 0.95 }
    };
    var themeNow = document.documentElement.getAttribute('data-theme') === 'light' ? 1 : 0, themeGoal = themeNow;
    new MutationObserver(function () { themeGoal = document.documentElement.getAttribute('data-theme') === 'light' ? 1 : 0; })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    function mix(a, b, t) { return a + (b - a) * t; }
    function mixV(a, b, t) { return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]; }

    /* ---------- Size, pointer, visibility ---------- */
    var width = 0, height = 0;
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      width = w; height = h;
      canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);

    var px = 0, py = 0, pointerSeen = false, ripple = [0, -150];
    if (fine) {
      window.addEventListener('mousemove', function (e) {
        var r = canvas.getBoundingClientRect();
        px = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
        py = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
        pointerSeen = true;
      });
    }

    var running = false, frame = 0, last = 0, time = 0;
    new IntersectionObserver(function (entries) {
      running = entries[0].isIntersecting;
      if (running && !frame) { last = 0; frame = requestAnimationFrame(tick); }
    }).observe(hero);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) running = false;
      else if (!frame) { running = true; last = 0; frame = requestAnimationFrame(tick); }
    });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; bail(); });

    /* ---------- Per frame ---------- */
    function pickPulse(p) {
      p.a = Math.floor(Math.random() * N); p.b = -1; p.t = 0;
      var best = 1e9;
      for (var j = 0; j < N; j++) {
        if (j === p.a) continue;
        var dx = nodes[p.a * 4] - nodes[j * 4], dy = nodes[p.a * 4 + 1] - nodes[j * 4 + 1], dz = nodes[p.a * 4 + 2] - nodes[j * 4 + 2];
        var d = dx * dx + dy * dy + dz * dz;
        if (d < LINK * LINK && d < best && Math.random() < 0.6) { best = d; p.b = j; }
      }
    }
    function bindPoints(buf) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(pointProg.aPos); gl.vertexAttribPointer(pointProg.aPos, 3, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(pointProg.a1); gl.vertexAttribPointer(pointProg.a1, 1, gl.FLOAT, false, 16, 12);
    }
    function drawPoints(buf, count, size, wave, tw, alpha, coreMix) {
      var u = pointProg.u;
      bindPoints(buf);
      gl.uniform1f(u.uSize, size); gl.uniform1f(u.uWave, wave); gl.uniform1f(u.uTw, tw);
      gl.uniform1f(u.uAlpha, alpha); gl.uniform1f(u.uCoreMix, coreMix);
      gl.drawArrays(gl.POINTS, 0, count);
    }

    function tick(now) {
      frame = running ? requestAnimationFrame(tick) : 0;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now; time += dt;
      themeNow += (themeGoal - themeNow) * Math.min(1, dt * 5);
      if (!width) return;

      var th = {
        a: mixV(THEME.dark.a, THEME.light.a, themeNow), b: mixV(THEME.dark.b, THEME.light.b, themeNow), core: mixV(THEME.dark.core, THEME.light.core, themeNow),
        add: mix(THEME.dark.add, THEME.light.add, themeNow), field: mix(THEME.dark.field, THEME.light.field, themeNow),
        nodes: mix(THEME.dark.nodes, THEME.light.nodes, themeNow), lines: mix(THEME.dark.lines, THEME.light.lines, themeNow), contour: mix(THEME.dark.contour, THEME.light.contour, themeNow), pulse: mix(THEME.dark.pulse, THEME.light.pulse, themeNow)
      };

      // Nodes drift inside their box and bounce off its walls
      for (var i = 0; i < N; i++) {
        var o = i * 4, v = vel[i];
        nodes[o] += v[0]; nodes[o + 1] += v[1]; nodes[o + 2] += v[2];
        if (Math.abs(nodes[o]) > BOX.x) v[0] *= -1;
        if (nodes[o + 1] < BOX.yMin || nodes[o + 1] > BOX.yMax) v[1] *= -1;
        if (nodes[o + 2] < BOX.zMin || nodes[o + 2] > BOX.zMax) v[2] *= -1;
      }
      // Links: lines between close nodes, fading out with distance
      var links = 0, LD2 = LINK * LINK;
      for (var a = 0; a < N && links < MAX_LINKS; a++) {
        for (var b = a + 1; b < N && links < MAX_LINKS; b++) {
          var dx = nodes[a * 4] - nodes[b * 4], dy = nodes[a * 4 + 1] - nodes[b * 4 + 1], dz = nodes[a * 4 + 2] - nodes[b * 4 + 2];
          var d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < LD2) {
            var al = Math.pow(1 - Math.sqrt(d2) / LINK, 1.4), L = links * 8;
            lines[L] = nodes[a * 4]; lines[L + 1] = nodes[a * 4 + 1]; lines[L + 2] = nodes[a * 4 + 2]; lines[L + 3] = al;
            lines[L + 4] = nodes[b * 4]; lines[L + 5] = nodes[b * 4 + 1]; lines[L + 6] = nodes[b * 4 + 2]; lines[L + 7] = al;
            links++;
          }
        }
      }
      // Pulses: bright points travelling from one node to a neighbour
      for (var s = 0; s < PULSES; s++) {
        var p = pulses[s], P = s * 4;
        if (p.t >= 1 || p.b < 0) { pickPulse(p); if (p.b < 0) { pulseData[P + 3] = 0; continue; } }
        p.t = Math.min(1, p.t + dt * p.speed);
        var e = p.t * p.t * (3 - 2 * p.t);
        pulseData[P] = mix(nodes[p.a * 4], nodes[p.b * 4], e);
        pulseData[P + 1] = mix(nodes[p.a * 4 + 1], nodes[p.b * 4 + 1], e);
        pulseData[P + 2] = mix(nodes[p.a * 4 + 2], nodes[p.b * 4 + 2], e);
        pulseData[P + 3] = Math.sin(Math.PI * p.t);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, nodeBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, nodes);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, lines);
      gl.bindBuffer(gl.ARRAY_BUFFER, pulseBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pulseData);

      // Camera sways slowly and leans towards the pointer
      var cx = Math.sin(time * 0.12) * 50 + px * 80, cy = 95 + Math.cos(time * 0.1) * 12 - py * 25;
      var vp = mul(perspective(0.9, width / height, 10, 3000), lookAt([cx, cy, 520], [0, 5, 0]));

      // The ripple follows the pointer, or wanders by itself on touch screens
      var tx = pointerSeen ? px * 800 : Math.sin(time * 0.3) * 600;
      var tz = pointerSeen ? -420 + (py * 0.5 + 0.5) * 640 : -200 + Math.cos(time * 0.23) * 260;
      ripple[0] += (tx - ripple[0]) * 0.06; ripple[1] += (tz - ripple[1]) * 0.06;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      var lu = lineProg.u;
      gl.useProgram(lineProg.p);
      gl.uniformMatrix4fv(lu.uVP, false, vp);
      gl.uniform2f(lu.uMouse, ripple[0], ripple[1]); gl.uniform1f(lu.uTime, time);
      gl.uniform3fv(lu.uColA, th.a); gl.uniform3fv(lu.uColB, th.b); gl.uniform1f(lu.uAdd, th.add);
      // terrain contour lines follow the same ripple as the dots
      gl.bindBuffer(gl.ARRAY_BUFFER, fieldBuf);
      gl.enableVertexAttribArray(lineProg.aPos); gl.vertexAttribPointer(lineProg.aPos, 3, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(lineProg.a1); gl.vertexAttribPointer(lineProg.a1, 1, gl.FLOAT, false, 16, 12);
      gl.uniform1f(lu.uAlpha, th.contour); gl.uniform1f(lu.uWave, 1); gl.uniform1f(lu.uFlat, 1);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, contourBuf);
      gl.drawElements(gl.LINES, contour.length, gl.UNSIGNED_SHORT, 0);
      // network links between the floating nodes
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.vertexAttribPointer(lineProg.aPos, 3, gl.FLOAT, false, 16, 0);
      gl.vertexAttribPointer(lineProg.a1, 1, gl.FLOAT, false, 16, 12);
      gl.uniform1f(lu.uAlpha, th.lines); gl.uniform1f(lu.uWave, 0); gl.uniform1f(lu.uFlat, 0);
      gl.drawArrays(gl.LINES, 0, links * 2);

      var u = pointProg.u;
      gl.useProgram(pointProg.p);
      gl.uniformMatrix4fv(u.uVP, false, vp);
      gl.uniform2f(u.uMouse, ripple[0], ripple[1]);
      gl.uniform3fv(u.uColA, th.a); gl.uniform3fv(u.uColB, th.b); gl.uniform3fv(u.uCore, th.core);
      gl.uniform1f(u.uTime, time); gl.uniform1f(u.uDpr, DPR); gl.uniform1f(u.uAdd, th.add);
      drawPoints(fieldBuf, COLS * ROWS, small ? 9 : 10.5, 1, 1, th.field, 0);        // the rippling field
      drawPoints(nodeBuf, N, small ? 22 : 27, 0, 1, th.nodes, 0.8);                // glowing nodes
      drawPoints(pulseBuf, PULSES, 24, 0, 0, th.pulse, 0.9);                       // data pulses
    }
  } catch (err) {
    console.error('NOVA [hero3d] error:', err);
    bail();
  }
})();

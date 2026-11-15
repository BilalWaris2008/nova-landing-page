/* NOVA hero background: a drifting 3D network of nodes, built with Three.js.
   Self-contained and fails silently: if Three.js or WebGL is unavailable, or the
   visitor prefers reduced motion, the canvas is removed and the existing
   gradient orbs behind it are all that show. */
(function () {
    try {
        var canvas = document.getElementById('heroCanvas');
        var hero = document.querySelector('.hero');
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var fine = window.matchMedia('(pointer: fine)').matches;

        if (!canvas || !hero || reduce || !window.THREE || !window.WebGLRenderingContext) {
            if (canvas) canvas.remove();
            return;
        }

        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
        } catch (e) {
            canvas.remove();
            return; // WebGL is reported but creating a context still failed
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        var isSmall = window.innerWidth < 768;
        var COUNT = isSmall ? 32 : 68;
        var SPREAD = { x: 480, y: 250, z: 200 };
        var LINK_DIST = 150;

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(55, 1, 1, 2000);
        camera.position.z = 420;

        /* ---- Nodes: a small cloud of points drifting inside a box ---- */
        var positions = new Float32Array(COUNT * 3);
        var velocities = [];
        for (var i = 0; i < COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * SPREAD.x * 2;
            positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD.y * 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD.z * 2;
            velocities.push({ x: (Math.random() - 0.5) * 0.14, y: (Math.random() - 0.5) * 0.14, z: (Math.random() - 0.5) * 0.08 });
        }
        var dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // A small soft-glow circle, drawn once on an offscreen canvas, used as the point sprite
        var spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = spriteCanvas.height = 64;
        var sctx = spriteCanvas.getContext('2d');
        var glow = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        glow.addColorStop(0, 'rgba(216, 204, 255, 1)');
        glow.addColorStop(0.45, 'rgba(123, 97, 255, .9)');
        glow.addColorStop(1, 'rgba(123, 97, 255, 0)');
        sctx.fillStyle = glow;
        sctx.fillRect(0, 0, 64, 64);
        var dotTexture = new THREE.CanvasTexture(spriteCanvas);

        var dotMat = new THREE.PointsMaterial({ size: 7, map: dotTexture, transparent: true, depthWrite: false, sizeAttenuation: true });
        var points = new THREE.Points(dotGeo, dotMat);

        /* ---- Links: lines drawn between nodes that drift close to each other ---- */
        var MAX_LINKS = COUNT * 5;
        var linePositions = new Float32Array(MAX_LINKS * 2 * 3);
        var lineGeo = new THREE.BufferGeometry();
        var lineAttr = new THREE.BufferAttribute(linePositions, 3);
        lineAttr.setUsage(THREE.DynamicDrawUsage);
        lineGeo.setAttribute('position', lineAttr);
        var lineMat = new THREE.LineBasicMaterial({ color: 0x9683ff, transparent: true, opacity: 0.16, depthWrite: false });
        var lines = new THREE.LineSegments(lineGeo, lineMat);

        var group = new THREE.Group();
        group.add(points);
        group.add(lines);
        scene.add(group);

        // Light theme: nodes stay visible but calmer, so they never fight with the page text
        var applyTheme = function () {
            var light = document.documentElement.getAttribute('data-theme') === 'light';
            dotMat.opacity = light ? 0.55 : 0.85;
            lineMat.opacity = light ? 0.1 : 0.16;
        };
        dotMat.transparent = true;
        applyTheme();
        new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        /* ---- Size the canvas to the hero section ---- */
        function resize() {
            var w = hero.clientWidth, h = hero.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
        resize();
        if (window.ResizeObserver) new ResizeObserver(resize).observe(hero);
        else window.addEventListener('resize', resize);

        /* ---- Subtle parallax towards the pointer, desktop only ---- */
        var targetX = 0, targetY = 0;
        if (fine) {
            window.addEventListener('mousemove', function (e) {
                targetX = (e.clientX / window.innerWidth - 0.5) * 2;
                targetY = (e.clientY / window.innerHeight - 0.5) * 2;
            });
        }

        /* ---- Only animate while the hero is on screen and the tab is visible ---- */
        var running = false, frame = null;
        new IntersectionObserver(function (entries) {
            running = entries[0].isIntersecting;
            if (running && !frame) frame = requestAnimationFrame(tick);
        }).observe(hero);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) running = false;
            else if (!frame) { running = true; frame = requestAnimationFrame(tick); }
        });

        var LD2 = LINK_DIST * LINK_DIST;
        function tick() {
            frame = running ? requestAnimationFrame(tick) : null;

            for (var a = 0; a < COUNT; a++) {
                var ix = a * 3;
                positions[ix] += velocities[a].x;
                positions[ix + 1] += velocities[a].y;
                positions[ix + 2] += velocities[a].z;
                if (Math.abs(positions[ix]) > SPREAD.x) velocities[a].x *= -1;
                if (Math.abs(positions[ix + 1]) > SPREAD.y) velocities[a].y *= -1;
                if (Math.abs(positions[ix + 2]) > SPREAD.z) velocities[a].z *= -1;
            }
            dotGeo.attributes.position.needsUpdate = true;

            var linkCount = 0;
            for (var p = 0; p < COUNT && linkCount < MAX_LINKS; p++) {
                for (var q = p + 1; q < COUNT && linkCount < MAX_LINKS; q++) {
                    var dx = positions[p * 3] - positions[q * 3];
                    var dy = positions[p * 3 + 1] - positions[q * 3 + 1];
                    var dz = positions[p * 3 + 2] - positions[q * 3 + 2];
                    var d2 = dx * dx + dy * dy + dz * dz;
                    if (d2 < LD2) {
                        var o = linkCount * 6;
                        linePositions[o] = positions[p * 3]; linePositions[o + 1] = positions[p * 3 + 1]; linePositions[o + 2] = positions[p * 3 + 2];
                        linePositions[o + 3] = positions[q * 3]; linePositions[o + 4] = positions[q * 3 + 1]; linePositions[o + 5] = positions[q * 3 + 2];
                        linkCount++;
                    }
                }
            }
            lineGeo.setDrawRange(0, linkCount * 2);
            lineGeo.attributes.position.needsUpdate = true;

            group.rotation.y += 0.0009;
            group.rotation.x += 0.0003;
            camera.position.x += (targetX * 60 - camera.position.x) * 0.02;
            camera.position.y += (-targetY * 40 - camera.position.y) * 0.02;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        }
    } catch (err) {
        console.error('NOVA [hero3d] error:', err);
        var c = document.getElementById('heroCanvas');
        if (c) c.remove(); // fall back to the plain gradient orbs
    }
})();
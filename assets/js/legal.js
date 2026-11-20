/* NOVA legal pages (Privacy, Terms): same loader, smooth scroll and reveal animations as the home page */
(function () {
    var q = function (s) { return document.querySelector(s); };
    var qa = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
    var pre = q('#preloader');
    var cursor = q('.cursor');
    function removePreloader() { if (pre && pre.parentNode) pre.parentNode.removeChild(pre); }

    // Failsafe: never leave the loader on screen if something below fails
    setTimeout(removePreloader, 5000);

    // Placeholder links should not jump to the top
    qa('a[href="#"]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); }); });

    if (!window.gsap || !window.ScrollTrigger) {
        console.error('NOVA: GSAP failed to load, showing the page without animations');
        removePreloader();
        if (cursor) cursor.parentNode.removeChild(cursor);
        return;
    }

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = window.matchMedia('(pointer: fine)').matches;
    gsap.registerPlugin(ScrollTrigger);

    /* ---------- Smooth scroll ---------- */
    var lenis = window.Lenis ? new Lenis({ lerp: 0.09 }) : null;
    if (lenis) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
        lenis.stop(); // lock scrolling while the loader is visible
    }
    function scrollTop() {
        if (lenis) lenis.scrollTo(0);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ---------- Split the page title into letters ---------- */
    var h1 = q('.legal-doc h1');
    var chars = [];
    if (h1) {
        var words = h1.textContent.trim().split(/\s+/);
        h1.setAttribute('aria-label', words.join(' '));
        h1.textContent = '';
        words.forEach(function (w, i) {
            var wordEl = document.createElement('span');
            wordEl.className = 'word';
            wordEl.setAttribute('aria-hidden', 'true');
            w.split('').forEach(function (c) {
                var ch = document.createElement('span');
                ch.className = 'char';
                ch.textContent = c;
                wordEl.appendChild(ch);
                chars.push(ch);
            });
            h1.appendChild(wordEl);
            if (i < words.length - 1) h1.appendChild(document.createTextNode(' '));
        });
    }

    var blocks = qa('.legal-doc > *:not(h1):not(.legal-meta)');

    /* ---------- Intro (runs after the loader slides away) ---------- */
    function intro() {
        gsap.timeline({ defaults: { ease: 'power4.out' } })
            .to('.nova-nav', { y: 0, opacity: 1, duration: 0.8 })
            .to(chars, { yPercent: 0, duration: 1.1, stagger: 0.018 }, '-=0.4')
            .to('.legal-meta', { y: 0, opacity: 1, duration: 0.8 }, '-=0.7');

        // The rest of the text fades in as it scrolls into view
        ScrollTrigger.batch(blocks, {
            start: 'top 92%', once: true,
            onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' }); }
        });
        gsap.to('.legal .orb-1', { y: 140, ease: 'none', scrollTrigger: { trigger: '.legal', start: 'top top', end: 'bottom top', scrub: true } });
    }

    function jumpToHash() { // e.g. privacy.html#security
        if (!location.hash) return;
        var target = null;
        try { target = q(location.hash); } catch (e) { }
        if (target && lenis) lenis.scrollTo(target, { immediate: true, offset: -100 });
    }

    /* ---------- Loader: counts to 100, then slides up ---------- */
    if (reduce) {
        removePreloader();
        if (lenis) lenis.start();
    } else {
        gsap.set(chars, { yPercent: 110 });
        gsap.set('.nova-nav', { y: -20, opacity: 0 });
        gsap.set('.legal-meta', { y: 24, opacity: 0 });
        gsap.set(blocks, { opacity: 0, y: 30 });

        var counter = { v: 0 };
        var count = q('#preCount');
        gsap.to(counter, {
            v: 100, duration: 1.8, ease: 'power2.inOut',
            onUpdate: function () { if (count) count.textContent = Math.round(counter.v); },
            onComplete: function () {
                gsap.to(pre, {
                    yPercent: -100, duration: 0.9, ease: 'expo.inOut',
                    onComplete: function () { removePreloader(); if (lenis) lenis.start(); jumpToHash(); }
                });
                gsap.delayedCall(0.5, intro);
            }
        });
    }

    /* ---------- Custom cursor (desktop only) ---------- */
    if (fine && cursor) {
        var xTo = gsap.quickTo(cursor, 'x', { duration: 0.4, ease: 'power3' });
        var yTo = gsap.quickTo(cursor, 'y', { duration: 0.4, ease: 'power3' });
        window.addEventListener('mousemove', function (e) { cursor.classList.add('show'); xTo(e.clientX); yTo(e.clientY); });
        qa('a, button').forEach(function (el) {
            el.addEventListener('mouseenter', function () { cursor.classList.add('big'); });
            el.addEventListener('mouseleave', function () { cursor.classList.remove('big'); });
        });
    } else if (cursor) {
        cursor.parentNode.removeChild(cursor);
    }

    /* ---------- Floating back-to-top button with progress ring ---------- */
    var btn = q('#toTop');
    var ring = btn && btn.querySelector('.ring');
    if (btn && ring) {
        var C = 132; // circle circumference (2 * pi * 21)
        var update = function () {
            var max = document.documentElement.scrollHeight - window.innerHeight;
            var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
            ring.style.strokeDashoffset = C * (1 - p);
            btn.classList.toggle('show', window.scrollY > 500);
        };
        window.addEventListener('scroll', update);
        window.addEventListener('resize', update);
        update();
        btn.addEventListener('click', scrollTop);
    }
})();
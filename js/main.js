/* ===== NOVA: smooth scroll, preloader, animations, interactions ===== */
$(function () {
  // Failsafe: remove the preloader after 5s even if something below fails
  setTimeout(() => $('#preloader').remove(), 5000);

  // Check that the required libraries have loaded
  const missing = ['gsap', 'ScrollTrigger'].filter((n) => typeof window[n] === 'undefined');
  if (missing.length) {
    console.error('NOVA: required libraries failed to load ->', missing.join(', '));
    $('#preloader, .cursor').remove();
    return;
  }
  // Optional libraries: the page keeps working with fallbacks if they are missing
  ['Lenis', 'Typed', 'VanillaTilt'].forEach((n) => {
    if (typeof window[n] === 'undefined') console.warn('NOVA: optional library not loaded (using fallback) ->', n);
  });

  // Each section runs in its own try/catch so one failure cannot break the rest
  const safe = (name, fn) => { try { fn(); } catch (e) { console.error('NOVA [' + name + '] error:', e); } };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const QUESTION = 'Why did revenue jump in October?';

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll (Lenis + ScrollTrigger) ---------- */
  const lenis = window.Lenis ? new Lenis({ lerp: 0.09 }) : {
    on() { }, raf() { }, stop() { }, start() { },
    scrollTo(target, o) {
      const el = document.querySelector(target);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + ((o && o.offset) || 0), behavior: 'smooth' });
    }
  };
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop(); // lock scrolling while the preloader is visible

  $('a[href^="#"]').on('click', function (e) {
    const id = $(this).attr('href');
    if (id === '#') e.preventDefault(); // placeholder links should not jump to the top
    if (id.length > 1 && $(id).length) {
      e.preventDefault();
      lenis.scrollTo(id, { offset: -70 });
    }
    const menu = document.getElementById('navMenu');
    if ($(menu).hasClass('show')) bootstrap.Collapse.getOrCreateInstance(menu).hide();
  });

  /* ---------- Navbar ---------- */
  $(window).on('scroll', () => $('#nav').toggleClass('scrolled', window.scrollY > 40));

  /* ---------- Hero text split ---------- */
  // Split the headline into words and letters (small custom splitter, no library needed)
  $('.hero-title').each(function () {
    const words = $(this).text().trim().split(/\s+/);
    $(this).empty().attr('aria-label', words.join(' '));
    words.forEach((w, i) => {
      const $w = $('<span class="word" aria-hidden="true"></span>');
      w.split('').forEach((c) => $w.append($('<span class="char"></span>').text(c)));
      $(this).append($w);
      if (i < words.length - 1) $(this).append(' ');
    });
  });
  const $chars = $('.hero-title .char');

  if (!reduce) {
    gsap.set($chars, { yPercent: 110 });
    gsap.set('.hero-badge, .hero-sub, .hero-cta', { y: 24, opacity: 0 });
    gsap.set('.mock-wrap', { y: 80, opacity: 0 });
    gsap.set('#chartLine', { strokeDashoffset: 1 });
    gsap.set('#chartArea', { opacity: 0 });
    gsap.set('.insight', { opacity: 0, y: 12 });
  }

  /* ---------- Hero sequence (the main intro moment) ---------- */
  function drawChart() {
    gsap.timeline()
      .to('#chartLine', { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' })
      .to('#chartArea', { opacity: 1, duration: 1 }, '-=1.1')
      .to('.insight', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5');
  }

  function askNova() {
    if (window.Typed) {
      new Typed('#typed', { strings: [QUESTION], typeSpeed: 38, onComplete: drawChart });
      return;
    }
    let n = 0; // Fallback typing effect when Typed.js is not available
    const timer = setInterval(() => {
      $('#typed').text(QUESTION.slice(0, ++n));
      if (n >= QUESTION.length) { clearInterval(timer); drawChart(); }
    }, 38);
  }

  function playHero() {
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .to('.hero-badge', { y: 0, opacity: 1, duration: 0.8 })
      .to($chars, { yPercent: 0, duration: 1.1, stagger: 0.018 }, '-=0.5')
      .to('.hero-sub, .hero-cta', { y: 0, opacity: 1, duration: 0.9, stagger: 0.12 }, '-=0.7')
      .to('.mock-wrap', { y: 0, opacity: 1, duration: 1.2 }, '-=0.8')
      .add(askNova, '-=0.2');
  }

  /* ---------- Preloader ---------- */
  if (reduce) {
    $('#preloader').remove();
    $('#typed').text(QUESTION);
    lenis.start();
  } else {
    const counter = { v: 0 };
    gsap.to(counter, {
      v: 100, duration: 1.8, ease: 'power2.inOut',
      onUpdate: () => $('#preCount').text(Math.round(counter.v)),
      onComplete: () => {
        gsap.to('#preloader', {
          yPercent: -100, duration: 0.9, ease: 'expo.inOut',
          onComplete: () => { $('#preloader').remove(); lenis.start(); }
        });
        gsap.delayedCall(0.5, playHero);
      }
    });

    /* Parallax: the mockup and orbs drift slightly while scrolling */
    gsap.to('.mock-wrap', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.orb-1', { y: 140, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- Bento grid animations ---------- */
  safe('bento', () => {
    if (reduce) return;
    // Cards fade in one after another
    gsap.set('.bento-card', { opacity: 0, y: 50 });
    ScrollTrigger.batch('.bento-card', {
      start: 'top 88%', once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: 'power3.out' })
    });

    // Chat: question, then answer, then the sparkline is drawn
    gsap.set('.msg-q, .msg-a', { opacity: 0, y: 14 });
    gsap.set('.spark path', { strokeDashoffset: 1 });
    gsap.timeline({ scrollTrigger: { trigger: '.chat', start: 'top 80%', once: true } })
      .to('.msg-q', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' })
      .to('.msg-a', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '+=0.5')
      .to('.spark path', { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, '-=0.2');

    // Driver bars fill from the left
    gsap.from('.bar i', {
      scaleX: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out',
      scrollTrigger: { trigger: '.drivers', start: 'top 85%', once: true }
    });
  });

  /* ---------- How it works (pinned scroll) ---------- */
  // Desktop only, and only when reduced motion is off. On mobile the steps stay a simple list.
  safe('how-it-works', () => gsap.matchMedia().add('(min-width: 992px) and (prefers-reduced-motion: no-preference)', () => {
    const $how = $('#how');
    const $panels = $how.find('.panel');
    const $steps = $how.find('.step');
    let cur = 0;

    $how.addClass('is-pinned');
    gsap.set($panels, { opacity: 0, visibility: 'hidden' });
    gsap.set($panels[0], { opacity: 1, visibility: 'visible' });

    function setStep(i) {
      if (i === cur) return;
      const $in = $panels.eq(i);
      gsap.killTweensOf($panels);
      gsap.set($panels.not($panels.eq(cur)).not($in), { opacity: 0, visibility: 'hidden' });
      gsap.to($panels[cur], { opacity: 0, y: -24, duration: 0.35, onComplete: function () { gsap.set(this.targets(), { visibility: 'hidden', y: 0 }); } });
      gsap.fromTo($in, { opacity: 0, y: 36, visibility: 'visible' }, { opacity: 1, y: 0, duration: 0.7, delay: 0.15, ease: 'power3.out' });
      gsap.from($in.find('li, pre, .result, .actions'), { opacity: 0, y: 14, duration: 0.5, stagger: 0.08, delay: 0.3 });
      $steps.removeClass('active').eq(i).addClass('active');
      cur = i;
    }

    ScrollTrigger.create({
      trigger: '#how', start: 'top top', end: '+=2400', pin: true, anticipatePin: 1,
      onUpdate: (self) => {
        gsap.set('.rail i', { scaleY: self.progress });
        setStep(Math.min(2, Math.floor(self.progress * 3)));
      }
    });

    return () => { // cleanup when the media query stops matching
      $how.removeClass('is-pinned');
      gsap.set($panels, { clearProps: 'all' });
      gsap.set('.rail i', { clearProps: 'all' });
      $steps.removeClass('active').eq(0).addClass('active');
    };
  }));

  /* ---------- Stats counters + product showcase parallax ---------- */
  safe('stats-showcase', () => {
    if (reduce) return; // the final numbers are already written in the HTML

    $('.stat strong').each(function () {
      const $el = $(this);
      const end = parseFloat($el.attr('data-count'));
      const dec = parseInt($el.attr('data-decimals') || '0', 10);
      const suffix = $el.attr('data-suffix') || '';
      const o = { v: 0 };
      $el.text((0).toFixed(dec) + suffix);
      ScrollTrigger.create({
        trigger: this, start: 'top 92%', once: true,
        onEnter: () => gsap.to(o, {
          v: end, duration: 2, ease: 'power2.out',
          onUpdate: () => $el.text(o.v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix)
        })
      });
    });

    // The dashboard flattens out as it scrolls into view
    gsap.set('.showcase-main', { transformPerspective: 1400 });
    gsap.fromTo('.showcase-main', { rotateX: 14, scale: 0.92 }, {
      rotateX: 0, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.showcase-stage', start: 'top 90%', end: 'top 35%', scrub: true }
    });

    // Floating cards move at different speeds to create depth
    $('.float-card').each(function () {
      gsap.to(this, {
        y: -parseFloat($(this).attr('data-speed')) * 160, ease: 'none',
        scrollTrigger: { trigger: '.showcase-stage', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    gsap.from('.bars i', {
      scaleY: 0, duration: 1, stagger: 0.06, ease: 'power3.out',
      scrollTrigger: { trigger: '.bars', start: 'top 80%', once: true }
    });
  });

  /* ---------- ROI calculator + comparison table ---------- */
  safe('roi', () => {
    const WEEKS = 4.33, NOVA_MINUTES = 1, PLAN = 49; // weeks per month, minutes NOVA needs per answer, Team plan price
    const $in = $('.roi input[type="range"]');
    const shown = {}; // numbers currently on screen, so each change animates from the last value
    const num = (v) => Math.round(v).toLocaleString('en-US');

    const setNumber = (id, to, format) => {
      const el = $('#' + id);
      const o = shown[id] || (shown[id] = { v: parseFloat(el.attr('data-v')) || 0 });
      if (reduce) { o.v = to; el.text(format(to)); return; }
      gsap.to(o, { v: to, duration: 0.5, ease: 'power2.out', overwrite: true, onUpdate: () => el.text(format(o.v)) });
    };

    const render = () => {
      const team = +$('#roiTeam').val(), ask = +$('#roiAsk').val(), mins = +$('#roiMins').val(), rate = +$('#roiRate').val();
      const questions = team * ask * WEEKS;               // questions per month
      const today = questions * mins / 60;                // hours per month today
      const nova = Math.min(today, questions * NOVA_MINUTES / 60);
      const saved = today - nova, money = saved * rate;

      $('#roiTeamOut').text(team); $('#roiAskOut').text(ask); $('#roiMinsOut').text(mins + ' min'); $('#roiRateOut').text('$' + rate);
      $in.each(function () {
        const min = +this.min, max = +this.max;
        this.style.setProperty('--p', ((+this.value - min) / (max - min) * 100) + '%');
      });

      setNumber('roiHours', saved, num);
      setNumber('roiMoney', money, (v) => '$' + num(v));
      setNumber('roiToday', today, (v) => num(v) + ' h');
      setNumber('roiNova', nova, (v) => num(v) + ' h');
      const novaScale = today > 0 ? Math.max(0.02, nova / today) : 0.02;
      if (reduce) $('#barNova')[0].style.setProperty('--s', novaScale);
      else gsap.to('#barNova', { scaleX: novaScale, duration: 0.5, ease: 'power2.out', overwrite: true });
      const times = Math.round(money / PLAN);
      $('#roiRatio').text(money < PLAN ? 'The free Starter plan is a good place to begin' : times > 100 ? 'More than 100\u00d7 the cost of the Team plan' : 'About ' + times + '\u00d7 the cost of the Team plan');
    };
    $in.on('input', render);

    if (reduce) return;
    gsap.set('.roi-card, .compare-wrap', { opacity: 0, y: 40 });
    ScrollTrigger.batch('.roi-card, .compare-wrap', {
      start: 'top 88%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out' })
    });
  });

  /* ---------- Testimonials slider + pricing toggle ---------- */
  safe('testimonials', () => {
    if (!window.Swiper) { console.warn('NOVA: Swiper did not load, the slider falls back to scroll-snap'); return; }
    const offset = () => Math.max(16, ($(window).width() - $('.t-head').outerWidth()) / 2);
    const slider = new Swiper('.swiper-t', {
      slidesPerView: 'auto', spaceBetween: 20, speed: 700, grabCursor: true, rewind: true,
      slidesOffsetBefore: offset(), slidesOffsetAfter: 16,
      autoplay: reduce ? false : { delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true },
      navigation: { prevEl: '.t-prev', nextEl: '.t-next' }
    });
    $(window).on('resize', () => { slider.params.slidesOffsetBefore = offset(); slider.update(); });
  });

  safe('pricing', () => {
    const $seg = $('.seg');
    $seg.find('button').on('click', function () {
      const mode = $(this).attr('data-mode');
      if ($seg.attr('data-mode') === mode) return;
      $seg.attr('data-mode', mode).find('button').removeClass('active').attr('aria-pressed', 'false');
      $(this).addClass('active').attr('aria-pressed', 'true');
      $('.billed').each(function () { $(this).text($(this).attr('data-' + mode)); });
      $('.price b').each(function () {
        const $b = $(this), to = parseInt($b.attr('data-' + mode), 10);
        if (reduce) { $b.text(to); return; }
        const o = { v: parseInt($b.text(), 10) };
        gsap.to(o, { v: to, duration: 0.7, ease: 'power3.out', onUpdate: () => $b.text(Math.round(o.v)) });
      });
    });

    if (reduce) return;
    gsap.set('.plan', { opacity: 0, y: 50 });
    ScrollTrigger.batch('.plan', {
      start: 'top 88%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1, stagger: 0.14, ease: 'power3.out' })
    });
  });

  /* ---------- FAQ, CTA, footer ---------- */
  safe('faq', () => {
    // Opening or closing an item changes the page height, so refresh scroll positions
    const list = document.getElementById('faqList');
    ['shown.bs.collapse', 'hidden.bs.collapse'].forEach((ev) => list.addEventListener(ev, () => ScrollTrigger.refresh()));
    if (reduce) return;
    gsap.set('.faq .accordion-item', { opacity: 0, y: 30 });
    ScrollTrigger.batch('.faq .accordion-item', {
      start: 'top 90%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' })
    });
  });

  safe('cta-footer', () => {
    // Signup form: posts to Formspree (the form's action URL)
    $('#ctaForm').on('submit', function (e) {
      e.preventDefault();
      const form = this, $msg = $('#ctaMsg'), $btn = $(form).find('button[type="submit"]');
      const bad = (t) => $msg.text(t).addClass('bad');

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('#ctaEmail').val().trim())) return bad('Please enter a valid email address.');
      if (form.action.includes('YOUR_FORM_ID')) {
        console.warn('NOVA: the Formspree URL is not set. Put your form URL in the form action in index.html.');
        return bad('Demo mode: the form is not connected yet.');
      }

      $btn.prop('disabled', true);
      $msg.text('Sending...').removeClass('bad');
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then((res) => {
          if (res.ok) { $msg.text('You are on the list. We will email you soon.').removeClass('bad'); form.reset(); }
          else if (res.status === 429) bad('Too many tries. Please wait a minute and try again.');
          else bad('Something went wrong. Please try again.');
        })
        .catch(() => bad('Network error. Please check your connection and try again.'))
        .finally(() => $btn.prop('disabled', false));
    });
    $('.to-top').on('click', () => lenis.scrollTo('#home', { offset: 0 }));

    if (reduce) return;
    // The CTA box grows and its corners tighten as it scrolls into view
    gsap.fromTo('.cta-box', { scale: 0.92, borderRadius: 48 }, {
      scale: 1, borderRadius: 32, ease: 'none',
      scrollTrigger: { trigger: '.cta-box', start: 'top 95%', end: 'top 45%', scrub: true }
    });
  });

  /* ---------- Demo video (HTML animation driven by a GSAP timeline) ---------- */
  safe('demo', () => {
    const el = document.getElementById('demoModal');
    if (!el) return;
    const Q = 'Why did signups drop on Tuesday?';
    const typed = { n: 0 };
    const $time = $('#demoTime'), $bar = $('#demoProgress i'), $icon = $('#demoPlay i');
    const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    let iconCls = '';
    const syncIcon = () => {
      const c = 'bi ' + (tl.progress() === 1 ? 'bi-arrow-repeat' : tl.paused() ? 'bi-play-fill' : 'bi-pause-fill');
      if (c !== iconCls) { iconCls = c; $icon.attr('class', c); }
    };
    const tl = gsap.timeline({
      paused: true, defaults: { ease: 'power3.out' },
      onUpdate: () => {
        $bar.css('transform', 'scaleX(' + tl.progress() + ')');
        $time.text(fmt(tl.time()) + ' / ' + fmt(tl.duration()));
        syncIcon();
      }
    });
    const show = (sel, at, dur = 0.6) => tl.fromTo(sel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: dur }, at);
    const hide = (sel, at) => tl.to(sel, { autoAlpha: 0, y: -24, duration: 0.5, ease: 'power2.in' }, at);

    // Scene 1 (0s): connect data sources
    show('.s1', 0.2);
    tl.fromTo('.d-src', { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.6, stagger: 0.5 }, 0.9)
      .fromTo('.d-src em', { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.5 }, 1.5)
      .fromTo('.d-note', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 3.2);
    hide('.s1', 6.4);

    // Scene 2 (7s): type a question and generate the query
    show('.s2', 7);
    tl.fromTo('.s2 .ask', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 7.6)
      .fromTo(typed, { n: 0 }, { n: Q.length, duration: 2.2, ease: 'none', onUpdate: () => $('#dTyped').text(Q.slice(0, Math.round(typed.n))) }, 8.2)
      .fromTo('.d-code', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 10.6)
      .fromTo('.d-ln', { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.35 }, 10.9);
    hide('.s2', 14.4);

    // Scene 3 (15s): draw the chart and show the cause
    show('.s3', 15);
    tl.fromTo('.d-line', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut' }, 15.8)
      .fromTo('.d-area', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }, 16.6)
      .fromTo('.d-insight', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 18.6);
    hide('.s3', 21.4);

    // Scene 4 (22s): share with the team
    show('.s4', 22);
    tl.fromTo('.d-slack', { autoAlpha: 0, y: 30, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7 }, 22.7)
      .fromTo('.d-react span', { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.3, ease: 'back.out(2)' }, 24)
      .fromTo('.d-sent', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 25);
    hide('.s4', 27.4);

    // Scene 5 (28s): end card
    show('.s5', 28, 0.8);
    tl.set({}, {}, 33);

    // Controls
    const play = () => { if (tl.progress() === 1) tl.time(0, false); tl.play(); syncIcon(); };
    $('#demoPlay').on('click', () => { if (tl.paused() || tl.progress() === 1) play(); else { tl.pause(); syncIcon(); } });
    $('#demoRestart').on('click', () => { tl.time(0, false); play(); });
    $('#demoProgress')
      .on('click', function (e) {
        const r = this.getBoundingClientRect();
        tl.progress(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), false);
      })
      .on('keydown', (e) => {
        if (e.key === 'ArrowRight') tl.time(Math.min(tl.duration(), tl.time() + 2), false);
        if (e.key === 'ArrowLeft') tl.time(Math.max(0, tl.time() - 2), false);
      });

    // Modal open/close
    let goCta = false;
    el.addEventListener('shown.bs.modal', () => {
      lenis.stop();
      tl.time(0, false);
      if (reduce) { tl.time(tl.duration(), false); syncIcon(); } else play(); // reduced motion: show the end card, playback starts when Play is pressed
    });
    el.addEventListener('hidden.bs.modal', () => {
      tl.pause(); tl.time(0, false); syncIcon();
      lenis.start();
      if (goCta) { goCta = false; lenis.scrollTo('.cta', { offset: -80 }); }
    });
    $('#demoCta').on('click', () => { goCta = true; bootstrap.Modal.getInstance(el).hide(); });
  });

  /* ---------- Floating back-to-top (progress ring) ---------- */
  safe('back-to-top', () => {
    const $btn = $('#toTop');
    const ring = $btn.find('.ring')[0];
    const C = 132; // circle circumference (2 * pi * 21)
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      ring.style.strokeDashoffset = C * (1 - p);
      $btn.toggleClass('show', window.scrollY > 500);
    };
    $(window).on('scroll resize', update);
    update();
    $btn.on('click', () => lenis.scrollTo('#home', { offset: 0 }));
  });

  // Recalculate positions once fonts and layout have settled
  $(window).on('load', () => ScrollTrigger.refresh());

  /* ---------- Desktop-only effects ---------- */
  if (fine) {
    // 3D tilt
    if (window.VanillaTilt) VanillaTilt.init($('.tilt').get(), { max: 4, perspective: 1200, scale: 1.01, glare: true, 'max-glare': 0.12 });

    // Custom cursor
    const xTo = gsap.quickTo('.cursor', 'x', { duration: 0.4, ease: 'power3' });
    const yTo = gsap.quickTo('.cursor', 'y', { duration: 0.4, ease: 'power3' });
    $(window).on('mousemove', (e) => { $('.cursor').addClass('show'); xTo(e.clientX); yTo(e.clientY); });
    $('a, button, .tilt')
      .on('mouseenter', () => $('.cursor').addClass('big'))
      .on('mouseleave', () => $('.cursor').removeClass('big'));

    // Bento card spotlight: the glow follows the cursor
    $('.bento-card').on('mousemove', function (e) {
      const r = this.getBoundingClientRect();
      this.style.setProperty('--mx', e.clientX - r.left + 'px');
      this.style.setProperty('--my', e.clientY - r.top + 'px');
    });

    // Magnetic buttons
    $('.magnetic')
      .on('mousemove', function (e) {
        const r = this.getBoundingClientRect();
        gsap.to(this, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4 });
      })
      .on('mouseleave', function () {
        gsap.to(this, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      });
  } else {
    $('.cursor').remove();
  }
});
/* ===== NOVA - Step 1: smooth scroll, preloader, hero sequence ===== */
$(function () {
  // Failsafe: JS kisi wajah se atak jaye to 5s baad preloader hat jaye
  setTimeout(() => $('#preloader').remove(), 5000);

  // Check: saari libraries load hui hain ya nahi
  const missing = ['gsap', 'ScrollTrigger'].filter((n) => typeof window[n] === 'undefined');
  if (missing.length) {
    console.error('NOVA: zaroori libraries load nahi hui ->', missing.join(', '));
    $('#preloader, .cursor').remove();
    return;
  }
  // Optional libraries: na milein to page fallback ke saath chalta rahega
  ['Lenis', 'Typed', 'VanillaTilt'].forEach((n) => {
    if (typeof window[n] === 'undefined') console.warn('NOVA: optional library load nahi hui (fallback chalega) ->', n);
  });

  // Har section alag try/catch mein: ek fail ho to baaki chalte rahein
  const safe = (name, fn) => { try { fn(); } catch (e) { console.error('NOVA [' + name + '] mein error:', e); } };

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
  lenis.stop(); // preloader ke dauran scroll band

  $('a[href^="#"]').on('click', function (e) {
    const id = $(this).attr('href');
    if (id === '#') e.preventDefault(); // placeholder links page ko upar na uchhalein
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
  // Headline ko words aur letters mein todna (apna chhota splitter, library ki zaroorat nahi)
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

  /* ---------- Hero sequence (page ka ek hi bada moment) ---------- */
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
    let n = 0; // Fallback: Typed.js na ho to apna typing effect
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

    /* Parallax: scroll par mockup aur orbs halka sa move */
    gsap.to('.mock-wrap', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.orb-1', { y: 140, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- Step 2: Bento grid animations ---------- */
  safe('bento', () => {
    if (reduce) return;
    // Cards stagger mein aate hain
    gsap.set('.bento-card', { opacity: 0, y: 50 });
    ScrollTrigger.batch('.bento-card', {
      start: 'top 88%', once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: 'power3.out' })
    });

    // Chat: sawal, phir jawab, phir sparkline draw
    gsap.set('.msg-q, .msg-a', { opacity: 0, y: 14 });
    gsap.set('.spark path', { strokeDashoffset: 1 });
    gsap.timeline({ scrollTrigger: { trigger: '.chat', start: 'top 80%', once: true } })
      .to('.msg-q', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' })
      .to('.msg-a', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '+=0.5')
      .to('.spark path', { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, '-=0.2');

    // Driver bars left se fill hoti hain
    gsap.from('.bar i', {
      scaleX: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out',
      scrollTrigger: { trigger: '.drivers', start: 'top 85%', once: true }
    });
  });

  /* ---------- Step 3: How it works (pinned scroll) ---------- */
  // Sirf desktop par aur jab reduced-motion off ho. Mobile par steps simple list rehte hain.
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

    return () => { // media change par safai
      $how.removeClass('is-pinned');
      gsap.set($panels, { clearProps: 'all' });
      gsap.set('.rail i', { clearProps: 'all' });
      $steps.removeClass('active').eq(0).addClass('active');
    };
  }));

  /* ---------- Step 4: Stats counters + product showcase parallax ---------- */
  safe('stats-showcase', () => {
    if (reduce) return; // HTML mein final numbers pehle se likhe hain

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

    // Dashboard flat hota hai jaise hi screen par aata hai
    gsap.set('.showcase-main', { transformPerspective: 1400 });
    gsap.fromTo('.showcase-main', { rotateX: 14, scale: 0.92 }, {
      rotateX: 0, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.showcase-stage', start: 'top 90%', end: 'top 35%', scrub: true }
    });

    // Floating cards alag alag speed se uthte hain (depth ka ehsaas)
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

  /* ---------- Step 5: Testimonials slider + pricing toggle ---------- */
  safe('testimonials', () => {
    if (!window.Swiper) { console.warn('NOVA: Swiper load nahi hua, slider scroll-snap fallback par chalega'); return; }
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

  /* ---------- Step 6: FAQ, CTA, footer ---------- */
  safe('faq', () => {
    // Accordion khulne/band hone se page ki height badalti hai, isliye positions refresh
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
    $('#ctaForm').on('submit', function (e) {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('#ctaEmail').val().trim());
      $('#ctaMsg').text(ok ? 'Thanks! Check your inbox for your invite.' : 'Please enter a valid email address.').toggleClass('bad', !ok);
      if (ok) this.reset();
    });
    $('.to-top').on('click', () => lenis.scrollTo('#home', { offset: 0 }));

    if (reduce) return;
    // CTA box scroll ke saath bada hota hai aur corners khulte hain
    gsap.fromTo('.cta-box', { scale: 0.92, borderRadius: 48 }, {
      scale: 1, borderRadius: 32, ease: 'none',
      scrollTrigger: { trigger: '.cta-box', start: 'top 95%', end: 'top 45%', scrub: true }
    });
  });

  /* ---------- Floating back-to-top (progress ring) ---------- */
  safe('back-to-top', () => {
    const $btn = $('#toTop');
    const ring = $btn.find('.ring')[0];
    const C = 132; // circle ki lambai (2 * pi * 21)
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

  // Fonts/layout settle hone ke baad positions dobara calculate
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

    // Bento card spotlight: glow cursor ke saath chalti hai
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
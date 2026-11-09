/* NOVA theme switcher: dark by default, visitors can switch to light (their choice is remembered).
   The switch is animated: a circle of the new theme grows from the toggle button. Browsers without
   the View Transitions API get a smooth colour fade instead. */
(function () {
    var KEY = 'nova-theme';
    var root = document.documentElement;
    var meta = document.querySelector('meta[name="theme-color"]');
    var COLORS = { dark: '#070A1B', light: '#F5F6FC' };
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canFadeTokens = !!(window.CSS && CSS.registerProperty); // colour tokens can animate by themselves
    var timer;

    function current() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

    function apply(theme, persist) {
        root.setAttribute('data-theme', theme);
        root.setAttribute('data-bs-theme', theme);
        if (meta) meta.setAttribute('content', COLORS[theme]);
        document.querySelectorAll('.theme-toggle').forEach(function (btn) {
            btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        });
        if (persist) { try { localStorage.setItem(KEY, theme); } catch (e) { } }
    }

    function toggle(e) {
        var next = current() === 'dark' ? 'light' : 'dark';
        var btn = e && e.currentTarget;

        // Best experience: circular reveal from the button
        if (!reduceMotion && btn && document.startViewTransition) {
            var r = btn.getBoundingClientRect();
            var x = r.left + r.width / 2, y = r.top + r.height / 2;
            var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
            root.classList.add('vt'); // pause the colour fade, the reveal does the work
            var vt = document.startViewTransition(function () { apply(next, true); });
            var done = function () { root.classList.remove('vt'); };
            vt.finished.then(done, done);
            vt.ready.then(function () {
                root.animate(
                    { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
                    { duration: 700, easing: 'cubic-bezier(.22, .8, .2, 1)', pseudoElement: '::view-transition-new(root)' }
                );
            }, function () { });
            return;
        }

        // Older browsers without @property: fade colours with a temporary transition
        if (!reduceMotion && !canFadeTokens) {
            root.classList.add('theme-anim');
            clearTimeout(timer);
            timer = setTimeout(function () { root.classList.remove('theme-anim'); }, 450);
        }
        apply(next, true); // otherwise the registered colour tokens fade on their own
    }

    apply(current(), false);
    document.querySelectorAll('.theme-toggle').forEach(function (btn) { btn.addEventListener('click', toggle); });
})();
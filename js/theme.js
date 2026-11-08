/* NOVA theme switcher: dark by default, visitors can switch to light (their choice is remembered) */
(function () {
    var KEY = 'nova-theme';
    var root = document.documentElement;
    var meta = document.querySelector('meta[name="theme-color"]');
    var COLORS = { dark: '#070A1B', light: '#F5F6FC' };
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    function toggle() {
        if (!reduceMotion) { // smooth colour fade while switching
            root.classList.add('theme-anim');
            clearTimeout(timer);
            timer = setTimeout(function () { root.classList.remove('theme-anim'); }, 450);
        }
        apply(current() === 'dark' ? 'light' : 'dark', true);
    }

    apply(current(), false);
    document.querySelectorAll('.theme-toggle').forEach(function (btn) { btn.addEventListener('click', toggle); });
})();
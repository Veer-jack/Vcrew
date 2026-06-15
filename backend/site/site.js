/* ============================================================
   ValidationCrew — site interactions
   ============================================================ */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* nav: scrolled state */
  const nav = $(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* mobile menu */
  const burger = $(".nav-burger"), menu = $(".mobile-menu");
  if (burger && menu) {
    burger.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      document.body.style.overflow = open ? "hidden" : "";
    });
    $$(".mobile-menu a").forEach(a => a.addEventListener("click", () => {
      menu.classList.remove("open"); document.body.style.overflow = "";
    }));
  }

  /* scroll reveal */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach(el => reduce ? el.classList.add("in") : io.observe(el));

  /* count-up numbers */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const dec = (el.dataset.dec | 0);
    const suffix = el.dataset.suffix || "";
    const prefix = el.dataset.prefix || "";
    const dur = 1400;
    if (reduce) { el.textContent = prefix + fmt(target, dec) + suffix; return; }
    let start = null;
    function fmt(v, d) {
      return d > 0 ? v.toFixed(d) : Math.round(v).toLocaleString("en-IN");
    }
    function tick(ts) {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + fmt(target * eased, dec) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + fmt(target, dec) + suffix;
    }
    requestAnimationFrame(tick);
  }
  function fmt(v, d) { return d > 0 ? v.toFixed(d) : Math.round(v).toLocaleString("en-IN"); }
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); countIO.unobserve(e.target); } });
  }, { threshold: 0.5 });
  $$("[data-count]").forEach(el => countIO.observe(el));

  /* FAQ accordion */
  $$(".faq-item").forEach(item => {
    const q = $(".faq-q", item), a = $(".faq-a", item);
    q.addEventListener("click", () => {
      const open = item.classList.contains("open");
      $$(".faq-item.open").forEach(o => { if (o !== item) { o.classList.remove("open"); $(".faq-a", o).style.maxHeight = null; } });
      item.classList.toggle("open", !open);
      a.style.maxHeight = open ? null : a.scrollHeight + "px";
    });
  });

  /* world maps */
  if (window.VCMap) {
    $$("[data-worldmap]").forEach(c => {
      VCMap.create(c, { dark: c.dataset.worldmap === "dark" });
    });
  }

  /* audience count tick in feature section */
  const audN = $("[data-aud-count]");
  if (audN) {
    const target = parseInt(audN.dataset.audCount, 10);
    const aio = new IntersectionObserver((es) => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        aio.unobserve(e.target);
        if (reduce) { audN.textContent = target.toLocaleString("en-IN"); return; }
        let v = Math.round(target * 0.4), raf;
        const step = () => { v += Math.max(1, Math.round((target - v) / 8)); if (v >= target) v = target; audN.textContent = v.toLocaleString("en-IN"); if (v < target) raf = requestAnimationFrame(step); };
        step();
      });
    }, { threshold: 0.6 });
    aio.observe(audN);
  }

  /* current year */
  $$("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
})();

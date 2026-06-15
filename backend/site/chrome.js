/* ============================================================
   ValidationCrew — shared nav + footer chrome
   Injects into #vc-nav and #vc-footer. Set <body data-page="..">
   ============================================================ */
(function () {
  const page = document.body.dataset.page || "";
  const ic = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };
  const links = [
    { l: "For Builders", h: "builders.html", k: "builders" },
    { l: "For Validators", h: "validators.html", k: "validators" },
    { l: "Use Cases", h: "use-cases.html", k: "use-cases" },
    { l: "Pricing", h: "pricing.html", k: "pricing" },
    { l: "About", h: "about.html", k: "about" },
  ];
  const linkHtml = links.map(x => `<a href="${x.h}"${x.k === page ? ' style="color:var(--ink);background:var(--bg-soft)"' : ""}>${x.l}</a>`).join("");
  const loginHref = page === "validators" ? "/validator/login" : "/login";

  const brand = `<a class="brand" href="index.html"><span class="mark">${ic.shield}</span>Validation<span class="crew">Crew</span></a>`;

  const navRoot = document.getElementById("vc-nav");
  if (navRoot) {
    navRoot.innerHTML = `
      <header class="nav">
        <div class="wrap nav-in">
          ${brand}
          <nav class="nav-links">${linkHtml}</nav>
          <span class="nav-spacer"></span>
          <div class="nav-cta">
            <a class="btn btn-ghost" href="${loginHref}">Sign in</a>
            <a class="btn btn-primary" href="${loginHref}">Get started ${ic.arrow}</a>
            <button class="nav-burger" aria-label="Menu">${ic.menu}</button>
          </div>
        </div>
      </header>
      <div class="mobile-menu">
        ${links.map(x => `<a href="${x.h}">${x.l}</a>`).join("")}
        <a class="btn btn-ghost" href="${loginHref}">Sign in</a>
        <a class="btn btn-primary" href="${loginHref}">Get started</a>
      </div>`;
  }

  const footRoot = document.getElementById("vc-footer");
  if (footRoot) {
    const col = (h, items) => `<div><h5>${h}</h5><ul>${items.map(i => `<li><a href="${i[1]}">${i[0]}</a></li>`).join("")}</ul></div>`;
    const social = (p) => `<a href="#" aria-label="social"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg></a>`;
    footRoot.innerHTML = `
      <footer class="footer">
        <div class="wrap">
          <div class="cols">
            <div>
              ${brand}
              <p class="blurb">The world's human validation network — connecting builders with the right humans to validate products, ideas and decisions before they ship.</p>
              <div class="socials">
                ${social('<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2Z"/>') /* x */}
                ${social('<rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/><path d="M10 9v12M10 14a4 4 0 0 1 8 0v7"/>') /* in */}
                ${social('<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>') /* ig */}
              </div>
            </div>
            ${col("Platform", [["For Builders", "builders.html"], ["For Validators", "validators.html"], ["Pricing", "pricing.html"], ["Use Cases", "use-cases.html"]])}
            ${col("Company", [["About", "about.html"], ["Careers", "about.html"], ["Blog", "#"], ["Press", "#"]])}
            ${col("Resources", [["Help Center", "#"], ["Trust & Safety", "about.html"], ["API Docs", "#"], ["Status", "#"]])}
            ${col("Legal", [["Privacy", "privacy.html"], ["Terms", "terms.html"], ["Security", "privacy.html#security"], ["Contact", "contact.html"]])}
          </div>
          <div class="footer-bot">
            <span>© <span data-year></span> ValidationCrew, Inc. All rights reserved.</span>
            <div class="legal"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="privacy.html#cookies">Cookies</a></div>
          </div>
        </div>
      </footer>`;
  }
})();

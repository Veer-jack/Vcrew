/* ============================================================
   ValidationCrew — shared nav + footer chrome
   Injects into #vc-nav and #vc-footer. Set <body data-page="..">
   ============================================================ */
(function () {
  const page = document.body.dataset.page || "";
  const ic = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    caret: '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    builder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01"/></svg>',
    crewic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9"/></svg>',
  };
  const links = [
    { l: "For Builders", h: "builders.html", k: "builders" },
    { l: "For Validators", h: "validators.html", k: "validators" },
    { l: "Use Cases", h: "use-cases.html", k: "use-cases" },
    { l: "About", h: "about.html", k: "about" },
  ];
  const linkHtml = links.map(x => `<a href="${x.h}"${x.k === page ? ' style="color:var(--ink);background:var(--bg-soft)"' : ""}>${x.l}</a>`).join("");

  const brand = `<a class="brand" href="index.html"><img src="/brand/vc-full-logo.png" alt="ValidationCrew" style="height:56px;width:auto;display:block"></a>`;

  const navRoot = document.getElementById("vc-nav");
  if (navRoot) {
    navRoot.innerHTML = `
      <header class="nav">
        <div class="wrap nav-in">
          ${brand}
          <nav class="nav-links">${linkHtml}</nav>
          <span class="nav-spacer"></span>
          <div class="nav-cta">
            <div class="nav-drop" data-drop>
              <button class="btn btn-ghost nav-dt" aria-haspopup="true" aria-expanded="false">Log in ${ic.caret}</button>
              <div class="nav-menu">
                <span class="nav-menu-lab">Sign in to your account</span>
                <a href="/login"><span class="nm-ic nm-indigo">${ic.builder}</span><span class="nm-tx"><b>As a Builder</b><small>Run &amp; manage validations</small></span></a>
                <a href="/validator/login"><span class="nm-ic nm-emerald">${ic.crewic}</span><span class="nm-tx"><b>As a Validator</b><small>Pick up missions &amp; earn</small></span></a>
              </div>
            </div>
            <div class="nav-drop" data-drop>
              <button class="btn btn-primary nav-dt" aria-haspopup="true" aria-expanded="false">Get started ${ic.caret}</button>
              <div class="nav-menu right">
                <span class="nav-menu-lab">Create a free account</span>
                <a href="/login"><span class="nm-ic nm-indigo">${ic.builder}</span><span class="nm-tx"><b>I'm a Builder</b><small>Test my product with real users</small></span></a>
                <a href="validators.html"><span class="nm-ic nm-emerald">${ic.crewic}</span><span class="nm-tx"><b>I'm a Validator</b><small>Test products &amp; get paid</small></span></a>
              </div>
            </div>
            <button class="nav-burger" aria-label="Menu">${ic.menu}</button>
          </div>
        </div>
      </header>
      <div class="mobile-menu">
        ${links.map(x => `<a href="${x.h}">${x.l}</a>`).join("")}
        <div class="mm-lab">For Builders</div>
        <a class="btn btn-primary" href="/login">Start validating</a>
        <a class="mm-link" href="/login">Builder login</a>
        <div class="mm-lab">For Validators</div>
        <a class="btn btn-ghost" href="validators.html">Become a Validator</a>
        <a class="mm-link" href="/validator/login">Validator login</a>
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
            ${col("Platform", [["For Builders", "builders.html"], ["For Validators", "validators.html"], ["Use Cases", "use-cases.html"]])}
            ${col("Company", [["About", "about.html"], ["Careers", "about.html"], ["Blog", "#"], ["Press", "#"]])}
            ${col("Resources", [["Help Center", "#"], ["Trust & Safety", "about.html"], ["API Docs", "#"], ["Status", "#"]])}
            ${col("Legal", [["Privacy", "privacy.html"], ["Terms", "terms.html"], ["Security", "privacy.html#security"], ["Contact", "contact.html"]])}
          </div>
          <div class="footer-bot">
            <span>© <span data-year></span> ValidationCrew, Inc.</span>
            <div class="legal"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="privacy.html#cookies">Cookies</a></div>
          </div>
        </div>
      </footer>`;
  }
})();

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
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>'
  };
  const links = [
    { l: "For Builders", h: "builders.html", k: "builders" },
    { l: "For Validators", h: "validators.html", k: "validators" },
    { l: "Use Cases", h: "use-cases.html", k: "use-cases" },
    { l: "About", h: "about.html", k: "about" },
  ];
  const linkHtml = links.map(x => `<a href="${x.h}"${x.k === page ? ' style="color:var(--ink);background:var(--bg-soft)"' : ""}>${x.l}</a>`).join("");

  const brand = `<a class="brand" href="index.html"><img src="/brand/vc-full-logo.png" alt="ValidationCrew" style="height:80px;width:auto;display:block"></a>`;

  const defaultCta = `
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
  `;

  const bToken = localStorage.getItem("vc_token");
  const vToken = localStorage.getItem("vc_validator_token");
  
  // To avoid flashing the default buttons when logged in, we render an empty space
  // which will be filled immediately by checkAuthState()
  const initialCta = (bToken || vToken) ? `<div style="width:200px"></div><button class="nav-burger" aria-label="Menu">${ic.menu}</button>` : defaultCta;

  const navRoot = document.getElementById("vc-nav");
  if (navRoot) {
    navRoot.innerHTML = `
      <header class="nav">
        <div class="wrap nav-in">
          ${brand}
          <nav class="nav-links">${linkHtml}</nav>
          <span class="nav-spacer"></span>
          <div class="nav-cta" id="nav-cta-container">
            ${initialCta}
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
      
      checkAuthState();
  }

  const footRoot = document.getElementById("vc-footer");
  if (footRoot) {
    const col = (h, items) => `<div><h5>${h}</h5><ul>${items.map(i => `<li><a href="${i[1]}">${i[0]}</a></li>`).join("")}</ul></div>`;
    const social = (p, href = "#", label = "social") => `<a href="${href}" aria-label="${label}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg></a>`;
    footRoot.innerHTML = `
      <footer class="footer">
        <div class="wrap">
          <div class="cols">
            <div>
              ${brand}
              <p class="blurb">The world's human validation network — connecting builders with the right humans to validate products, ideas and decisions before they ship.</p>
              <div class="socials">
                ${social('<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2Z"/>') /* x */}
                ${social('<rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/><path d="M10 9v12M10 14a4 4 0 0 1 8 0v7"/>', "https://www.linkedin.com/company/validation-crew", "ValidationCrew on LinkedIn")} /* in */
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

  async function checkAuthState() {
    const currentBToken = localStorage.getItem("vc_token");
    const currentVToken = localStorage.getItem("vc_validator_token");
    
    const ctaContainer = document.getElementById("nav-cta-container");
    if (!ctaContainer) return;

    if (!currentBToken && !currentVToken) {
      // Revert to default CTA if logged out (useful for back-forward cache)
      if (!ctaContainer.innerHTML.includes("Log in")) {
        ctaContainer.innerHTML = defaultCta;
      }
      return;
    }

    try {
      let user = null;
      let role = "";
      let dashboardUrl = "";
      let profileUrl = "";
      let settingsUrl = "";
      let tokenKey = "";

      if (currentBToken) {
        const res = await fetch("/api/auth/me", { headers: { "Authorization": `Bearer ${currentBToken}` } });
        if (res.ok) {
          const data = await res.json();
          user = data.builder;
          role = "Builder";
          dashboardUrl = "/";
          profileUrl = "/profile";
          settingsUrl = "/settings";
          tokenKey = "vc_token";
        }
      } else if (currentVToken) {
        const res = await fetch("/api/v/auth/me", { headers: { "Authorization": `Bearer ${currentVToken}` } });
        if (res.ok) {
          const data = await res.json();
          user = data.validator;
          role = "Validator";
          dashboardUrl = "/validator";
          profileUrl = "/validator/profile";
          settingsUrl = "/validator/settings";
          tokenKey = "vc_validator_token";
        }
      }

      if (user) {
        const name = user.name || role;
        const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
        const userIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        const settingsIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

        ctaContainer.innerHTML = `
          <div style="display:flex; align-items:center; gap:16px;">
            <a href="${dashboardUrl}" class="btn btn-primary" style="display:flex; align-items:center; gap:8px; padding:8px 16px;">
              <span style="width:16px;height:16px;display:inline-flex;">${ic.grid}</span> Go to Dashboard
            </a>
            
            <div class="nav-drop" data-drop id="auth-nav-drop">
              <div class="nav-dt" aria-haspopup="true" aria-expanded="false" style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                <div style="width:36px; height:36px; border-radius:50%; background:var(--ink, #0f172a); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:14px; letter-spacing:0.5px; flex-shrink:0;">
                  ${initials}
                </div>
                <div style="display:flex; flex-direction:column; line-height:1.2; text-align:left;">
                  <span style="font-weight:600; font-size:14px; color:var(--ink, #0f172a);">${name}</span>
                  <span style="font-size:12px; color:var(--text-light, #64748b); display:flex; align-items:center; gap:4px;">
                    ${role} 
                    <svg style="width:12px; height:12px; color:var(--text-light);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </span>
                </div>
              </div>
              
              <div class="nav-menu right" style="min-width:180px;">
                <a href="${profileUrl}">
                  <span style="color:var(--text-light); display:inline-flex; width:16px; height:16px;">${userIcon}</span>
                  <span style="font-weight:500; font-size:14px; color:var(--ink);">Profile</span>
                </a>
                <a href="${settingsUrl}">
                  <span style="color:var(--text-light); display:inline-flex; width:16px; height:16px;">${settingsIcon}</span>
                  <span style="font-weight:500; font-size:14px; color:var(--ink);">Settings</span>
                </a>
                <div style="height:1px; background:var(--border, #e2e8f0); margin:4px 12px;"></div>
                <a href="#" onclick="localStorage.removeItem('${tokenKey}'); window.location.reload(); return false;">
                  <span style="color:var(--text-light); display:inline-flex; width:16px; height:16px;">${ic.logout}</span>
                  <span style="font-weight:500; font-size:14px; color:var(--ink);">Sign out</span>
                </a>
              </div>
            </div>
          </div>
          <button class="nav-burger" aria-label="Menu">${ic.menu}</button>
        `;

        // Bind dropdown hover/click listeners dynamically 
        const d = document.getElementById("auth-nav-drop");
        if (d) {
          const t = d.querySelector(".nav-dt");
          let leaveTimer = null;
          t.addEventListener("click", (e) => {
            e.preventDefault();
            const open = d.classList.toggle("open");
            t.setAttribute("aria-expanded", open ? "true" : "false");
          });
          d.addEventListener("mouseenter", () => { clearTimeout(leaveTimer); d.classList.add("open"); t.setAttribute("aria-expanded", "true"); });
          d.addEventListener("mouseleave", () => { leaveTimer = setTimeout(() => { d.classList.remove("open"); t.setAttribute("aria-expanded", "false"); }, 120); });
        }
      } else {
        // Validation failed (e.g. expired token), render default CTA
        ctaContainer.innerHTML = defaultCta;
      }
    } catch (err) {
      console.error("Failed to fetch auth state for navbar", err);
      ctaContainer.innerHTML = defaultCta;
    }
  }

  // Handle bfcache (Back-Forward Cache) to instantly update nav state on back button navigation
  window.addEventListener("pageshow", (event) => {
    // Re-verify auth state every time the page becomes visible
    if (event.persisted || window.performance && window.performance.navigation.type === 2) {
      checkAuthState();
    }
  });

})();

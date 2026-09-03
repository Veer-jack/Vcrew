/* ============================================================
   ValidationCrew — shared nav + footer chrome
   Injects into #vc-nav and #vc-footer. Set <body data-page="..">
   ============================================================ */
(function () {
  const page = document.body.dataset.page || "";

  const T = {
    forBuilders: "For Builders",
    forValidators: "For Validators",
    useCases: "Use Cases",
    about: "About",
    logIn: "Log in",
    signInAccount: "Sign in to your account",
    asBuilder: "As a Builder",
    asBuilderDesc: "Run &amp; manage validations",
    asValidator: "As a Validator",
    asValidatorDesc: "Pick up missions &amp; earn",
    getStarted: "Get started",
    createAccount: "Create a free account",
    imBuilder: "I'm a Builder",
    imBuilderDesc: "Test my product with real users",
    imValidator: "I'm a Validator",
    imValidatorDesc: "Test products &amp; get paid",
    startValidating: "Start validating",
    builderLogin: "Builder login",
    becomeValidator: "Become a Validator",
    validatorLogin: "Validator login",
    blurb: "ValidationCrew is a human validation network that connects organizations with matched users, testers and experts to validate products, ideas and decisions through structured human feedback.",
    platform: "Platform",
    company: "Company",
    resources: "Resources",
    legalStr: "Legal",
    careers: "Careers",
    blog: "Blog",
    press: "Press",
    helpCenter: "Help Center",
    trustSafety: "Trust & Safety",
    apiDocs: "API Docs",
    status: "Status",
    privacy: "Privacy",
    terms: "Terms",
    security: "Security",
    contact: "Contact",
    cookies: "Cookies",
    goToDashboard: "Go to Dashboard",
    profile: "Profile",
    settings: "Settings",
    signOut: "Sign out",
    signedInAs: "You're currently signed in as a ",
    signOutFirst: "Please sign out first to continue as a ",
  };

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
  // "For Builders" alone carries a hover menu of intent pages (Idea
  // Validation, User Testing, ...) — a dedicated `sub` list here rather than
  // a separate top-level nav entry each, so adding another one later is a
  // one-line addition, not a new dropdown to wire up.
  const links = [
    { l: T.forBuilders, h: "/site/builders.html", k: "builders", sub: [
      { l: "Idea Validation", h: "/for-builders/idea-validation/" },
      { l: "User Testing", h: "/for-builders/user-testing/" },
    ] },
    { l: T.forValidators, h: "/site/validators.html", k: "validators" },
    { l: T.useCases, h: "/site/use-cases.html", k: "use-cases" },
    { l: T.about, h: "/site/about.html", k: "about" },
  ];
  const linkHtml = links.map(x => {
    const active = x.k === page ? ' style="color:var(--ink);background:var(--bg-soft)"' : "";
    if (!x.sub) return `<a href="${x.h}"${active}>${x.l}</a>`;
    // Hover-only, pure CSS (see .nav-drop-hover in site.css) — unlike the
    // auth dropdowns below, this parent is a real destination in its own
    // right, so clicking it still navigates to builders.html; the menu is
    // just an extra way to jump straight to one of its intent pages.
    return `<div class="nav-drop-hover">
      <a href="${x.h}"${active}>${x.l}</a>
      <div class="builder-menu">${x.sub.map(s => `<a href="${s.h}">${s.l}</a>`).join("")}</div>
    </div>`;
  }).join("");

  const brand = `<a class="brand" href="/site/index.html"><img src="/brand/vc-full-logo.png" alt="ValidationCrew" style="height:80px;width:auto;display:block"></a>`;

  const defaultCta = `
    <div class="nav-drop" data-drop>
      <button class="btn btn-ghost nav-dt" aria-haspopup="true" aria-expanded="false">${T.logIn} ${ic.caret}</button>
      <div class="nav-menu">
        <span class="nav-menu-lab">${T.signInAccount}</span>
        <a href="/login"><span class="nm-ic nm-indigo">${ic.builder}</span><span class="nm-tx"><b>${T.asBuilder}</b><small>${T.asBuilderDesc}</small></span></a>
        <a href="/validator/login"><span class="nm-ic nm-emerald">${ic.crewic}</span><span class="nm-tx"><b>${T.asValidator}</b><small>${T.asValidatorDesc}</small></span></a>
      </div>
    </div>
    <div class="nav-drop" data-drop>
      <button class="btn btn-primary nav-dt" aria-haspopup="true" aria-expanded="false">${T.getStarted} ${ic.caret}</button>
      <div class="nav-menu right">
        <span class="nav-menu-lab">${T.createAccount}</span>
        <a href="/login?mode=signup"><span class="nm-ic nm-indigo">${ic.builder}</span><span class="nm-tx"><b>${T.imBuilder}</b><small>${T.imBuilderDesc}</small></span></a>
        <a href="/validator/login?mode=signup"><span class="nm-ic nm-emerald">${ic.crewic}</span><span class="nm-tx"><b>${T.imValidator}</b><small>${T.imValidatorDesc}</small></span></a>
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
        <div class="wrap nav-in" id="nav-in-wrapper">
          <div class="stagger-item" style="opacity:0; transform:translateY(-10px); transition:all 0.5s ease;">${brand}</div>
          <nav class="nav-links stagger-item" style="opacity:0; transform:translateY(-10px); transition:all 0.5s ease;">${linkHtml}</nav>
          <span class="nav-spacer"></span>

          <div class="lang-selector-container" style="position:relative; margin-right: 24px; display: flex; align-items: center; z-index: 9999;">
            <button id="lang-btn" style="border: 1px solid var(--border, #e2e8f0); border-radius: 99px; padding: 6px 14px; font-size: 13px; color: var(--ink, #0f172a); font-weight: 600; display: flex; align-items: center; gap: 8px; background: white; cursor: pointer; transition: all 0.2s;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M2 12h20"></path></svg>
              <span id="lang-label">EN</span> 
              <svg style="width:14px; height:14px; color:#64748b;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div id="lang-menu" style="position: absolute; top: calc(100% + 8px); right: 0; min-width: 180px; padding: 8px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid var(--border, #e2e8f0); background: white; display: none; flex-direction: column; gap: 2px;">
            </div>
          </div>
          <div class="nav-cta stagger-item" id="nav-cta-container" style="opacity:0; transform:translateY(-10px); transition:all 0.5s ease;">
            ${initialCta}
          </div>
        </div>
      </header>
      <div class="mobile-menu">
        ${links.map(x => `<a href="${x.h}">${x.l}</a>`).join("")}
        <div class="mm-lab">${T.forBuilders}</div>
        <a class="mm-link" href="/for-builders/idea-validation/">Idea Validation</a>
        <a class="mm-link" href="/for-builders/user-testing/">User Testing</a>
        <a class="btn btn-primary" href="/login">${T.startValidating}</a>
        <a class="mm-link" href="/login">${T.builderLogin}</a>
        <div class="mm-lab">${T.forValidators}</div>
        <a class="btn btn-ghost" href="/site/validators.html">${T.becomeValidator}</a>
        <a class="mm-link" href="/validator/login">${T.validatorLogin}</a>
      </div>`;
      
    // Wait for the auth state to fetch and render, then stagger the fade in
    checkAuthState().then(() => {
      const items = navRoot.querySelectorAll('.stagger-item');
      items.forEach((item, index) => {
        setTimeout(() => {
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';
          
          // If this is the last item, trigger the rest of the page to fade in!
          if (index === items.length - 1) {
            setTimeout(() => {
              document.body.classList.add('page-ready');
            }, 300); // Brief pause after the last navbar element appears
          }
        }, index * 150); // 150ms stagger
      });
      
      // Fallback in case items array is empty for some reason
      if (items.length === 0) {
        document.body.classList.add('page-ready');
      }
    });
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
              <p class="blurb">${T.blurb}</p>
              <div class="socials">
                ${social('<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2Z"/>') /* x */}
                ${social('<rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/><path d="M10 9v12M10 14a4 4 0 0 1 8 0v7"/>', "https://www.linkedin.com/company/validation-crew", "ValidationCrew on LinkedIn")} /* in */
                ${social('<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>') /* ig */}
              </div>
            </div>
            ${col(T.platform, [[T.forBuilders, "/site/builders.html"], [T.forValidators, "/site/validators.html"], [T.useCases, "/site/use-cases.html"]])}
            ${col(T.company, [[T.about, "/site/about.html"], [T.careers, "/site/about.html"], [T.blog, "#"], [T.press, "#"]])}
            ${col(T.resources, [[T.helpCenter, "#"], [T.trustSafety, "/site/about.html"], [T.apiDocs, "#"], [T.status, "#"]])}
            ${col(T.legalStr, [[T.privacy, "/site/privacy.html"], [T.terms, "/site/terms.html"], [T.security, "/site/privacy.html#security"], [T.contact, "/site/contact.html"]])}
          </div>
          <div class="footer-bot">
            <span>© <span data-year></span> ValidationCrew, Inc.</span>
            <div class="legal"><a href="/site/privacy.html">${T.privacy}</a><a href="/site/terms.html">${T.terms}</a><a href="/site/privacy.html#cookies">${T.cookies}</a></div>
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
              <span style="width:16px;height:16px;display:inline-flex;">${ic.grid}</span> ${T.goToDashboard}
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
                  <span style="font-weight:500; font-size:14px; color:var(--ink);">${T.profile}</span>
                </a>
                <a href="${settingsUrl}">
                  <span style="color:var(--text-light); display:inline-flex; width:16px; height:16px;">${settingsIcon}</span>
                  <span style="font-weight:500; font-size:14px; color:var(--ink);">${T.settings}</span>
                </a>
                <div style="height:1px; background:var(--border, #e2e8f0); margin:4px 12px;"></div>
                <a href="#" onclick="localStorage.removeItem('${tokenKey}'); window.location.reload(); return false;">
                  <span style="color:var(--text-light); display:inline-flex; width:16px; height:16px;">${ic.logout}</span>
                  <span style="font-weight:500; font-size:14px; color:var(--ink);">${T.signOut}</span>
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

  // Toast Notification Helper
  function showAuthToast(currentRole, targetRole) {
    let toast = document.getElementById("vc-auth-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "vc-auth-toast";
      toast.style.cssText = `
        position: fixed; top: 80px; right: 24px; z-index: 9999;
        background: white; color: var(--ink, #0f172a);
        padding: 16px 20px 16px 16px; border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04);
        border: 1px solid var(--border, #e2e8f0);
        display: flex; flex-direction: column; gap: 12px;
        width: 380px;
        transform: translateX(120%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: inherit;
      `;
      
      toast.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="background: #e0e7ff; color: #4f46e5; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </div>
          <div style="flex: 1;">
            <div id="vc-auth-toast-title" style="font-weight: 600; font-size: 14px; margin-bottom: 4px;"></div>
            <div id="vc-auth-toast-sub" style="font-size: 13px; color: #64748b;"></div>
          </div>
          <button id="vc-auth-toast-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0; display: flex;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <button id="vc-auth-toast-signout" style="background: none; border: none; color: #4f46e5; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      `;
      
      document.body.appendChild(toast);
      
      document.getElementById("vc-auth-toast-close").onclick = () => { toast.style.transform = "translateX(120%)"; };
      document.getElementById("vc-auth-toast-signout").onclick = () => { 
        localStorage.removeItem("vc_token");
        localStorage.removeItem("vc_validator_token");
        window.location.reload();
      };
      
      document.addEventListener("click", (e) => {
        const createdAt = parseInt(toast.dataset.createdAt || "0", 10);
        if (createdAt > 0 && Date.now() - createdAt > 1000) {
          if (!toast.contains(e.target)) {
            toast.style.transform = "translateX(120%)";
          }
        }
      });
    }
    
    toast.dataset.createdAt = Date.now();
    document.getElementById("vc-auth-toast-title").textContent = `${T.signedInAs}${currentRole}.`;
    document.getElementById("vc-auth-toast-sub").textContent = `${T.signOutFirst}${targetRole}.`;
    
    // Trigger animation
    requestAnimationFrame(() => {
      toast.style.transform = "translateX(0)";
    });
  }

  // Intercept Auth Clicks
  document.addEventListener("click", (e) => {
    const target = e.target.closest("a");
    if (!target) return;
    
    const href = target.getAttribute("href");
    if (!href) return;

    const currentBToken = localStorage.getItem("vc_token");
    const currentVToken = localStorage.getItem("vc_validator_token");

    if (currentBToken) {
      if (href === "/validator/login" || href.startsWith("/validator/login?")) {
        e.preventDefault();
        showAuthToast("Builder", "Validator");
      } else if (href === "/login" || href.startsWith("/login?")) {
        e.preventDefault();
        window.location.href = "/missions";
      }
    } else if (currentVToken) {
      if (href === "/login" || href.startsWith("/login?")) {
        e.preventDefault();
        showAuthToast("Validator", "Builder");
      } else if (href === "/validator/login" || href.startsWith("/validator/login?")) {
        e.preventDefault();
        window.location.href = "/validator/missions"; // Or wherever the validator dashboard goes
      }
    }
  });

  // Handle bfcache (Back-Forward Cache) to instantly update nav state on back button navigation
  window.addEventListener("pageshow", (event) => {
    // Re-verify auth state every time the page becomes visible
    if (event.persisted || window.performance && window.performance.navigation.type === 2) {
      checkAuthState();
    }
  });


  // Language Selector Interactive Logic
  const langBtn = document.getElementById('lang-btn');
  const langMenu = document.getElementById('lang-menu');
  const langLabel = document.getElementById('lang-label');
  
  const langs = [
    { code: 'en', flag: '🇺🇸', native: 'English', english: 'English' },
    { code: 'hi', flag: '🇮🇳', native: 'हिंदी', english: 'Hindi' },
    { code: 'zh', flag: '🇨🇳', native: '中文', english: 'Mandarin' },
    { code: 'es', flag: '🇪🇸', native: 'Español', english: 'Spanish' },
    { code: 'ar', flag: '🇸🇦', native: 'العربية', english: 'Arabic' },
    { code: 'fr', flag: '🇫🇷', native: 'Français', english: 'French' },
    { code: 'pt', flag: '🇧🇷', native: 'Português', english: 'Portuguese' },
    { code: 'ru', flag: '🇷🇺', native: 'Русский', english: 'Russian' },
    { code: 'bn', flag: '🇧🇩', native: 'বাংলা', english: 'Bengali' },
    { code: 'ur', flag: '🇵🇰', native: 'اردو', english: 'Urdu' }
  ];

  const currentLang = localStorage.getItem('vc_lang') || 'en';
  const currObj = langs.find(l => l.code === currentLang) || langs[0];
  if (langLabel) langLabel.textContent = currObj.code.toUpperCase();

  if (langMenu) {
    langMenu.innerHTML = langs.map(l => {
      const isSelected = l.code === currentLang;
      return `
        <a href="#" data-lang="${l.code}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; text-decoration: none; background: ${isSelected ? '#f8fafc' : 'transparent'}; transition: background 0.2s;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 18px;">${l.flag}</span>
            <div style="display: flex; flex-direction: column; line-height: 1.2;">
              <span style="font-weight: 600; color: ${isSelected ? '#4f46e5' : '#0f172a'}; font-size: 13px;">${l.native}</span>
              <span style="font-size: 11px; color: #64748b;">${l.english}</span>
            </div>
          </div>
          ${isSelected ? '<svg style="width: 16px; height: 16px; color: #4f46e5; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
        </a>
      `;
    }).join('');

    langMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const selected = e.currentTarget.getAttribute('data-lang');
        localStorage.setItem('vc_lang', selected);
        
        const path = window.location.pathname;
        let filename = path.split('/').pop() || 'index.html';
        
        if (selected === 'en') {
          window.location.href = `/site/${filename}`;
        } else {
          window.location.href = `/site/${selected}/${filename}`;
        }
      });
    });
  }

  if (langBtn && langMenu) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = langMenu.style.display === 'none';
      langMenu.style.display = isHidden ? 'flex' : 'none';
      if (isHidden) {
        langBtn.style.background = '#f8fafc';
      } else {
        langBtn.style.background = 'white';
      }
    });

    document.addEventListener('click', (e) => {
      if (!langMenu.contains(e.target) && e.target !== langBtn) {
        langMenu.style.display = 'none';
        langBtn.style.background = 'white';
      }
    });
  }

})();

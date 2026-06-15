// Generic OAuth (authorization code flow) helpers for social login.
// Each provider needs CLIENT_ID / CLIENT_SECRET env vars. A provider with
// missing credentials is reported as "not configured" rather than erroring.

const APP_URL = (process.env.APP_URL || "http://localhost:4000").replace(/\/$/, "");

function redirectUri(provider, base) {
  return `${APP_URL}${base}/oauth/${provider}/callback`;
}

export const PROVIDERS = {
  github: {
    name: "GitHub",
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    scope: "read:user user:email",
    authorizeUrl(state, base) {
      const params = new URLSearchParams({
        client_id: this.clientId,
        redirect_uri: redirectUri("github", base),
        scope: this.scope,
        state,
      });
      return `https://github.com/login/oauth/authorize?${params}`;
    },
    async exchangeCode(code, base) {
      const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: redirectUri("github", base),
        }),
      });
      const data = await res.json();
      if (!data.access_token) throw new Error(data.error_description || "GitHub token exchange failed");
      return data.access_token;
    },
    async fetchProfile(accessToken) {
      const headers = { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json", "User-Agent": "ValidationCrew" };
      const userRes = await fetch("https://api.github.com/user", { headers });
      const user = await userRes.json();

      let email = user.email;
      if (!email) {
        const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
        const emails = await emailsRes.json();
        const primary = Array.isArray(emails) ? emails.find(e => e.primary && e.verified) || emails.find(e => e.verified) : null;
        email = primary?.email;
      }
      if (!email) throw new Error("GitHub account has no accessible email address");

      return {
        id: String(user.id),
        name: user.name || user.login,
        email,
        handle: user.login ? `@${user.login}` : null,
      };
    },
  },

  // Google and LinkedIn follow the same shape — fill in clientId/clientSecret
  // via env vars and these become usable without further code changes.
  google: {
    name: "Google",
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scope: "openid email profile",
    authorizeUrl(state, base) {
      const params = new URLSearchParams({
        client_id: this.clientId,
        redirect_uri: redirectUri("google", base),
        response_type: "code",
        scope: this.scope,
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    },
    async exchangeCode(code, base) {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: redirectUri("google", base),
          grant_type: "authorization_code",
        }),
      });
      const data = await res.json();
      if (!data.access_token) throw new Error(data.error_description || "Google token exchange failed");
      return data.access_token;
    },
    async fetchProfile(accessToken) {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
      const user = await res.json();
      if (!user.email) throw new Error("Google account has no accessible email address");
      return { id: String(user.id), name: user.name, email: user.email, handle: null };
    },
  },

  linkedin: {
    name: "LinkedIn",
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    scope: "openid profile email",
    authorizeUrl(state, base) {
      const params = new URLSearchParams({
        client_id: this.clientId,
        redirect_uri: redirectUri("linkedin", base),
        response_type: "code",
        scope: this.scope,
        state,
      });
      return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
    },
    async exchangeCode(code, base) {
      const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: redirectUri("linkedin", base),
          grant_type: "authorization_code",
        }),
      });
      const data = await res.json();
      if (!data.access_token) throw new Error(data.error_description || "LinkedIn token exchange failed");
      return data.access_token;
    },
    async fetchProfile(accessToken) {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
      const user = await res.json();
      if (!user.email) throw new Error("LinkedIn account has no accessible email address");
      return { id: String(user.sub), name: user.name, email: user.email, handle: null };
    },
  },
};

export function isConfigured(provider) {
  const p = PROVIDERS[provider];
  return !!(p && p.clientId && p.clientSecret);
}

export function frontendUrl() {
  return (process.env.FRONTEND_URL || APP_URL).replace(/\/$/, "");
}

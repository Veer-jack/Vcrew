const BASE = "/api/v";

let token = localStorage.getItem("vc_validator_token") || null;

export function setVToken(t) {
  token = t;
  if (t) localStorage.setItem("vc_validator_token", t);
  else localStorage.removeItem("vc_validator_token");
}
export function getVToken() {
  return token;
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.code = data && data.code;
    err.detail = data && data.detail;
    // A dead/expired session shows up as 401s on whatever the page happens to
    // be fetching next — clear it and bounce to Sign In instead of leaving
    // the page stuck showing a blank/retry state.
    if (res.status === 401 && token) {
      setVToken(null);
      if (!window.location.pathname.startsWith("/validator/login")) window.location.href = "/validator/login";
    }
    throw err;
  }
  return data;
}

export const vapi = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload }),
  forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token, password) => request("/auth/reset-password", { method: "POST", body: { token, password } }),
  changePassword: (currentPassword, newPassword) => request("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } }),
  setLanguage: (lang) => request("/auth/language", { method: "PATCH", body: { lang } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),

  meta: () => request("/meta"),
  oauthProviders: () => request("/auth/oauth/providers"),
  firebaseConfig: () => fetch("/api/firebase/config").then(r => r.json()),
  phoneLoginVerify: (idToken) => request("/auth/phone-login", { method: "POST", body: { idToken } }),
  phoneLink: (idToken) => request("/auth/phone/link", { method: "POST", body: { idToken } }),
  phoneRemove: () => request("/auth/phone/remove", { method: "POST" }),
  stepUpVerify: (idToken) => request("/earnings/stepup/verify", { method: "POST", body: { idToken } }),

  marketplace: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null && v !== false));
    return request(`/marketplace${qs.toString() ? `?${qs}` : ""}`);
  },
  task: (id) => request(`/marketplace/${id}`),
  saveTask: (id, saved) => request(`/marketplace/${id}/save`, { method: "POST", body: { saved } }),
  applyTask: (id) => request(`/marketplace/${id}/apply`, { method: "POST" }),
  reportMission: (id, reason) => request(`/marketplace/${id}/report`, { method: "POST", body: { reason } }),
  declineMission: (id) => request(`/marketplace/${id}/decline`, { method: "POST" }),
  undeclineMission: (id) => request(`/marketplace/${id}/undecline`, { method: "POST" }),

  myMissions: (status) => request(`/missions${status ? `?status=${status}` : ""}`),
  invitations: () => request("/missions/invitations"),
  acceptInvitation: (id) => request(`/missions/invitations/${id}/accept`, { method: "POST" }),
  declineInvitation: (id) => request(`/missions/invitations/${id}/decline`, { method: "POST" }),
  workspace: (taskId) => request(`/missions/${taskId}`),
  submit: (taskId, payload) => request(`/missions/${taskId}/submit`, { method: "POST", body: payload }),
  workspaceData: (id) => request(`/missions/${id}/workspace`),
  submitWorkspaceData: (id, payload) => request(`/missions/${id}/workspace/submit`, { method: "PATCH", body: payload }),
  saveWorkspaceDraft: (id, payload) => request(`/missions/${id}/workspace/draft`, { method: "PATCH", body: payload }),
  uploadWorkspaceProof: async (id, file) => {
    const token = getVToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/v/missions/${id}/workspace/proof`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    let data;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error((data && data.error) || "Upload failed");
    return data;
  },
  uploadCheckinProof: async (id, file) => {
    const token = getVToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/v/missions/${id}/checkin/proof`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    let data;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error((data && data.error) || "Upload failed");
    return data;
  },
  uploadResume: async (file) => {
    const token = getVToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/v/auth/profile/resume`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    let data;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error((data && data.error) || "Resume upload failed");
    return data;
  },

  earnings: () => request("/earnings"),
  withdraw: (amount, stepUpToken) => request("/earnings/withdraw", { method: "POST", body: { amount, stepUpToken } }),
  payoutsConfig: () => fetch("/api/v/payouts/config").then(r => r.json()),
  setPayoutVpa: (vpa) => request("/payouts/vpa", { method: "POST", body: { vpa } }),
  removePayoutVpa: () => request("/payouts/remove", { method: "POST" }),
  payoutHistory: () => request("/payouts/history"),

  profile: () => request("/profile"),
  updateProfile: (body) => request("/profile", { method: "PATCH", body }),

  notifications: () => request("/notifications"),
  markAllRead: () => request("/notifications/read-all", { method: "POST" }),
  clearAllNotifications: () => request("/notifications/clear-all", { method: "POST" }),
  markRead: (id) => request(`/notifications/${id}`, { method: "PATCH" }),

  threads: () => request("/messages/threads"),
  thread: (id) => request(`/messages/threads/${id}`),
  sendMessage: (threadId, text) => request(`/messages/threads/${threadId}/messages`, { method: "POST", body: { text } }),
  sendAttachment: (threadId, file) => {
    const form = new FormData();
    form.append("file", file);
    const t = token;
    return fetch(`/api/v/messages/threads/${threadId}/attachment`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: form,
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Upload failed (${r.status})`);
      return data;
    });
  },

  support: () => request("/support"),
  raiseTicket: (payload) => request("/support/tickets", { method: "POST", body: payload }),
  getTicket: (id) => request(`/support/tickets/${id}`),
};

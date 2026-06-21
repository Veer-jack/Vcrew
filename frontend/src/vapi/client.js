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
    throw err;
  }
  return data;
}

export const vapi = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

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

  myMissions: (status) => request(`/missions${status ? `?status=${status}` : ""}`),
  workspace: (taskId) => request(`/missions/${taskId}`),
  submit: (taskId, payload) => request(`/missions/${taskId}/submit`, { method: "POST", body: payload }),

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
  markRead: (id) => request(`/notifications/${id}`, { method: "PATCH" }),

  threads: () => request("/messages/threads"),
  thread: (id) => request(`/messages/threads/${id}`),
  sendMessage: (threadId, text) => request(`/messages/threads/${threadId}/messages`, { method: "POST", body: { text } }),

  support: () => request("/support"),
  raiseTicket: (payload) => request("/support/tickets", { method: "POST", body: payload }),
};

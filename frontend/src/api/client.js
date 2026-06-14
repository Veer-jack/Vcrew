const BASE = "/api";

let token = localStorage.getItem("vc_token") || null;

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem("vc_token", t);
  else localStorage.removeItem("vc_token");
}
export function getToken() {
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
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  meta: () => request("/meta"),

  dashboard: () => request("/dashboard"),

  missions: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return request(`/missions${qs.toString() ? `?${qs}` : ""}`);
  },
  mission: (id) => request(`/missions/${id}`),
  createMission: (payload) => request("/missions", { method: "POST", body: payload }),
  updateMission: (id, payload) => request(`/missions/${id}`, { method: "PATCH", body: payload }),
  moveParticipant: (missionId, participantId, stage) =>
    request(`/missions/${missionId}/participants/${participantId}`, { method: "PATCH", body: { stage } }),
  flagResponse: (missionId, responseId, flagged) =>
    request(`/missions/${missionId}/responses/${responseId}`, { method: "PATCH", body: { flagged } }),

  audience: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return request(`/audience${qs.toString() ? `?${qs}` : ""}`);
  },

  analytics: () => request("/analytics"),

  wallet: () => request("/wallet"),
  topup: (amount) => request("/wallet/topup", { method: "POST", body: { amount } }),

  notifications: () => request("/notifications"),
  markAllRead: () => request("/notifications/read-all", { method: "POST" }),
  markRead: (id) => request(`/notifications/${id}`, { method: "PATCH" }),

  threads: () => request("/messages/threads"),
  thread: (id) => request(`/messages/threads/${id}`),
  sendMessage: (threadId, text) => request(`/messages/threads/${threadId}/messages`, { method: "POST", body: { text } }),
};

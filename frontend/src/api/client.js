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
    err.code = data && data.code;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload }),
  completeOnboarding: (payload) => request("/auth/onboarding", { method: "PATCH", body: payload }),
  forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token, password) => request("/auth/reset-password", { method: "POST", body: { token, password } }),
  changePassword: (currentPassword, newPassword) => request("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } }),
  setLanguage: (lang) => request("/auth/language", { method: "PATCH", body: { lang } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  oauthProviders: () => request("/auth/oauth/providers"),
  updateProfile: (body) => request("/auth/profile", { method: "PATCH", body }),
  phoneLoginVerify: (idToken) => request("/auth/phone-login", { method: "POST", body: { idToken } }),
  phoneLink: (idToken) => request("/auth/phone/link", { method: "POST", body: { idToken } }),
  phoneRemove: () => request("/auth/phone/remove", { method: "POST" }),
  reapplyVerification: () => request("/auth/reapply-verification", { method: "POST" }),
  support: () => request("/support"),
  raiseTicket: (payload) => request("/support/tickets", { method: "POST", body: payload }),
  getTicket: (id) => request(`/support/tickets/${id}`),
  firebaseConfig: () => fetch("/api/firebase/config").then(r => r.json()),
  phoneLoginVerify: (idToken) => request("/auth/phone-login", { method: "POST", body: { idToken } }),
  phoneLink: (idToken) => request("/auth/phone/link", { method: "POST", body: { idToken } }),
  phoneRemove: () => request("/auth/phone/remove", { method: "POST" }),
  stepUpVerify: (idToken) => request("/wallet/stepup/verify", { method: "POST", body: { idToken } }),

  meta: () => request("/meta"),

  dashboard: () => request("/dashboard"),

  missions: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return request(`/missions${qs.toString() ? `?${qs}` : ""}`);
  },
  mission: (id) => request(`/missions/${id}`),
  createMission: (payload) => request("/missions", { method: "POST", body: payload }),
  updateMission: (id, payload) => request(`/missions/${id}`, { method: "PATCH", body: payload }),
  deleteMission: (id) => request(`/missions/${id}`, { method: "DELETE" }),
  inviteValidator: (missionId, validatorId) => request(`/missions/${missionId}/invite/${validatorId}`, { method: "POST" }),
  moveParticipant: (missionId, participantId, stage) =>
    request(`/missions/${missionId}/participants/${participantId}`, { method: "PATCH", body: { stage } }),
  missionShipments: (missionId) => request(`/missions/${missionId}/shipments`),
  markShipmentShipped: (missionId, validatorId, payload) => request(`/missions/${missionId}/shipments/${validatorId}/ship`, { method: "POST", body: payload }),
  missionSchedules: (missionId) => request(`/missions/${missionId}/schedules`),
  proposeInterviewTime: (missionId, validatorId, payload) => request(`/missions/${missionId}/schedules/${validatorId}/propose`, { method: "POST", body: payload }),
  markInterviewCompleted: (missionId, validatorId) => request(`/missions/${missionId}/schedules/${validatorId}/complete`, { method: "POST" }),
  missionPoll: (missionId) => request(`/missions/${missionId}/poll`),
  createMissionPoll: (missionId, payload) => request(`/missions/${missionId}/poll`, { method: "POST", body: payload }),
  lockPollSlot: (missionId, slotId) => request(`/missions/${missionId}/poll/lock`, { method: "POST", body: { slotId } }),
  completeMissionPoll: (missionId) => request(`/missions/${missionId}/poll/complete`, { method: "POST" }),
  flagResponse: (missionId, responseId, flagged) =>
    request(`/missions/${missionId}/responses/${responseId}`, { method: "PATCH", body: { flagged } }),
  missionInvitations: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return request(`/missions/invitations${qs.toString() ? `?${qs}` : ""}`);
  },
  cancelInvite: (missionId, validatorId) => request(`/missions/${missionId}/invite/${validatorId}`, { method: "DELETE" }),

  audience: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return request(`/audience${qs.toString() ? `?${qs}` : ""}`);
  },
  audienceMatchCount: (audience) => request("/audience/match-count", { method: "POST", body: audience }),

  analytics: () => request("/analytics"),

  wallet: () => request("/wallet"),
  topup: (amount, stepUpToken) => request("/wallet/topup", { method: "POST", body: { amount, stepUpToken } }),
  paymentsConfig: () => fetch("/api/payments/config").then(r => r.json()),
  createOrder: (amount) => request("/payments/order", { method: "POST", body: { amount } }),
  verifyPayment: (body) => request("/payments/verify", { method: "POST", body }),

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
    return fetch(`/api/messages/threads/${threadId}/attachment`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: form,
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Upload failed (${r.status})`);
      return data;
    });
  },
  findOrCreateThread: (validatorId, missionId) => request("/messages/threads", { method: "POST", body: { validatorId, missionId } }),

  uploadMissionFile: (missionId, file, section = "brief") => {
    const form = new FormData();
    form.append("file", file);
    const t = token;
    return fetch(`/api/missions/${missionId}/files?section=${section}`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: form,
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Upload failed (${r.status})`);
      return data;
    });
  },
  deleteMissionFile: (missionId, filename) => request(`/missions/${missionId}/files/${filename}`, { method: "DELETE" }),
};

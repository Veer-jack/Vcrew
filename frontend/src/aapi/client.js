const BASE = "/api/admin";

let token = localStorage.getItem("vc_admin_token") || null;

export function setAToken(t) {
  token = t;
  if (t) localStorage.setItem("vc_admin_token", t);
  else localStorage.removeItem("vc_admin_token");
}
export function getAToken() {
  return token;
}

async function request(path, { method = "GET", body, query } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let url = BASE + path;
  if (query) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== ""));
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
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

export const aapi = {
  login: (email, password) => request("/login", { method: "POST", body: { email, password } }),
  logout: () => request("/logout", { method: "POST" }),
  me: () => request("/me"),

  dashboard: () => request("/dashboard"),

  members: (params) => request("/members", { query: params }),
  setMemberStatus: (type, id, status) => request(`/members/${type}/${id}`, { method: "PATCH", body: { status } }),

  tickets: () => request("/tickets"),
  updateTicket: (type, id, body) => request(`/tickets/${type}/${id}`, { method: "PATCH", body }),

  withdrawals: () => request("/withdrawals"),
  updateWithdrawal: (id, body) => request(`/withdrawals/${id}`, { method: "PATCH", body }),
};

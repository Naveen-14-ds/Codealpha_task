/**
 * Base URL for API calls. Same host as the static site when served by Express.
 */
window.API_BASE = "";

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = "Bearer " + token;
  const url = (window.API_BASE || "") + "/api" + path;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || res.statusText || "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function saveSession(token, user) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
  if (user) localStorage.setItem("user", JSON.stringify(user));
  else localStorage.removeItem("user");
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function logout() {
  saveSession(null, null);
  window.location.href = "index.html";
}

// Shared login router: one login page, one forwarded port, Google-Sheets role authentication.
// Authentication is verified by the Google Apps Script endpoint; passwords are never read from the sheet by the browser.
const API_URL = String(import.meta.env.VITE_API_URL || "").trim();

const read = (key, fallback = null) => {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
};

const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const route = (path) => {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const setAdminSession = (user) => {
  save("ziyana-admin-session", {
    username: user.identifier,
    role: "admin",
    at: Date.now(),
  });
  save("ziyana-current-user", {
    name: user.name || "Administrator",
    email: user.identifier,
    username: user.identifier,
    role: "admin",
  });
  route("/admin");
};

const setUserSession = (user) => {
  const identifier = String(user.identifier || "").trim();
  const localUsers = read("ziyana-users", []);
  const existing = localUsers.find((item) => item.email === identifier.toLowerCase() || item.phone === identifier);
  const sessionUser = existing || {
    name: user.name || "Customer",
    email: identifier.includes("@") ? identifier.toLowerCase() : "",
    phone: identifier.includes("@") ? "" : identifier,
    role: "user",
    addresses: [],
  };
  save("ziyana-current-user", { ...sessionUser, role: "user" });
  route("/account");
};

const authenticateRemote = async (identity, password) => {
  if (!API_URL) return null;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "authenticate", identifier: identity, password }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const getLoginFields = (form) => {
  const inputs = [...form.querySelectorAll("input")];
  const passwordInput = inputs.find((input) => input.type === "password");
  const identityInput = inputs.find((input) => input !== passwordInput);
  return {
    identity: identityInput?.value || "",
    password: passwordInput?.value || "",
  };
};

const showError = (form, message) => {
  const existing = form.querySelector(".error");
  if (existing) {
    existing.textContent = message;
    return;
  }
  const p = document.createElement("p");
  p.className = "error";
  p.textContent = message;
  const button = form.querySelector("button[type=submit], button:not([type])");
  if (button) form.insertBefore(p, button);
};

const authenticateAndRoute = async (form, event) => {
  const { identity, password } = getLoginFields(form);
  if (!identity || !password) return false;
  if (form.dataset.authBusy === "1") return true;
  form.dataset.authBusy = "1";
  event?.preventDefault();
  event?.stopImmediatePropagation();

  const button = form.querySelector("button[type=submit], button:not([type])");
  const original = button?.textContent;
  if (button) { button.disabled = true; button.textContent = "Signing in…"; }

  const result = await authenticateRemote(identity, password);
  if (result?.ok && result.user?.role === "admin") {
    setAdminSession(result.user);
    return true;
  }
  if (result?.ok && result.user?.role === "user") {
    setUserSession(result.user);
    return true;
  }

  form.dataset.authBusy = "0";
  if (button) { button.disabled = false; button.textContent = original || "Sign in"; }
  showError(form, result?.error || "Unable to sign in. Check your account and try again.");
  return true;
};

const bindForm = (form) => {
  if (!(form instanceof HTMLFormElement) || form.dataset.adminRouterBound === "1") return;
  form.dataset.adminRouterBound = "1";
  form.addEventListener("submit", (event) => {
    if (location.pathname === "/login") authenticateAndRoute(form, event);
  }, true);
};

const scanLogin = () => {
  if (location.pathname !== "/login") return;
  document.querySelectorAll("form").forEach(bindForm);
};

scanLogin();
new MutationObserver(scanLogin).observe(document.documentElement, { childList: true, subtree: true });

if (location.pathname === "/admin" && read("ziyana-admin-session")?.role !== "admin") {
  window.history.replaceState({}, "", "/login");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

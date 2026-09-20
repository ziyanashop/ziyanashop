// Shared login router: one login page, one forwarded port, automatic user/admin routing.
// Admin credentials must be supplied through Vite environment variables.
const ADMIN_USERNAME = String(import.meta.env.VITE_ADMIN_USERNAME || "admin").trim().toLowerCase();
const ADMIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD || "");

const read = (key, fallback = null) => {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
};

const goAdmin = () => {
  localStorage.setItem("ziyana-admin-session", JSON.stringify({
    username: ADMIN_USERNAME,
    role: "admin",
    at: Date.now(),
  }));
  localStorage.setItem("ziyana-current-user", JSON.stringify({
    name: "Administrator",
    username: ADMIN_USERNAME,
    role: "admin",
  }));
  window.history.pushState({}, "", "/admin");
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const hasAdminSession = () => read("ziyana-admin-session")?.role === "admin";

const handleLoginForm = (form) => {
  if (!(form instanceof HTMLFormElement) || form.dataset.adminRouterBound === "1") return;
  form.dataset.adminRouterBound = "1";
  form.addEventListener("submit", (event) => {
    const inputs = [...form.querySelectorAll("input")];
    const passwordInput = inputs.find((input) => input.type === "password");
    const identityInput = inputs.find((input) => input !== passwordInput);
    const identity = identityInput?.value?.trim().toLowerCase() || "";
    const password = passwordInput?.value || "";
    if (!ADMIN_PASSWORD || identity !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    goAdmin();
  }, true);
};

const scanLogin = () => {
  if (location.pathname !== "/login") return;
  document.querySelectorAll("form").forEach(handleLoginForm);
};

scanLogin();
new MutationObserver(scanLogin).observe(document.documentElement, { childList: true, subtree: true });

if (location.pathname === "/admin" && !hasAdminSession()) {
  window.history.replaceState({}, "", "/login");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

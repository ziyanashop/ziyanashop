// Shared login router: one login page, one forwarded port, automatic user/admin routing.
// This is a client-side development convenience. Production authentication should be server-side.
const ADMIN_USERNAME = String(import.meta.env.VITE_ADMIN_USERNAME || "").trim().toLowerCase();
const ADMIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD || "").trim();

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
    email: ADMIN_USERNAME,
    username: ADMIN_USERNAME,
    role: "admin",
  }));
  window.history.pushState({}, "", "/admin");
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const isAdminCredentials = (identity, password) =>
  Boolean(ADMIN_USERNAME && ADMIN_PASSWORD) &&
  String(identity || "").trim().toLowerCase() === ADMIN_USERNAME &&
  String(password || "").trim() === ADMIN_PASSWORD;

const getLoginFields = (form) => {
  const inputs = [...form.querySelectorAll("input")];
  const passwordInput = inputs.find((input) => input.type === "password");
  const identityInput = inputs.find((input) => input !== passwordInput);
  return {
    identity: identityInput?.value || "",
    password: passwordInput?.value || "",
  };
};

const routeAdmin = (form) => {
  const { identity, password } = getLoginFields(form);
  if (!isAdminCredentials(identity, password)) return false;
  goAdmin();
  return true;
};

// React owns the form submit, so bind in capture phase and also guard the submit button click.
const bindForm = (form) => {
  if (!(form instanceof HTMLFormElement) || form.dataset.adminRouterBound === "1") return;
  form.dataset.adminRouterBound = "1";
  form.addEventListener("submit", (event) => {
    if (routeAdmin(form)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
};

const scanLogin = () => {
  if (location.pathname !== "/login") return;
  document.querySelectorAll("form").forEach(bindForm);
};

// Button-click fallback guarantees the admin route wins before React's onSubmit validation.
document.addEventListener("click", (event) => {
  if (location.pathname !== "/login") return;
  const button = event.target?.closest?.("form button[type=submit], form button:not([type])");
  if (!button) return;
  const form = button.closest("form");
  if (form && routeAdmin(form)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

scanLogin();
new MutationObserver(scanLogin).observe(document.documentElement, { childList: true, subtree: true });

if (location.pathname === "/admin" && read("ziyana-admin-session")?.role !== "admin") {
  window.history.replaceState({}, "", "/login");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

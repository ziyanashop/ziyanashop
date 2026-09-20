// Single-port admin routing.
// Development fallback credentials are provided so the shared login works without
// requiring a local .env file. For production, override both values with deployment secrets.
const ADMIN_USERNAME = String(import.meta.env.VITE_ADMIN_USERNAME || "admin").trim().toLowerCase();
const ADMIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD || "Admin@123456");

const hasAdminSession = () => {
  try {
    const session = JSON.parse(localStorage.getItem("ziyana-admin-session") || "null");
    return Boolean(session && session.role === "admin");
  } catch {
    return false;
  }
};

if (location.pathname === "/admin" && !hasAdminSession()) {
  history.replaceState({}, "", "/login");
  dispatchEvent(new PopStateEvent("popstate"));
}

document.addEventListener("submit", (event) => {
  if (location.pathname !== "/login") return;
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  const passwordInput = [...form.querySelectorAll("input")].find((input) => input.type === "password");
  const identityInput = [...form.querySelectorAll("input")].find((input) => input !== passwordInput);
  const identity = identityInput?.value?.trim().toLowerCase() || "";
  const password = passwordInput?.value || "";

  if (identity !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) return;

  event.preventDefault();
  event.stopImmediatePropagation();
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
  location.assign("/admin");
}, true);

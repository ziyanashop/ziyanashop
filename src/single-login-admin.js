// Single-port admin routing. Keep the admin password in local .env / deployment secrets,
// never in the public repository. Set VITE_ADMIN_USERNAME and VITE_ADMIN_PASSWORD.
const ADMIN_USERNAME = String(import.meta.env.VITE_ADMIN_USERNAME || "admin").trim().toLowerCase();
const ADMIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD || "");

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
  if (location.pathname !== "/login" || !ADMIN_PASSWORD) return;
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  const identity = [...form.querySelectorAll("input")]
    .find((input) => input.type !== "password")?.value?.trim().toLowerCase();
  const password = [...form.querySelectorAll("input")]
    .find((input) => input.type === "password")?.value || "";

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

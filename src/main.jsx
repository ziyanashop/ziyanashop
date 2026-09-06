function AppWithAccount() {
  const [path, setPath] = useState(location.pathname);
  const [user, setUser] = useState(load("ziyana-current-user", null));
  const [adminSession, setAdminSession] = useState(
    load("ziyana-admin-session", null),
  );
  const [adminSettings, setAdminSettings] = useState(
    mergeSettings(load("ziyana-settings", defaults)),
  );
  const [orders, setOrders] = useState(load("ziyana-orders", []));
  useEffect(() => save("ziyana-settings", adminSettings), [adminSettings]);
  useEffect(() => saveRemoteAware("ziyana-orders", orders), [orders]);
  useEffect(() => {
    const update = () => setPath(location.pathname);
    addEventListener("popstate", update);
    return () => removeEventListener("popstate", update);
  }, []);
  const login = (value) => {
    setUser(value);
    save("ziyana-current-user", value);
    go("/account");
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem("ziyana-current-user");
    go("/");
  };
  const adminLogin = () => {
    setAdminSession(load("ziyana-admin-session", null));
    go("/admin");
  };
  const adminLogout = () => {
    setAdminSession(null);
    localStorage.removeItem("ziyana-admin-session");
    go("/admin");
  };
  if (path === "/admin" || path === "/admin/settings")
    return adminSession ? (
      <AdminConsole
        settings={adminSettings}
        setSettings={setAdminSettings}
        orders={orders}
        setOrders={setOrders}
        onLogout={adminLogout}
      />
    ) : (
      <AdminLogin onLogin={adminLogin} />
    );
  if (path === "/login")
    return (
      <>
        <Header
          cart={load("ziyana-cart", [])}
          wishlist={load("ziyana-wishlist", [])}
        />
        <Login onLogin={login} />
        <Footer />
      </>
    );
  if (path === "/register")
    return (
      <>
        <Header
          cart={load("ziyana-cart", [])}
          wishlist={load("ziyana-wishlist", [])}
        />
        <Register onRegister={login} />
        <Footer />
      </>
    );
  if (path === "/account")
    return user ? (
      <>
        <Header
          cart={load("ziyana-cart", [])}
          wishlist={load("ziyana-wishlist", [])}
        />
        <Account user={user} orders={orders} onLogout={logout} />
        <Footer />
      </>
    ) : (
      <>
        <Header cart={load("ziyana-cart", [])} wishlist={[]} />
        <Login onLogin={login} />
        <Footer />
      </>
    );
  return (
    <>
      <App />
      <a className="account-shortcut" href={user ? "/account" : "/login"}>
        {user ? "My account" : "Sign in"}
      </a>
    </>
  );
}
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [error, setError] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const users = load("ziyana-users", []);
    if (resetMode) {
      if (!/^01[3-9]\d{8}$/.test(email.replace(/\s/g, "")))
        return setError("Enter the mobile number used for this account.");
      if (resetPassword.length < 6)
        return setError("New password must be at least 6 characters.");
      const index = users.findIndex((user) => user.phone === email.trim());
      if (index < 0) return setError("No account was found for this mobile number.");
      const nextUsers = users.map((user, userIndex) => userIndex === index ? { ...user, password: resetPassword } : user);
      save("ziyana-users", nextUsers);
      const customerList = load("ziyana-customers", []);
      saveRemoteAware("ziyana-customers", customerList.map((customer) => customer.phone === email.trim() ? { ...customer, password: resetPassword, updatedAt: new Date().toISOString() } : customer));
      setPassword("");
      setResetPassword("");
      setResetMode(false);
      return setError("Password updated. Sign in with your new password.");
    }
    const user = users.find(
      (x) => x.email === email.trim().toLowerCase() || x.phone === email.trim(),
    );
    if (!user || user.password !== password)
      return setError("Email/phone or password is incorrect.");
    onLogin(user);
  };
  return (
    <main className="page auth-page">
      <div className="page-head">
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Sign in</h1>
        <p>Manage orders, saved addresses and your wishlist in one place.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>
          Email or phone
          <input
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {!resetMode ? <label>
          Password
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label> : <label>
          New password
          <input required minLength="6" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
        </label>}
        {error && <p className="error">{error}</p>}
        <button className="btn dark full">
          {resetMode ? "Update password" : "Sign in"} <ArrowRight size={16} />
        </button>
        <button type="button" className="text-link" onClick={() => { setResetMode(!resetMode); setError(""); }}>
          {resetMode ? "Back to sign in" : "Forgot password? Reset with mobile"}
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => go("/register")}
        >
          Create an account <ArrowRight size={16} />
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => go("/checkout")}
        >
          Continue as guest <ArrowRight size={16} />
        </button>
      </form>
    </main>
  );
}
function Register({ onRegister }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!/^01[3-9]\d{8}$/.test(form.phone.replace(/\s/g, "")))
      return setError("Enter a valid Bangladeshi phone number.");
    const users = load("ziyana-users", []);
    if (users.some((x) => x.email === form.email.trim().toLowerCase()))
      return setError("An account already exists with this email.");
    const user = {
      ...form,
      email: form.email.trim().toLowerCase(),
      addresses: [],
    };
    save("ziyana-users", [...users, user]);
    saveRemoteAware("ziyana-customers", [...load("ziyana-customers", []).filter((item) => item.email !== user.email), { ...user, createdAt: new Date().toISOString() }]);
    onRegister(user);
  };
  return (
    <main className="page auth-page">
      <div className="page-head">
        <p className="eyebrow">JOIN ZIYANASHOP</p>
        <h1>Create account</h1>
        <p>Save addresses and see every order in one place.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
          {[
            ["name", "Full name"],
            ["email", "Email address"],
            ["phone", "Phone number"],
            ["password", "Password"],
          ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              required
              type={
                key === "password"
                  ? "password"
                  : key === "email"
                    ? "email"
                    : "text"
              }
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        {error && <p className="error">{error}</p>}
        <button className="btn dark full">
          Create account <ArrowRight size={16} />
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => go("/login")}
        >
          Already have an account? Sign in
        </button>
      </form>
    </main>
  );
}
function Account({ user, orders, onLogout }) {
  const mine = orders.filter(
    (x) => x.phone === user.phone || x.email === user.email,
  );
  return (
    <main className="page account-page">
      <div className="page-head">
        <p className="eyebrow">YOUR ZIYANASHOP</p>
        <h1>Hello, {user.name.split(" ")[0]}.</h1>
        <p>Everything you need after placing an order.</p>
      </div>
      <div className="account-grid">
        <section className="summary">
          <h2>Account</h2>
          <button className="account-link" onClick={() => go("/account")}>
            Dashboard
          </button>
          <button
            className="account-link"
            onClick={() => document.getElementById("orders").scrollIntoView()}
          >
            My orders ({mine.length})
          </button>
          <button className="account-link" onClick={() => go("/track-order")}>
            Track an order
          </button>
          <button className="account-link" onClick={() => go("/wishlist")}>
            Wishlist
          </button>
          <button className="account-link" onClick={onLogout}>
            Log out
          </button>
        </section>
        <section id="orders" className="account-content">
          <h2>My orders</h2>
          {mine.length ? (
            mine
              .slice()
              .reverse()
              .map((order) => (
                <article className="order-row" key={order.number}>
                  <div>
                    <b>{order.number}</b>
                    <p>
                      {new Date(order.date).toLocaleDateString("en-BD")} ·{" "}
                      {order.items.length} item(s)
                    </p>
                  </div>
                  <div>
                    <strong>{money(order.total)}</strong>
                    <p>
                      {order.status} · {order.paymentStatus}
                    </p>
                  </div>
                  <button
                    className="btn outline"
                    onClick={() => go(`/track-order?id=${order.number}`)}
                  >
                    Track
                  </button>
                </article>
              ))
          ) : (
            <Empty
              title="No orders yet"
              text="Your placed orders will appear here."
            />
          )}
          <div className="saved-address">
            <h2>Saved addresses</h2>
            <p>
              {user.addresses?.length
                ? "Your saved delivery addresses are ready for checkout."
                : "You can save an address after your next checkout."}
            </p>
            <button className="btn outline" onClick={() => go("/checkout")}>
              Shop and checkout <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Heart,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { createRoot } from "react-dom/client";
import { categories, formatPrice, products as seedProducts } from "./data";
import "./styles.css";

const defaults = {
  inside: 60,
  outside: 120,
  threshold: 3000,
  freeShippingEnabled: false,
  freeShippingItems: 3,
  freeShippingCampaignOnly: false,
  insideEta: "1-3 working days",
  outsideEta: "2-5 working days",
  payments: { cod: true, bkash: true, nagad: true, card: true },
  coupons: [
    { code: "WELCOME10", type: "percent", value: 10, min: 0 },
    { code: "ZIYANA15", type: "percent", value: 15, min: 2500 },
    { code: "FREESHIP", type: "shipping", value: 0, min: 0 },
  ],
  campaigns: [
    {
      id: "ramadan-edit",
      title: "Ramadan Edit",
      description: "Soft layers and thoughtful gifts for the season.",
      image:
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85",
      token: "RAMADAN10",
      categories: ["Women's Edit"],
      products: [],
      discountType: "percent",
      discountValue: 10,
      freeShipping: true,
      freeProductId: null,
      active: true,
    },
    {
      id: "weekend-special",
      title: "Weekend Special",
      description: "A little extra off your next favourite.",
      image:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85",
      token: "WEEKEND",
      categories: [],
      products: [1, 2, 3, 4],
      discountType: "percent",
      discountValue: 15,
      freeShipping: false,
      freeProductId: null,
      active: true,
    },
  ],
};
const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const normalizeProducts = (items) => (Array.isArray(items) ? items : seedProducts).map((product) => {
  if (typeof product.id !== "string" || product.discountPercent !== undefined) return product;
  const legacyDiscount = Number(product.discount || 0);
  if (!legacyDiscount || Number(product.originalPrice || 0) - Number(product.price || 0) !== legacyDiscount) return product;
  const basePrice = Number(product.price || 0);
  return {
    ...product,
    originalPrice: basePrice,
    price: Math.round(basePrice * (1 - Math.min(100, legacyDiscount) / 100)),
    discount: legacyDiscount,
    discountPercent: legacyDiscount,
  };
});
let products = normalizeProducts(load("ziyana-admin-products", seedProducts));
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const asList = (value) => (Array.isArray(value) ? value : value && typeof value === "object" ? [value] : []);
const mergeSettings = (value) => ({
  ...defaults,
  ...(value || {}),
  payments: { ...defaults.payments, ...((value || {}).payments || {}) },
  coupons: Array.isArray(value?.coupons) ? value.coupons : defaults.coupons,
  campaigns: Array.isArray(value?.campaigns) ? value.campaigns : defaults.campaigns,
});
const remoteApiUrl = import.meta.env.VITE_API_URL;
const remoteApiToken = import.meta.env.VITE_API_TOKEN;
const remoteKeys = {
  settings: "ziyana-settings",
  products: "ziyana-admin-products",
  orders: "ziyana-orders",
  customers: "ziyana-customers",
  coupons: "ziyana-coupons",
  payments: "ziyana-payments",
  tracking: "ziyana-tracking",
  expenses: "ziyana-expenses",
  campaigns: "ziyana-sales-report",
};
const remoteSync = (storageKey, value) => {
  if (!remoteApiUrl) return Promise.resolve();
  const keys = Object.keys(remoteKeys).filter((key) => remoteKeys[key] === storageKey);
  if (storageKey === "ziyana-settings") keys.push("coupons");
  return Promise.all(keys.map((key) => fetch(remoteApiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ key, value: key === "coupons" ? value.coupons : value, token: remoteApiToken }),
  }).catch(() => null)));
};
const saveRemoteAware = (key, value) => {
  save(key, value);
  return remoteSync(key, value);
};
const hydrateFromRemote = async () => {
  if (!remoteApiUrl) return;
  try {
    const response = await Promise.race([
      fetch(remoteApiUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Remote API timeout")), 6000)),
    ]);
    if (!response.ok) return;
    const database = await response.json();
    Object.entries(remoteKeys).forEach(([remoteKey, storageKey]) => {
      if (database[remoteKey] !== null && database[remoteKey] !== undefined) {
        const value = remoteKey === "settings" ? mergeSettings(database[remoteKey]) : asList(database[remoteKey]);
        save(storageKey, value);
      }
      if (remoteKey === "products" && Array.isArray(database[remoteKey])) {
        products = normalizeProducts(database[remoteKey]);
        save(storageKey, products);
      }
    });
    if (Array.isArray(database.coupons)) {
      save("ziyana-settings", mergeSettings({ ...load("ziyana-settings", defaults), coupons: database.coupons }));
    }
    if (Array.isArray(database.customers)) {
      const remoteUsers = database.customers.filter((customer) => customer.password && customer.phone);
      const localUsers = load("ziyana-users", []);
      const mergedUsers = [...localUsers];
      remoteUsers.forEach((remoteUser) => {
        const index = mergedUsers.findIndex((user) => user.phone === remoteUser.phone || (remoteUser.email && user.email === remoteUser.email));
        if (index < 0) mergedUsers.push(remoteUser);
        else mergedUsers[index] = { ...mergedUsers[index], ...remoteUser };
      });
      save("ziyana-users", mergedUsers);
    }
    if (Array.isArray(database.orders)) {
      const trackingRows = asList(database.tracking);
      const paymentRows = asList(database.payments);
      const mergedOrders = database.orders.map((order) => {
        const tracking = trackingRows.find((row) => row.orderNumber === order.number || row.number === order.number);
        const payment = paymentRows.find((row) => row.orderNumber === order.number);
        return {
          ...order,
          ...(tracking ? { status: tracking.status || order.status, step: tracking.step ?? order.step, courier: tracking.courier || order.courier, trackingNumber: tracking.trackingNumber || order.trackingNumber, trackingUrl: tracking.trackingUrl || order.trackingUrl } : {}),
          ...(payment ? { payment: payment.method || order.payment, paymentStatus: payment.status || order.paymentStatus } : {}),
        };
      });
      save("ziyana-orders", mergedOrders);
    }
  } catch {
    // Local data remains available when the remote sheet is unreachable.
  }
};
const money = (value) => formatPrice(Math.max(0, Math.round(value)));
const go = (path) =>
  setTimeout(() => {
    if (path === "/checkout") return location.assign(path);
    history.pushState({}, "", path);
    dispatchEvent(new Event("popstate"));
  }, 0);

function Header({ cart, wishlist }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = (e) => {
    e.preventDefault();
    if (query.trim()) go(`/shop?q=${encodeURIComponent(query)}`);
  };
  return (
    <>
      <div className="topline">
        Complimentary delivery on orders over ৳3,000 <span>•</span> Easy returns
        within 7 days
      </div>
      <header>
        <button
          className="icon mobile-only"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </button>
        <a
          className="logo"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            go("/");
          }}
        >
          Ziyana<span>Shop</span>
        </a>
        <nav>
          <a href="/shop">Shop</a>
          <a href="/categories">Categories</a>
          <a href="/track-order">Track order</a>
          <a href="/about">About</a>
        </nav>
        <div className="header-actions">
          <form className="search" onSubmit={search}>
            <Search size={18} />
            <input
              aria-label="Search products"
              placeholder="Search ZiyanaShop"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          <button
            className="icon"
            aria-label="Wishlist"
            onClick={() => go("/wishlist")}
          >
            <Heart size={20} />
            {wishlist.length > 0 && <b>{wishlist.length}</b>}
          </button>
          <button
            className="icon"
            aria-label="Cart"
            onClick={() => go("/cart")}
          >
            <ShoppingBag size={20} />
            {cart.length > 0 && (
              <b>{cart.reduce((n, x) => n + x.quantity, 0)}</b>
            )}
          </button>
        </div>
      </header>
      {open && (
        <div className="drawer-backdrop" onClick={() => setOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="icon close" onClick={() => setOpen(false)}>
              <X />
            </button>
            <div className="drawer-logo">
              Ziyana<span>Shop</span>
            </div>
            {[
              "Shop",
              "Categories",
              "Track order",
              "Wishlist",
              "Cart",
              "Account",
            ].map((item) => (
              <a
                key={item}
                href={"/" + item.toLowerCase().replace(" ", "-")}
                onClick={() => setOpen(false)}
              >
                {item}
                <ArrowRight size={16} />
              </a>
            ))}
          </aside>
        </div>
      )}
    </>
  );
}
function Footer() {
  return (
    <footer>
      <div className="footer-grid">
        <div>
          <div className="logo">
            Ziyana<span>Shop</span>
          </div>
          <p>
            Thoughtfully chosen pieces for your everyday, delivered across
            Bangladesh.
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <a href="/shop">Shop all</a>
          <a href="/categories">Categories</a>
          <a href="/about">Our story</a>
        </div>
        <div>
          <h4>Help & support</h4>
          <a href="/faq">FAQ</a>
          <a href="/track-order">Track order</a>
          <a href="/delivery-returns">Delivery & returns</a>
        </div>
        <div>
          <h4>Come say hello</h4>
          <p>
            Dhaka, Bangladesh
            <br />
            Sat-Thu, 10am-7pm
          </p>
          <p>
            hello@ziyanashop.demo
            <br />
            +880 1700 000 000
          </p>
        </div>
      </div>
      <div className="copyright">
        © 2026 ZiyanaShop <span>Cash on delivery available nationwide</span>
      </div>
    </footer>
  );
}
function Rating({ value, reviews }) {
  return (
    <span className="rating">
      <span>{"★".repeat(Math.round(value))}</span> {value}{" "}
      {reviews && <small>({reviews})</small>}
    </span>
  );
}
function Empty({
  title,
  text,
  action = "Shop now",
  onClick = () => go("/shop"),
}) {
  return (
    <div className="empty">
      <span>○</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="btn dark" onClick={onClick}>
        {action} <ArrowRight size={16} />
      </button>
    </div>
  );
}
function ProductCard({ product, wishlist, toggleWishlist, addCart }) {
  const saved = wishlist.includes(product.id);
  return (
    <article className="product-card">
      <div className="product-image">
        <img src={product.image} alt={product.name} loading="lazy" />
        <span className="badge">
          {product.newArrival ? "New in" : `${product.discount}% off`}
        </span>
        <button
          className={`heart ${saved ? "saved" : ""}`}
          aria-label="Add to wishlist"
          onClick={() => toggleWishlist(product.id)}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <button className="quick" onClick={() => go(`/product/${product.id}`)}>
          View details <ArrowRight size={14} />
        </button>
      </div>
      <div className="product-info">
        <p className="eyebrow">{product.category}</p>
        <a
          className="product-name"
          href={`/product/${product.id}`}
          onClick={(e) => {
            e.preventDefault();
            go(`/product/${product.id}`);
          }}
        >
          {product.name}
        </a>
        <Rating value={product.rating} reviews={product.reviews} />
        <div className="price">
          <strong>{money(product.price)}</strong>{" "}
          <del>{money(product.originalPrice)}</del>
        </div>
        <button
          className="add-button"
          disabled={!product.stock}
          onClick={() => addCart(product)}
        >
          Add to bag <Plus size={16} />
        </button>
      </div>
    </article>
  );
}
function Grid({ list, ...props }) {
  return (
    <div className="product-grid">
      {list.map((product) => (
        <ProductCard key={product.id} product={product} {...props} />
      ))}
    </div>
  );
}
function Home(props) {
  const campaigns = props.campaigns || [];
  const flashSaleIds = campaigns.flatMap((campaign) => [
    ...(campaign.products || []),
    ...products.filter((product) => (campaign.categories || []).includes(product.category)).map((product) => product.id),
  ]);
  const flashSaleProducts = products.filter((product) => flashSaleIds.includes(product.id));
  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">THE NEW SEASON / 2026</p>
            <h1>
              Dress for the
              <br />
              <i>life you love.</i>
            </h1>
            <p>
              Thoughtfully chosen fashion, beauty and little luxuries for all
              the days that make up your story.
            </p>
            <div className="hero-actions">
              <button className="btn dark" onClick={() => go("/shop")}>
                Shop the collection <ArrowRight size={17} />
              </button>
              <button className="text-link" onClick={() => go("/categories")}>
                Explore categories <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=90"
              alt="Woman browsing a curated fashion collection"
            />
          </div>
        </section>
        <section className="section">
          <div className="section-title">
            <div>
              <p className="eyebrow">Browse by mood</p>
              <h2>Find your next favourite</h2>
            </div>
          </div>
          <div className="category-grid">
            {categories.slice(0, 4).map((c) => (
              <button
                className="category-card"
                key={c.name}
                onClick={() =>
                  go(`/shop?category=${encodeURIComponent(c.name)}`)
                }
              >
                <img src={c.image} alt={c.label} />
                <span>
                  <b>{c.name}</b>
                  <small>
                    {c.count} pieces <ArrowRight size={14} />
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>
        <CampaignSlider campaigns={campaigns} />
        {flashSaleProducts.length > 0 && (
          <section className="section flash-sale-section">
            <div className="section-title">
              <div>
                <p className="eyebrow">LIMITED TIME</p>
                <h2>Flash Sale</h2>
              </div>
              <button className="text-link" onClick={() => go("/shop")}>
                Shop all <ArrowRight size={16} />
              </button>
            </div>
            <Grid list={flashSaleProducts} {...props} />
          </section>
        )}
        <section className="section tinted">
          <div className="section-title">
            <div>
              <p className="eyebrow">The edit</p>
              <h2>Pieces worth making room for</h2>
            </div>
          </div>
          <Grid list={products.filter((p) => p.featured)} {...props} />
        </section>
        <section className="section">
          <div className="section-title">
            <div>
              <p className="eyebrow">JUST IN</p>
              <h2>New arrivals</h2>
            </div>
            <button className="text-link" onClick={() => go("/shop")}>View all <ArrowRight size={16} /></button>
          </div>
          <Grid list={products.filter((p) => p.newArrival).slice(0, 4)} {...props} />
        </section>
      </main>
      <Footer />
    </>
  );
}
function Shop(props) {
  const params = new URLSearchParams(location.search);
  const [query, setQuery] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || "All");
  const [sort, setSort] = useState("Featured");
  let list = products.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );
  list = [...list].sort((a, b) =>
    sort === "Price low to high"
      ? a.price - b.price
      : sort === "Price high to low"
        ? b.price - a.price
        : sort === "Best rated"
          ? b.rating - a.rating
          : Number(b.featured) - Number(a.featured),
  );
  return (
    <main className="page">
      <div className="page-head">
        <p className="eyebrow">THE ZIYANASHOP EDIT</p>
        <h1>{query ? `Results for “${query}”` : "All pieces"}</h1>
        <p>Clothes, objects and small joys selected for the way you live.</p>
      </div>
      <div className="filters">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All</option>
          {categories.slice(0, 5).map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
        <span>{list.length} pieces</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option>Featured</option>
          <option>Price low to high</option>
          <option>Price high to low</option>
          <option>Best rated</option>
        </select>
      </div>
      {list.length ? (
        <Grid list={list} {...props} />
      ) : (
        <Empty
          title="Nothing matched that search"
          text="Try a different word or explore everything we have."
        />
      )}
    </main>
  );
}
function Product({ product, addCart, wishlist, toggleWishlist }) {
  const [size, setSize] = useState(product.sizes[0] || "");
  const [color, setColor] = useState(product.colors[0] || "");
  const [qty, setQty] = useState(1);
  const [notice, setNotice] = useState("");
  const [rating, setRating] = useState(0);
  const submitRating = () => {
    if (!rating) return setNotice("Choose a rating first.");
    const catalogue = load("ziyana-admin-products", seedProducts);
    const next = catalogue.map((item) => item.id === product.id ? { ...item, rating: Number((((item.rating || 0) * (item.reviews || 0) + rating) / ((item.reviews || 0) + 1)).toFixed(1)), reviews: Number(item.reviews || 0) + 1 } : item);
    saveRemoteAware("ziyana-admin-products", next);
    setNotice("Thank you. Your rating has been saved.");
  };
  const buy = (direct) => {
    if (product.sizes.length && !size)
      return setNotice("Please choose a size.");
    if (product.colors.length && !color)
      return setNotice("Please choose a colour.");
    if (!product.stock || qty > product.stock)
      return setNotice("This item is out of stock.");
    const item = {
      ...product,
      productId: product.id,
      key: `${product.id}-${size}-${color}`,
      size,
      color,
      quantity: qty,
    };
    if (direct) {
      save("ziyana-cart", [item]);
      setTimeout(() => go("/checkout"), 0);
    } else {
      addCart(product, qty, size, color);
      setNotice("Added to your bag.");
    }
  };
  return (
    <main className="page detail">
      <div className="detail-grid">
        <div className="gallery">
          <img className="main-photo" src={product.image} alt={product.name} />
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <Rating
            value={product.rating}
            reviews={`${product.reviews} reviews`}
          />
          <div className="detail-price">
            <strong>{money(product.price)}</strong>{" "}
            <del>{money(product.originalPrice)}</del>
            <em>{product.discount}% off</em>
          </div>
          <p className="description">{product.description}</p>
          {product.colors.length > 0 && (
            <div className="option">
              <b>Colour</b>
              <div className="swatches">
                {product.colors.map((item) => (
                  <button
                    className={color === item ? "selected" : ""}
                    key={item}
                    onClick={() => setColor(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          {product.sizes.length > 0 && (
            <div className="option">
              <b>Size</b>
              <div className="sizes">
                {product.sizes.map((item) => (
                  <button
                    className={size === item ? "selected" : ""}
                    key={item}
                    onClick={() => setSize(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="stock">
            {product.stock ? `${product.stock} in stock` : "Out of stock"}
          </p>
          <div className="buy-row">
            <div className="quantity">
              <button onClick={() => setQty(Math.max(1, qty - 1))}>
                <Minus size={15} />
              </button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(product.stock, qty + 1))}>
                <Plus size={15} />
              </button>
            </div>
            <button
              className="btn outline grow"
              disabled={!product.stock}
              onClick={() => buy(false)}
            >
              Add to bag
            </button>
            <button
              className="btn dark grow"
              disabled={!product.stock}
              onClick={() => buy(true)}
            >
              Buy now
            </button>
            <button
              className={`icon wish-detail ${wishlist.includes(product.id) ? "saved" : ""}`}
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart
                fill={wishlist.includes(product.id) ? "currentColor" : "none"}
              />
            </button>
          </div>
          {notice && <p className="success">{notice}</p>}
          <p className="delivery-note">
            Delivery: Inside Dhaka 1-3 working days, outside Dhaka 2-5 working
            days.
          </p>
          <div className="rating-box">
            <p className="eyebrow">RATE THIS PRODUCT</p>
            <div className="rating-picker">{[1, 2, 3, 4, 5].map((value) => <button type="button" className={value <= rating ? "selected" : ""} key={value} onClick={() => setRating(value)} aria-label={`${value} stars`}>★</button>)}</div>
            <button type="button" className="btn outline" onClick={submitRating}>Submit rating</button>
          </div>
        </div>
      </div>
    </main>
  );
}
function calc(cart, settings, coupon, area) {
  const subtotal = cart.reduce((n, x) => n + x.price * x.quantity, 0);
  const productDiscount = cart.reduce((n, x) => {
    const percent = Number(x.discountPercent ?? x.discount ?? 0);
    const originalPrice = Number(x.originalPrice || x.price);
    return n + Math.max(0, originalPrice - x.price) * x.quantity;
  }, 0);
  const itemCount = cart.reduce((n, x) => n + x.quantity, 0);
  const couponType = String(coupon?.type || "").toLowerCase();
  const couponValue = Number(coupon?.value || 0);
  const campaignFree = couponType === "shipping" || couponType === "free shipping";
  const quantityFree =
    settings.freeShippingEnabled &&
    itemCount >= Number(settings.freeShippingItems || 3) &&
    (!settings.freeShippingCampaignOnly || campaignFree);
  const thresholdFree =
    settings.freeShippingEnabled &&
    !settings.freeShippingCampaignOnly &&
    subtotal >= Number(settings.threshold || 0);
  const free = campaignFree || quantityFree || thresholdFree;
  const shipping = free
    ? 0
    : settings[area === "Outside Dhaka" ? "outside" : "inside"];
  const couponDiscount =
    couponType === "percent" || couponType === "percentage"
      ? (subtotal * couponValue) / 100
      : couponType === "fixed" || couponType === "amount"
        ? Math.min(subtotal, couponValue)
        : 0;
  return {
    subtotal,
    productDiscount,
    shipping,
    couponDiscount,
    total: subtotal + shipping - couponDiscount,
    free,
  };
}

function getFreeItems(cart, campaigns) {
  const freeItems = [];
  (campaigns || []).filter((campaign) => campaign.active !== false && (campaign.freeProduct || campaign.freeProductId)).forEach((campaign) => {
    const config = campaign.freeProduct || {};
    const triggerMode = config.triggerMode || (config.triggerProducts?.length ? "product" : config.triggerCategories?.length ? "category" : "campaign");
    const triggerProducts = config.triggerProducts || campaign.products || [];
    const triggerCategories = config.triggerCategories || campaign.categories || [];
    const qualifies = triggerMode === "campaign"
      ? cart.some((item) => triggerProducts.map(String).includes(String(item.productId ?? item.id)) || triggerCategories.includes(item.category))
      : triggerMode === "category"
        ? cart.some((item) => item.category === config.triggerCategory)
        : cart.some((item) => triggerProducts.map(String).includes(String(item.productId ?? item.id)));
    if (!qualifies) return;
    const product = products.find((item) => String(item.id) === String(config.productId || campaign.freeProductId));
    const quantity = Math.max(1, Number(config.quantity || 1));
    const stock = Number(config.stock ?? product?.stock ?? 0);
    if (stock <= 0) return;
    const fallbackImage = product?.image || "";
    const freeId = config.productId || campaign.freeProductId || `${campaign.id}-free`;
    if (!freeItems.some((item) => String(item.id) === String(freeId))) freeItems.push({ ...product, id: freeId, name: config.title || product?.name || "Free product", image: config.image || fallbackImage, quantity: Math.min(quantity, stock), free: true, price: 0, originalPrice: product?.price || 0, nonEditable: true });
  });
  return freeItems;
}
function getFreeProductNotices(cart, campaigns) {
  return (campaigns || []).filter((campaign) => campaign.active !== false && (campaign.freeProduct || campaign.freeProductId)).flatMap((campaign) => {
    const config = campaign.freeProduct || {};
    const triggerMode = config.triggerMode || (config.triggerProducts?.length ? "product" : config.triggerCategories?.length ? "category" : "campaign");
    const triggerProducts = config.triggerProducts || campaign.products || [];
    const triggerCategories = config.triggerCategories || campaign.categories || [];
    const qualifies = triggerMode === "campaign"
      ? cart.some((item) => triggerProducts.map(String).includes(String(item.productId ?? item.id)) || triggerCategories.includes(item.category))
      : triggerMode === "category"
        ? cart.some((item) => item.category === config.triggerCategory)
        : cart.some((item) => triggerProducts.map(String).includes(String(item.productId ?? item.id)));
    const product = products.find((item) => String(item.id) === String(config.productId || campaign.freeProductId));
    return qualifies && Number(config.stock ?? product?.stock ?? 0) <= 0 ? [`${config.title || product?.name || "Free product"} is out of stock.`] : [];
  });
}
function Coupon({ settings, subtotal, coupon, setCoupon }) {
  const [code, setCode] = useState(coupon?.code || "");
  const [error, setError] = useState("");
  const apply = () => {
    const normalizedCode = code.trim().replace(/\s+/g, " ").toUpperCase();
    const found = (settings.coupons || []).find((x) => String(x.code || "").trim().replace(/\s+/g, " ").toUpperCase() === normalizedCode && x.active !== false);
    if (!found) return setError("Coupon is invalid or expired.");
    const minimum = Number(found.min || found.minimumOrder || 0);
    if (subtotal < minimum)
      return setError(`Minimum order value is ${money(minimum)}.`);
    setCoupon({ ...found, type: String(found.type || "").toLowerCase(), value: Number(found.value || 0), min: minimum });
    setError("");
  };
  return (
    <div className="coupon-box">
      <label>
        Coupon code
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
      </label>
      <button type="button" className="btn outline" onClick={apply}>
        Apply
      </button>
      {coupon && (
        <p className="success">
          Coupon applied successfully{" "}
          <button type="button" onClick={() => setCoupon(null)}>Remove</button>
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
function Summary({ totals, area }) {
  return (
    <>
      {[
        ["Subtotal", totals.subtotal, false],
        ["Product discount", totals.productDiscount, true],
        ["Coupon discount", totals.couponDiscount, true],
        [`Shipping charge (${area})`, totals.free ? "FREE" : totals.shipping, false],
      ].map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <b>{typeof value === "string" ? value : label.includes("discount") && value ? `-${money(value)}` : money(value)}</b>
        </div>
      ))}
      <div className="total">
        <span>Grand total</span>
        <b>{money(totals.total)}</b>
      </div>
    </>
  );
}
function Cart({
  cart,
  settings,
  updateQuantity,
  removeItem,
  wishlist,
  toggleWishlist,
}) {
  const [area, setArea] = useState("Inside Dhaka");
  const [coupon, setCoupon] = useState(null);
  const totals = calc(cart, settings, coupon, area);
  return (
    <main className="page cart-page">
      <div className="page-head">
        <p className="eyebrow">YOUR SELECTION</p>
        <h1>Your bag</h1>
      </div>
      {cart.length ? (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.map((item) => (
              <div className="cart-item" key={item.key}>
                <img src={item.image} alt={item.name} />
                <div className="cart-item-info">
                  <p className="eyebrow">{item.category}</p>
                  <h3>{item.name}</h3>
                  <span>
                    {item.color && `${item.color} / `}
                    {item.size && `${item.size} / `}
                    {money(item.price)} <del>{money(item.originalPrice)}</del>
                  </span>
                  <div className="cart-controls">
                    <div className="quantity">
                      <button
                        onClick={() =>
                          updateQuantity(item.key, item.quantity - 1)
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.key, item.quantity + 1)
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      className="remove"
                      onClick={() => toggleWishlist(item.productId)}
                    >
                      <Heart size={15} /> Wishlist
                    </button>
                    <button
                      className="remove"
                      onClick={() => removeItem(item.key)}
                    >
                      <Trash2 size={15} /> Remove
                    </button>
                  </div>
                </div>
                <strong>{money(item.price * item.quantity)}</strong>
              </div>
            ))}
            <Coupon
              settings={settings}
              subtotal={totals.subtotal}
              coupon={coupon}
              setCoupon={setCoupon}
            />
          </div>
          <aside className="summary">
            <h2>Order summary</h2>
            <label>
              Delivery area
              <select value={area} onChange={(e) => setArea(e.target.value)}>
                <option>Inside Dhaka</option>
                <option>Outside Dhaka</option>
              </select>
            </label>
            <Summary totals={totals} area={area} />
            {!totals.free && (
              <p className="muted">
                Add {money(settings.threshold - totals.subtotal)} more to unlock
                free delivery.
              </p>
            )}
            <button
              className="btn dark full"
              onClick={() => {
                save("ziyana-checkout", { area, coupon });
                go("/checkout");
              }}
            >
              Proceed to checkout <ArrowRight size={16} />
            </button>
          </aside>
        </div>
      ) : (
        <Empty
          title="Your bag is waiting"
          text="Add something lovely and it will appear here."
        />
      )}
    </main>
  );
}
function Checkout({ cart, settings, onOrder }) {
  const saved = load("ziyana-checkout", {});
  const [area, setArea] = useState(saved.area || "Inside Dhaka");
  const [coupon, setCoupon] = useState(saved.coupon || null);
  const [payment, setPayment] = useState("cod");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    district: "Dhaka",
    area: "",
    address: "",
    postal: "",
  });
  const [error, setError] = useState("");
  const totals = calc(cart, settings, coupon, area);
  const freeItems = getFreeItems(cart, settings.campaigns);
  const freeProductNotices = getFreeProductNotices(cart, settings.campaigns);
  const methods = [
    ["cod", "Cash on Delivery", "Pay when your order is delivered."],
    ["bkash", "bKash", "Demo payment: mobile number and transaction ID."],
    ["nagad", "Nagad", "Demo payment: mobile number and transaction ID."],
    ["card", "Card payment", "Demo gateway placeholder. No card data stored."],
  ].filter((x) => settings.payments[x[0]]);
  const submit = (e) => {
    e.preventDefault();
    if (!cart.length) return setError("Your cart is empty.");
    if (!/^01[3-9]\d{8}$/.test(form.phone.replace(/\s/g, "")))
      return setError("Enter a valid 11-digit Bangladeshi phone number.");
    if (!form.name || !form.address || !form.area)
      return setError("Please complete your customer and delivery details.");
    onOrder({
      ...form,
      items: cart,
      freeItems,
      area,
      payment,
      ...totals,
      estimated:
        area === "Inside Dhaka" ? settings.insideEta : settings.outsideEta,
    });
  };
  return (
    <main className="page checkout">
      <div className="page-head">
        <p className="eyebrow">ALMOST YOURS</p>
        <h1>Checkout</h1>
        <p>
          Guest checkout is welcome. Track your order with its ID and phone
          number.
        </p>
      </div>
      {cart.length ? (
        <form className="checkout-grid" onSubmit={submit}>
          <div className="form-area">
            <h2>1. Customer information</h2>
            <div className="form-grid">
              {[
                ["name", "Full name"],
                ["phone", "Phone number"],
                ["email", "Email address"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required={key !== "email"}
                    type={key === "email" ? "email" : "text"}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <h2>2. Delivery address</h2>
            <div className="form-grid">
              {[
                ["district", "District"],
                ["area", "Area / Thana"],
                ["postal", "Postal code"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required={key === "area"}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <label>
              Full address
              <textarea
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
            <h2>3. Delivery method</h2>
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              <option>Inside Dhaka</option>
              <option>Outside Dhaka</option>
            </select>
            <p className="muted">
              {money(totals.shipping)} ·{" "}
              {area === "Inside Dhaka"
                ? settings.insideEta
                : settings.outsideEta}
            </p>
            <h2>4. Payment method</h2>
            <div className="payment-options">
              {methods.map(([key, title, description]) => (
                <label className={payment === key ? "chosen" : ""} key={key}>
                  <input
                    type="radio"
                    checked={payment === key}
                    onChange={() => setPayment(key)}
                  />
                  <span>{title}</span>
                  <small>{description}</small>
                </label>
              ))}
            </div>
            <Coupon
              settings={settings}
              subtotal={totals.subtotal}
              coupon={coupon}
              setCoupon={setCoupon}
            />
            {error && <p className="error">{error}</p>}
          </div>
          <aside className="summary">
            <h2>5. Order review</h2>
            {cart.map((item) => (
              <div className="mini-item" key={item.key}>
                <img src={item.image} alt="" />
                <span>
                  {item.name}
                  <small>
                    {item.quantity} x {money(item.price)}
                    {item.originalPrice > item.price && ` · ${money(item.discount || item.originalPrice - item.price)} off`}
                  </small>
                </span>
                <b><del>{item.originalPrice > item.price && money(item.originalPrice * item.quantity)}</del> {money(item.quantity * item.price)}</b>
              </div>
            ))}
            {freeItems.map((item) => (
              <div className="mini-item free-item" key={`free-${item.id}`}>
                <img src={item.image} alt="" />
                <span>{item.name}<small>Free product · {item.quantity} pc</small></span>
                <b>FREE</b>
              </div>
            ))}
            {freeProductNotices.map((notice) => <p className="error" key={notice}>{notice}</p>)}
            <Summary totals={totals} area={area} />
            <button className="btn dark full" type="submit">
              Place order <Check size={16} />
            </button>
          </aside>
        </form>
      ) : (
        <Empty title="Nothing to checkout" text="Your bag is empty." />
      )}
    </main>
  );
}
function Success({ order }) {
  return (
    <main className="page success-page">
      <div className="success-mark">
        <Check />
      </div>
      <p className="eyebrow">ORDER CONFIRMED</p>
      <h1>Thank you, {order?.name?.split(" ")[0] || "there"}.</h1>
      <p>Your order is confirmed and ready for tracking.</p>
      <div className="order-card">
        <span>Order number</span>
        <b>{order?.number}</b>
        <hr />
        <div>
          <span>Estimated delivery</span>
          <strong>{order?.estimated}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{money(order?.total || 0)}</strong>
        </div>
      </div>
      <button
        className="btn dark"
        onClick={() => go(`/track-order?id=${order?.number}`)}
      >
        Track order <ArrowRight size={16} />
      </button>
    </main>
  );
}
function Track({ orders }) {
  const params = new URLSearchParams(location.search);
  const [number, setNumber] = useState(params.get("id") || "");
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState(null);
  const normalizePhone = (value) => String(value || "").replace(/\D/g, "").replace(/^0/, "880");
  const search = (e) => {
    e.preventDefault();
    setFound(
      orders.find(
        (x) =>
          x.number === number.trim() && (!phone || normalizePhone(x.phone) === normalizePhone(phone)),
      ) || false,
    );
  };
  const statusStep = {
    "Order placed": 0,
    Pending: 0,
    Confirmed: 1,
    Processing: 2,
    Packed: 3,
    Shipped: 4,
    "Out for delivery": 5,
    Delivered: 6,
  };
  return (
    <main className="page info-page">
      <div className="page-head">
        <p className="eyebrow">DELIVERY UPDATES</p>
        <h1>Track your order</h1>
        <p>Enter your order ID and phone number. No account required.</p>
      </div>
      <form className="track-form" onSubmit={search}>
        <label>
          Order ID
          <input
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>
        <label>
          Phone number
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button className="btn dark">
          Find order <ArrowRight size={16} />
        </button>
      </form>
      {found === false && <p className="error">We couldn't find that order.</p>}
      {found && (
        <div className="tracking-card">
          <p className="eyebrow">{found.number}</p>
          <h2>{found.status}</h2>
          <p>
            Payment: {found.paymentStatus} · {found.area} · {found.estimated}
          </p>
          <div className="timeline">
            {[
              "Order placed",
              "Confirmed",
              "Processing",
              "Packed",
              "Shipped",
              "Out for delivery",
              "Delivered",
            ].map((step, i) => (
              <div className={i <= (statusStep[found.status] ?? found.step ?? 0) ? "done" : ""} key={step}>
                <b>{i <= (statusStep[found.status] ?? found.step ?? 0) ? "✓" : "○"}</b>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <p>
            {found.address}, {found.district}
          </p>
          {found.courier && <p>Courier: {found.courier}{found.trackingNumber ? ` · Tracking number: ${found.trackingNumber}` : ""}</p>}
          {found.trackingUrl && <a className="btn dark" href={found.trackingUrl} target="_blank" rel="noreferrer">Track with courier <ArrowRight size={16} /></a>}
        </div>
      )}
    </main>
  );
}
function AdminSettings({ settings, setSettings, orders }) {
  const [draft, setDraft] = useState(settings);
  const saveSettings = (e) => {
    e.preventDefault();
    setSettings(draft);
    saveRemoteAware("ziyana-settings", draft);
    alert("Settings saved. Customer checkout is updated.");
  };
  return (
    <main className="page admin">
      <div className="page-head">
        <p className="eyebrow">STORE CONTROL</p>
        <h1>Admin settings</h1>
        <p>
          Demo controls persist locally and update the storefront immediately.
        </p>
      </div>
      <div className="admin-grid">
        <form className="summary" onSubmit={saveSettings}>
          <h2>Delivery settings</h2>
          {[
            ["inside", "Inside Dhaka charge"],
            ["outside", "Outside Dhaka charge"],
            ["threshold", "Free shipping threshold"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                value={draft[key]}
                onChange={(e) =>
                  setDraft({ ...draft, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <h2>Free shipping rules</h2>
          <label className="check">
            <input
              type="checkbox"
              checked={Boolean(draft.freeShippingEnabled)}
              onChange={(e) =>
                setDraft({ ...draft, freeShippingEnabled: e.target.checked })
              }
            />{" "}
            Enable quantity-based free shipping
          </label>
          <label>
            Products needed for free shipping
            <input
              type="number"
              min="1"
              value={draft.freeShippingItems || 3}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  freeShippingItems: Number(e.target.value),
                })
              }
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={Boolean(draft.freeShippingCampaignOnly)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  freeShippingCampaignOnly: e.target.checked,
                })
              }
            />{" "}
            Campaign-only free shipping
          </label>
          <p className="muted">
            When campaign-only is enabled, regular orders always include
            delivery charge. Free shipping applies only with a shipping
            campaign/coupon.
          </p>
          <h2>Flash sale products</h2>
          <p className="muted">
            Selected products appear in the Flash Sale section on the home page.
          </p>
          {(draft.campaigns || []).map((campaign, campaignIndex) => (
            <div className="campaign-product-picker" key={campaign.id}>
              <strong>{campaign.title}</strong>
              {products.map((product) => (
                <label className="check" key={`${campaign.id}-${product.id}`}>
                  <input
                    type="checkbox"
                    checked={(campaign.products || []).includes(product.id)}
                    onChange={(e) => {
                      const selected = new Set(campaign.products || []);
                      if (e.target.checked) selected.add(product.id);
                      else selected.delete(product.id);
                      const campaigns = [...draft.campaigns];
                      campaigns[campaignIndex] = {
                        ...campaign,
                        products: [...selected],
                      };
                      setDraft({ ...draft, campaigns });
                    }}
                  />
                  {product.name}
                </label>
              ))}
            </div>
          ))}
          {[
            ["insideEta", "Inside Dhaka estimate"],
            ["outsideEta", "Outside Dhaka estimate"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <h2>Payment methods</h2>
          {Object.entries(draft.payments).map(([key, value]) => (
            <label className="check" key={key}>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    payments: { ...draft.payments, [key]: e.target.checked },
                  })
                }
              />
              {key.toUpperCase()} enabled
            </label>
          ))}
          <button className="btn dark full">Save settings</button>
        </form>
        <div className="summary">
          <h2>Orders ({orders.length})</h2>
          {orders
            .slice()
            .reverse()
            .map((order) => (
              <div className="mini-item" key={order.number}>
                <span>
                  <b>{order.number}</b>
                  <small>
                    {order.name} · {order.status}
                  </small>
                </span>
                <b>{money(order.total)}</b>
              </div>
            ))}
          {!orders.length && (
            <p className="muted">Orders will appear here after checkout.</p>
          )}
        </div>
      </div>
    </main>
  );
}
const adminCredentials = { email: "admin@ziyanashop.local", password: "ZiyanaAdmin2026" };

function AdminCoupons({ settings, setSettings }) {
  const [form, setForm] = useState({ code: "", type: "percent", value: "", min: "0" });
  const submit = (event) => {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!code || settings.coupons.some((coupon) => coupon.code === code)) return;
    const next = [...settings.coupons, { code, type: form.type, value: Number(form.value || 0), min: Number(form.min || 0), active: true }];
    setSettings({ ...settings, coupons: next });
    saveRemoteAware("ziyana-settings", { ...settings, coupons: next });
    setForm({ code: "", type: "percent", value: "", min: "0" });
  };
  const remove = (code) => {
    const next = settings.coupons.filter((coupon) => coupon.code !== code);
    setSettings({ ...settings, coupons: next });
    saveRemoteAware("ziyana-settings", { ...settings, coupons: next });
  };
  return <div className="admin-console-grid"><form className="summary" onSubmit={submit}><h2>Add coupon</h2><label>Code<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label><label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option><option value="shipping">Free delivery</option></select></label>{form.type !== "shipping" && <label>Value<input type="number" min="0" required value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} /></label>}<label>Minimum order<input type="number" min="0" value={form.min} onChange={(event) => setForm({ ...form, min: event.target.value })} /></label><button className="btn dark full">Add coupon</button></form><section className="summary admin-list"><h2>Active coupons</h2>{settings.coupons.map((coupon) => <div className="mini-item" key={coupon.code}><span><b>{coupon.code}</b><small>{coupon.type} · minimum {money(coupon.min)}</small></span><span><b>{coupon.type === "shipping" ? "Free" : money(coupon.value)}</b><button className="text-link danger-link" onClick={() => remove(coupon.code)}>Remove</button></span></div>)}</section></div>;
}

function AdminCampaigns({ settings, setSettings, productsDraft }) {
  const [form, setForm] = useState({ title: "", description: "", token: "", discountValue: "", image: "", categories: [], freeProductId: "" });
  const update = (campaigns) => { const next = { ...settings, campaigns }; setSettings(next); saveRemoteAware("ziyana-settings", next); };
  const submit = (event) => { event.preventDefault(); update([...settings.campaigns, { ...form, id: `campaign-${Date.now()}`, discountType: "percent", discountValue: Number(form.discountValue || 0), products: [], categories: form.categories, active: true, freeShipping: false, freeProductId: form.freeProductId || null }]); setForm({ title: "", description: "", token: "", discountValue: "", image: "", categories: [], freeProductId: "" }); };
  const toggleProduct = (campaign, productId) => { const selected = new Set(campaign.products || []); selected.has(productId) ? selected.delete(productId) : selected.add(productId); update(settings.campaigns.map((item) => item.id === campaign.id ? { ...item, products: [...selected] } : item)); };
  const setFreeProduct = (campaign, freeProductId) => update(settings.campaigns.map((item) => item.id === campaign.id ? { ...item, freeProductId: freeProductId || null } : item));
  return <div className="admin-campaigns"><form className="summary" onSubmit={submit}><h2>Create campaign</h2><div className="form-grid"><label>Campaign title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Discount %<input type="number" min="0" value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} /></label></div><label>Description<input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="form-grid"><label>Coupon token<input required value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value.toUpperCase() })} /></label><label>Image URL<input required type="url" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></label></div><p className="eyebrow">Campaign categories</p><div className="campaign-product-grid">{categories.map((category) => <label className="check" key={category.name}><input type="checkbox" checked={form.categories.includes(category.name)} onChange={() => setForm({ ...form, categories: form.categories.includes(category.name) ? form.categories.filter((item) => item !== category.name) : [...form.categories, category.name] })} />{category.name}</label>)}</div><button className="btn dark">Create campaign</button></form>{settings.campaigns.map((campaign) => <section className="summary campaign-editor" key={campaign.id}><div className="section-title"><div><h2>{campaign.title}</h2><p className="muted">{campaign.description} · {campaign.token}</p></div><label className="check"><input type="checkbox" checked={campaign.active !== false} onChange={() => update(settings.campaigns.map((item) => item.id === campaign.id ? { ...item, active: item.active === false } : item))} /> Active</label></div><p className="eyebrow">Categories: {(campaign.categories || []).join(", ") || "Product selection only"}</p><p className="eyebrow">Products in campaign</p><div className="campaign-product-grid">{productsDraft.map((product) => <label className="check" key={`${campaign.id}-${product.id}`}><input type="checkbox" checked={(campaign.products || []).includes(product.id)} onChange={() => toggleProduct(campaign, product.id)} />{product.name}</label>)}</div></section>)}</div>;
}

function AdminFreeProductSettings({ settings, setSettings, productsDraft }) {
  const getDraft = (campaign) => campaign.freeProduct || { productId: campaign.freeProductId || "", title: "", quantity: 1, stock: 0, image: "", triggerMode: "campaign", triggerProducts: campaign.products || [], triggerCategories: campaign.categories || [], triggerCategory: campaign.categories?.[0] || "" };
  const update = (campaignId, freeProduct) => {
    const next = { ...settings, campaigns: settings.campaigns.map((campaign) => campaign.id === campaignId ? { ...campaign, freeProduct: freeProduct.productId || freeProduct.title ? freeProduct : null, freeProductId: freeProduct.productId || null } : campaign) };
    setSettings(next);
    saveRemoteAware("ziyana-settings", next);
  };
  return <section className="summary admin-list free-product-settings"><h2>Campaign free products</h2><p className="muted">Choose the campaign, eligible categories, and exact trigger products. The free item appears only when one of those triggers is in the cart.</p>{settings.campaigns.map((campaign) => { const draft = getDraft(campaign); const selected = productsDraft.find((product) => String(product.id) === String(draft.productId)); return <FreeProductEditor key={campaign.id} campaign={campaign} draft={draft} selected={selected} productsDraft={productsDraft} onSave={update} />; })}</section>;
}

function FreeProductEditor({ campaign, draft, selected, productsDraft, onSave }) {
  const [form, setForm] = useState(draft);
  const chooseProduct = (productId) => { const product = productsDraft.find((item) => String(item.id) === String(productId)); setForm({ ...form, productId, title: form.title || product?.name || "", image: form.image || product?.image || "", stock: form.stock || product?.stock || 0 }); };
  return <div className="free-product-editor"><div className="section-title"><div><h3>{campaign.title}</h3><p className="muted">Choose one compact trigger for this free offer.</p></div></div><label>Trigger type<select value={form.triggerMode || "campaign"} onChange={(event) => setForm({ ...form, triggerMode: event.target.value })}><option value="category">Category</option><option value="campaign">Campaign</option><option value="product">Product</option></select></label>{form.triggerMode === "category" && <label>Trigger category<select value={form.triggerCategory || ""} onChange={(event) => setForm({ ...form, triggerCategory: event.target.value })}><option value="">Choose category</option>{categories.map((category) => <option key={category.name}>{category.name}</option>)}</select></label>}{form.triggerMode === "campaign" && <p className="success">All products assigned to {campaign.title} will trigger this free item.</p>}{form.triggerMode === "product" && <label>Trigger product<select value={(form.triggerProducts || [])[0] || ""} onChange={(event) => setForm({ ...form, triggerProducts: event.target.value ? [event.target.value] : [] })}><option value="">Choose product</option>{productsDraft.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>}<label>Free item source<select value={form.productId || ""} onChange={(event) => chooseProduct(event.target.value)}><option value="">Manual free product</option>{productsDraft.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><div className="form-grid"><label>Free product title<input value={form.title || ""} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Quantity<input type="number" min="1" value={form.quantity || 1} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label></div><div className="form-grid"><label>Free stock<input type="number" min="0" value={form.stock ?? 0} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label><label>Image link<input type="url" value={form.image || ""} onChange={(event) => setForm({ ...form, image: event.target.value })} /></label></div>{selected && <p className="muted">Store product: {selected.name} · available stock {selected.stock}</p>}<button className="btn dark" onClick={() => onSave(campaign.id, { ...form, quantity: Number(form.quantity || 1), stock: Number(form.stock || 0), triggerMode: form.triggerMode || "campaign", triggerProducts: form.triggerProducts || [], triggerCategories: form.triggerCategories || [] })}>Save free product</button></div>;
}

function AdminOrders({ orders, setOrders }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const statuses = ["Order placed", "Pending", "Confirmed", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"];
  const normalized = (value) => String(value || "").replace(/\D/g, "").replace(/^0/, "880");
  const filtered = orders.filter((order) => (status === "All" || order.status === status) && (!query || normalized(order.phone).includes(normalized(query)) || order.number.toLowerCase().includes(query.toLowerCase())));
  return <section className="summary admin-list"><div className="admin-filter-row"><label>Search mobile or order ID<input placeholder="017... or ORD-..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label></div><h2>Orders ({filtered.length})</h2>{filtered.length ? filtered.slice().reverse().map((order) => <AdminOrderRow key={order.number} order={order} orders={orders} setOrders={setOrders} statuses={statuses} />) : <p className="muted">No matching orders yet.</p>}</section>;
}

function AdminOrderRow({ order, orders, setOrders, statuses }) {
  const [draft, setDraft] = useState({ status: order.status, courier: order.courier || "", trackingNumber: order.trackingNumber || "", trackingUrl: order.trackingUrl || "" });
  const saveOrder = () => {
    const next = orders.map((item) => item.number === order.number ? { ...item, ...draft } : item);
    setOrders(next);
    saveRemoteAware("ziyana-orders", next);
    saveRemoteAware("ziyana-tracking", next.map((item) => ({ number: item.number, status: item.status, courier: item.courier || "", trackingNumber: item.trackingNumber || "", trackingUrl: item.trackingUrl || "", updatedAt: new Date().toISOString() })));
  };
  return <div className="order-admin-card"><div className="mini-item"><span><b>{order.number}</b><small>{order.name} · {order.phone} · {money(order.total)}</small></span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div><div className="form-grid"><label>Courier<input value={draft.courier} placeholder="Steadfast" onChange={(event) => setDraft({ ...draft, courier: event.target.value })} /></label><label>Tracking number<input value={draft.trackingNumber} placeholder="Courier tracking number" onChange={(event) => setDraft({ ...draft, trackingNumber: event.target.value })} /></label></div><label>Tracking URL<input type="url" value={draft.trackingUrl} placeholder="https://courier.example/track/..." onChange={(event) => setDraft({ ...draft, trackingUrl: event.target.value })} /></label><button className="btn dark" onClick={saveOrder}>Save tracking update</button></div>;
}

function AdminDashboard({ orders, productsDraft }) {
  const [period, setPeriod] = useState("30 days");
  const [expenses, setExpenses] = useState(load("ziyana-expenses", []));
  const [expense, setExpense] = useState({ category: "Courier", amount: "", description: "" });
  const days = period === "7 days" ? 7 : period === "1 year" ? 365 : 30;
  const since = Date.now() - days * 86400000;
  const periodOrders = orders.filter((order) => new Date(order.date || 0).getTime() >= since);
  const revenue = periodOrders.reduce((sum, order) => sum + Number(order.subtotal || order.total || 0), 0);
  const productCost = periodOrders.reduce((sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.costPrice || 0) * Number(item.quantity || 0), 0), 0);
  const shipping = periodOrders.reduce((sum, order) => sum + Number(order.shipping || 0), 0);
  const expenseTotal = expenses.filter((item) => new Date(item.date).getTime() >= since).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const units = {};
  const areas = {};
  periodOrders.forEach((order) => { (order.items || []).forEach((item) => { units[item.name] = (units[item.name] || 0) + Number(item.quantity || 0); }); areas[order.district || order.area || "Unknown"] = (areas[order.district || order.area || "Unknown"] || 0) + 1; });
  const topProducts = Object.entries(units).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topAreas = Object.entries(areas).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const addExpense = (event) => { event.preventDefault(); const next = [...expenses, { ...expense, amount: Number(expense.amount), date: new Date().toISOString() }]; setExpenses(next); saveRemoteAware("ziyana-expenses", next); setExpense({ category: "Courier", amount: "", description: "" }); };
  return <div className="dashboard-workspace"><div className="dashboard-filter"><div><p className="eyebrow">PERFORMANCE OVERVIEW</p><h2>Sales intelligence</h2></div><select value={period} onChange={(event) => setPeriod(event.target.value)}><option>7 days</option><option>30 days</option><option>1 year</option></select></div><div className="admin-metrics"><div><span>Revenue</span><strong>{money(revenue)}</strong></div><div><span>Orders</span><strong>{periodOrders.length}</strong></div><div><span>Product cost</span><strong>{money(productCost)}</strong></div><div><span>Net estimate</span><strong>{money(revenue - productCost - shipping - expenseTotal)}</strong></div></div><div className="analytics-grid"><section className="summary"><h2>Fastest-selling products</h2>{topProducts.length ? topProducts.map(([name, quantity]) => <div className="mini-item" key={name}><span><b>{name}</b><small>{quantity} units sold</small></span><b>{money((productsDraft.find((item) => item.name === name)?.price || 0) * quantity)}</b></div>) : <p className="muted">Sales data will appear after orders.</p>}</section><section className="summary"><h2>Sales by area</h2>{topAreas.length ? topAreas.map(([area, count]) => <div className="mini-item" key={area}><span><b>{area}</b><small>{count} order(s)</small></span><b>{Math.round((count / periodOrders.length) * 100)}%</b></div>) : <p className="muted">Area data will appear after orders.</p>}</section><section className="summary"><h2>Cost breakdown</h2><div className="mini-item"><span>Courier cost</span><b>{money(shipping)}</b></div><div className="mini-item"><span>Other expenses</span><b>{money(expenseTotal)}</b></div><div className="mini-item"><span>Gross profit</span><b>{money(revenue - productCost)}</b></div></section><form className="summary" onSubmit={addExpense}><h2>Add expense</h2><label>Category<select value={expense.category} onChange={(event) => setExpense({ ...expense, category: event.target.value })}>{["Product Purchase", "Packaging", "Courier", "Marketing", "Advertising", "Salary", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Description<input required value={expense.description} onChange={(event) => setExpense({ ...expense, description: event.target.value })} /></label><label>Amount<input required type="number" min="0" value={expense.amount} onChange={(event) => setExpense({ ...expense, amount: event.target.value })} /></label><button className="btn dark full">Save expense</button></form></div></div>;
}

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = (event) => {
    event.preventDefault();
    if (email.trim().toLowerCase() !== adminCredentials.email || password !== adminCredentials.password)
      return setError("Admin email or password is incorrect.");
    save("ziyana-admin-session", { email: adminCredentials.email, signedInAt: Date.now() });
    onLogin();
  };
  return (
    <main className="page auth-page admin-login-page">
      <div className="page-head">
        <p className="eyebrow">PRIVATE WORKSPACE</p>
        <h1>Admin sign in</h1>
        <p>This area is only for the ZiyanaShop team.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>Admin email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn dark full">Enter admin panel <ArrowRight size={16} /></button>
      </form>
    </main>
  );
}

function AdminConsole({ settings, setSettings, orders, setOrders, onLogout }) {
  const [tab, setTab] = useState("Dashboard");
  const [productsDraft, setProductsDraft] = useState(products);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ name: "", category: categories[0].name, cost: "", price: "", discount: "", stock: "", image: "", video: "", description: "", newArrival: true });
  const [notice, setNotice] = useState("");
  const sales = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lowStock = productsDraft.filter((product) => Number(product.stock) < 10);
  const saveProduct = (event) => {
    event.preventDefault();
    if (form.video && !/^https?:\/\//i.test(form.video)) return setNotice("Video must be a valid URL.");
    const discountPercent = Math.min(100, Math.max(0, Number(form.discount || 0)));
    const originalPrice = Number(form.price);
    const sellingPrice = Math.round(originalPrice * (1 - discountPercent / 100));
    const product = { ...form, id: editingProduct || `P${Date.now().toString().slice(-6)}`, price: sellingPrice, originalPrice, costPrice: Number(form.cost), stock: Number(form.stock), rating: editingProduct ? form.rating : 0, reviews: editingProduct ? form.reviews : 0, discount: discountPercent, discountPercent, colors: [], sizes: [], featured: editingProduct ? form.featured : false, newArrival: form.newArrival, bestSeller: editingProduct ? form.bestSeller : false };
    const next = editingProduct ? productsDraft.map((item) => item.id === editingProduct ? product : item) : [...productsDraft, product];
    setProductsDraft(next);
    saveRemoteAware("ziyana-admin-products", next);
    setEditingProduct(null);
    setForm({ name: "", category: categories[0].name, cost: "", price: "", discount: "", stock: "", image: "", video: "", description: "", newArrival: true });
    setNotice(editingProduct ? "Product updated. Storefront will refresh now." : "Product saved in the private admin catalogue.");
  };
  const editProduct = (product) => { setEditingProduct(product.id); setForm({ ...product, cost: product.costPrice || "", price: product.originalPrice || product.price || "", discount: product.discountPercent ?? product.discount ?? 0, newArrival: product.newArrival !== false }); setTab("Products"); };
  const tabs = ["Dashboard", "Products", "Orders", "Inventory", "Delivery & payments", "Campaigns", "Coupons", "Expenses", "Reports"];
  return (
    <main className="page admin-console">
      <div className="admin-topbar">
        <div><p className="eyebrow">ECOMMERCE ADMIN</p><h1>Store control</h1></div>
        <button className="btn outline" onClick={onLogout}>Sign out</button>
      </div>
      <nav className="admin-tabs">{tabs.map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
      {tab === "Dashboard" && <AdminDashboard orders={orders} productsDraft={productsDraft} />}
      {tab === "Products" && <div className="admin-console-grid"><form className="summary" onSubmit={saveProduct}><h2>{editingProduct ? "Edit product" : "Add product"}</h2><p className="muted">Changes are published to the storefront after save.</p>{[["name","Product title"],["cost","Cost price"],["price","Selling price"],["discount","Discount amount"],["stock","Stock"],["image","Image URL"],["video","Short video URL (max 10 sec)"],["description","Description"]].map(([key, label]) => <label key={key}>{label}<input required={key !== "video"} type={key === "cost" || key === "price" || key === "discount" || key === "stock" ? "number" : "text"} min={key === "discount" ? "0" : undefined} value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}<label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category.name}>{category.name}</option>)}</select></label><label className="check"><input type="checkbox" checked={form.newArrival} onChange={(event) => setForm({ ...form, newArrival: event.target.checked })} /> Show in New Arrivals</label>{notice && <p className="success">{notice}</p>}<button className="btn dark full">{editingProduct ? "Update product" : "Save product"}</button>{editingProduct && <button type="button" className="btn outline full" onClick={() => { setEditingProduct(null); setForm({ name: "", category: categories[0].name, cost: "", price: "", discount: "", stock: "", image: "", video: "", description: "", newArrival: true }); }}>Cancel edit</button>}</form><section className="summary"><h2>Catalogue ({productsDraft.length})</h2>{productsDraft.slice().reverse().map((product) => <div className="mini-item" key={product.id}><span><b>{product.name}</b><small>{product.id} · {product.category} · {product.stock} in stock · cost {money(product.costPrice || 0)}</small></span><span><b>{money(product.price)}</b><button className="text-link" onClick={() => editProduct(product)}>Edit</button></span></div>)}</section></div>}
      {tab === "Orders" && <AdminOrders orders={orders} setOrders={setOrders} />}
      {tab === "Inventory" && <section className="summary admin-list"><h2>Inventory</h2>{productsDraft.map((product) => <div className="mini-item" key={product.id}><span><b>{product.name}</b><small>{product.category}</small></span><b className={product.stock < 10 ? "error" : ""}>{product.stock} units</b></div>)}</section>}
      {tab === "Delivery & payments" && <AdminSettings settings={settings} setSettings={setSettings} orders={orders} />}
      {tab === "Campaigns" && <><AdminCampaigns settings={settings} setSettings={setSettings} productsDraft={productsDraft} /><AdminFreeProductSettings settings={settings} setSettings={setSettings} productsDraft={productsDraft} /></>}
      {tab === "Coupons" && <AdminCoupons settings={settings} setSettings={setSettings} />}
      {(tab === "Expenses" || tab === "Reports") && <section className="summary admin-list"><h2>{tab}</h2><p className="muted">This private workspace is ready for entries. Sales currently total {money(sales)} across {orders.length} orders.</p></section>}
    </main>
  );
}
function Info({ title, text }) {
  return (
    <main className="page info-page">
      <div className="page-head">
        <p className="eyebrow">ZIYANASHOP</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </main>
  );
}
function App() {
  const [path, setPath] = useState(location.pathname);
  const [cart, setCart] = useState(load("ziyana-cart", []));
  const [wishlist, setWishlist] = useState(load("ziyana-wishlist", []));
  const [settings, setSettings] = useState(mergeSettings(load("ziyana-settings", defaults)));
  const [orders, setOrders] = useState(load("ziyana-orders", []));
  const [order, setOrder] = useState(null);
  useEffect(() => {
    const update = () => setPath(location.pathname);
    addEventListener("popstate", update);
    return () => removeEventListener("popstate", update);
  }, []);
  useEffect(() => save("ziyana-cart", cart), [cart]);
  useEffect(() => save("ziyana-wishlist", wishlist), [wishlist]);
  useEffect(() => saveRemoteAware("ziyana-settings", settings), [settings]);
  useEffect(() => saveRemoteAware("ziyana-orders", orders), [orders]);
  const addCart = (product, quantity = 1, size = "", color = "") =>
    setCart((items) => {
      const key = `${product.id}-${size}-${color}`;
      const item = items.find((x) => x.key === key);
      return item
        ? items.map((x) =>
            x.key === key
              ? {
                  ...x,
                  quantity: Math.min(product.stock, x.quantity + quantity),
                }
              : x,
          )
        : [
            ...items,
            {
              ...product,
              productId: product.id,
              key,
              size,
              color,
              quantity: Math.min(product.stock, quantity),
            },
          ];
    });
  const updateQuantity = (key, quantity) =>
    setCart((items) =>
      quantity < 1
        ? items.filter((x) => x.key !== key)
        : items.map((x) =>
            x.key === key ? { ...x, quantity: Math.min(x.stock, quantity) } : x,
          ),
    );
  const removeItem = (key) =>
    setCart((items) => items.filter((x) => x.key !== key));
  const toggleWishlist = (id) =>
    setWishlist((items) =>
      items.includes(id) ? items.filter((x) => x !== id) : [...items, id],
    );
  const onOrder = (data) => {
    const created = {
      ...data,
      number: `ZY-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString(),
      status: "Order placed",
      paymentStatus: "Pending",
      step: 0,
    };
    const nextOrders = [...orders, created];
    saveRemoteAware("ziyana-orders", nextOrders);
    saveRemoteAware("ziyana-customers", [...load("ziyana-customers", []).filter((item) => item.phone !== data.phone && item.email !== data.email), { name: data.name, email: data.email || "", phone: data.phone || "", address: data.address || "", district: data.district || "", updatedAt: new Date().toISOString() }]);
    saveRemoteAware("ziyana-payments", [...load("ziyana-payments", []), { orderNumber: created.number, method: created.payment || "cod", amount: created.total, status: created.paymentStatus, createdAt: created.date }]);
    saveRemoteAware("ziyana-tracking", [...load("ziyana-tracking", []), { orderNumber: created.number, status: created.status, step: created.step, createdAt: created.date }]);
    saveRemoteAware("ziyana-sales-report", nextOrders);
    setOrders(nextOrders);
    setOrder(created);
    setCart([]);
    go("/success");
  };
  const shared = { cart, wishlist, addCart, toggleWishlist };
  let view =
    path === "/" ? (
      <Home {...shared} campaigns={settings.campaigns || defaults.campaigns} />
    ) : path === "/shop" || path === "/categories" ? (
      <Shop {...shared} />
    ) : path === "/cart" ? (
      <Cart
        {...shared}
        settings={settings}
        updateQuantity={updateQuantity}
        removeItem={removeItem}
      />
    ) : path === "/checkout" ? (
      <Checkout cart={cart} settings={settings} onOrder={onOrder} />
    ) : path === "/success" ? (
      <Success order={order || orders.at(-1)} />
    ) : path === "/track-order" ? (
      <Track orders={orders} />
    ) : path === "/wishlist" ? (
      <main className="page">
        <div className="page-head">
          <p className="eyebrow">KEPT FOR LATER</p>
          <h1>Your wishlist</h1>
        </div>
        {products.filter((p) => wishlist.includes(p.id)).length ? (
          <Grid
            list={products.filter((p) => wishlist.includes(p.id))}
            {...shared}
          />
        ) : (
          <Empty
            title="Your wishlist is empty"
            text="Tap the heart on a piece to keep it close."
          />
        )}
      </main>
    ) : path.startsWith("/product/") ? (
      <Product
        product={
          products.find((p) => String(p.id) === path.split("/")[2]) ||
          products[0]
        }
        {...shared}
      />
    ) : path === "/faq" ? (
      <Info
        title="Frequently asked"
        text="We deliver nationwide across Bangladesh. Dhaka orders take 1-3 working days and outside Dhaka orders take 2-5 working days. Cash on delivery is available."
      />
    ) : path === "/delivery-returns" ? (
      <Info
        title="Delivery & returns"
        text={`Inside Dhaka delivery is ${money(settings.inside)} and outside Dhaka is ${money(settings.outside)}. Orders over ${money(settings.threshold)} ship free. Returns are accepted within 7 days when unused and in original condition.`}
      />
    ) : (
      <Info
        title="Our story"
        text="ZiyanaShop is a considered edit of fashion, beauty and small luxuries, chosen for everyday life."
      />
    );
  return (
    <>
      <Header cart={cart} wishlist={wishlist} />
      {view}
      {!path.startsWith("/admin") && <Footer />}
    </>
  );
}
function ProductBuyNow({ product, addCart, wishlist, toggleWishlist }) {
  const [size, setSize] = useState(product.sizes[0] || "");
  const [color, setColor] = useState(product.colors[0] || "");
  const [qty, setQty] = useState(1);
  const [notice, setNotice] = useState("");
  const buy = (direct) => {
    if (product.sizes.length && !size)
      return setNotice("Please choose a size.");
    if (product.colors.length && !color)
      return setNotice("Please choose a colour.");
    if (!product.stock || qty > product.stock)
      return setNotice("This item is out of stock.");
    addCart(product, qty, size, color);
    if (direct) setTimeout(() => go("/checkout"), 0);
    else setNotice("Added to your bag.");
  };
  return (
    <main className="page detail">
      <div className="detail-grid">
        <div className="gallery">
          <img className="main-photo" src={product.image} alt={product.name} />
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <Rating
            value={product.rating}
            reviews={`${product.reviews} reviews`}
          />
          <div className="detail-price">
            <strong>{money(product.price)}</strong>{" "}
            <del>{money(product.originalPrice)}</del>
            <em>{product.discount}% off</em>
          </div>
          <p className="description">{product.description}</p>
          {product.colors.length > 0 && (
            <div className="option">
              <b>Colour</b>
              <div className="swatches">
                {product.colors.map((item) => (
                  <button
                    className={color === item ? "selected" : ""}
                    key={item}
                    onClick={() => setColor(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          {product.sizes.length > 0 && (
            <div className="option">
              <b>Size</b>
              <div className="sizes">
                {product.sizes.map((item) => (
                  <button
                    className={size === item ? "selected" : ""}
                    key={item}
                    onClick={() => setSize(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="stock">
            {product.stock ? `${product.stock} in stock` : "Out of stock"}
          </p>
          <div className="buy-row">
            <div className="quantity">
              <button onClick={() => setQty(Math.max(1, qty - 1))}>
                <Minus size={15} />
              </button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(product.stock, qty + 1))}>
                <Plus size={15} />
              </button>
            </div>
            <button
              className="btn outline grow"
              disabled={!product.stock}
              onClick={() => buy(false)}
            >
              Add to bag
            </button>
            <button
              className="btn dark grow"
              disabled={!product.stock}
              onClick={() => buy(true)}
            >
              Buy now
            </button>
            <button
              className={`icon wish-detail ${wishlist.includes(product.id) ? "saved" : ""}`}
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart
                fill={wishlist.includes(product.id) ? "currentColor" : "none"}
              />
            </button>
          </div>
          {notice && <p className="success">{notice}</p>}
          <p className="delivery-note">
            Delivery: Inside Dhaka 1-3 working days, outside Dhaka 2-5 working
            days.
          </p>
        </div>
      </div>
    </main>
  );
}
function CampaignSlider({ campaigns = [] }) {
  const active = campaigns.filter((c) => c.active !== false);
  return active.length ? (
    <section className="campaign-band">
      <div className="section-title">
        <div>
          <p className="eyebrow">SPECIAL CAMPAIGNS</p>
          <h2>Made for this moment</h2>
        </div>
      </div>
      <div className="campaign-slider">
        {active.map((campaign) => (
          <button
            className="campaign-card"
            key={campaign.id}
            onClick={() => go(`/campaign/${campaign.id}`)}
          >
            <img src={campaign.image} alt={campaign.title} />
            <span>
              <b>{campaign.title}</b>
              <small>{campaign.description}</small>
              <em>
                {campaign.discountValue}% off · {campaign.token}
              </em>
            </span>
          </button>
        ))}
      </div>
    </section>
  ) : null;
}
function Root() {
  const [ready, setReady] = useState(!remoteApiUrl);
  useEffect(() => {
    if (ready) return;
    hydrateFromRemote().finally(() => setReady(true));
  }, [ready]);
  return ready ? <AppWithAccount /> : <LoadingScreen label="Loading ZiyanaShop" />;
}
function LoadingScreen({ label = "Loading" }) {
  return <main className="loading-screen" role="status" aria-live="polite"><span className="loading-mark"><span className="loading-brand">Z<span>Shop</span></span><span className="loading-spinner" /></span><span>{label}</span></main>;
}
createRoot(document.getElementById("root")).render(<Root />);

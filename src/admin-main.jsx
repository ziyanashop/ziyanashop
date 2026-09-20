import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BarChart3, Boxes, ChevronDown, CircleDollarSign, LayoutDashboard, LogOut, Megaphone, Package, Search, Settings, ShoppingBag, Users, X } from "lucide-react";
import { products as seedProducts, formatPrice } from "./data";
import "./admin.css";

const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const defaultCampaigns = [
  { id: "ramadan-edit", title: "Ramadan Edit", description: "Soft layers and thoughtful gifts for the season.", token: "RAMADAN10", products: [], categories: ["Women's Edit"], discountType: "percent", discountValue: 10, freeShipping: true, active: true },
  { id: "weekend-special", title: "Weekend Special", description: "A little extra off your next favourite.", token: "WEEKEND", products: [1,2,3,4], categories: [], discountType: "percent", discountValue: 15, freeShipping: false, active: true },
];
const getProducts = () => {
  const p = load("ziyana-admin-products", seedProducts);
  return Array.isArray(p) ? p : seedProducts;
};
const getCampaigns = () => {
  const settings = load("ziyana-settings", {});
  return Array.isArray(settings.campaigns) ? settings.campaigns : defaultCampaigns;
};
const persistCampaigns = (campaigns) => {
  const settings = load("ziyana-settings", {});
  save("ziyana-settings", { ...settings, campaigns });
};

function AdminLogin({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const configured = load("ziyana-admin-credentials", null);
    const valid = configured ? username === configured.username && password === configured.password : username === "admin" && password === "admin123";
    if (!valid) return setError("Invalid admin credentials.");
    save("ziyana-admin-session", { username, at: Date.now() });
    onSuccess();
  };
  return <main className="admin-login"><div className="login-card"><div className="admin-mark">Z</div><p className="eyebrow">ZIYANASHOP ADMIN</p><h1>Welcome back</h1><p className="muted">Sign in to manage your store.</p><form onSubmit={submit}><label>Username<input value={username} onChange={e=>setUsername(e.target.value)} required autoComplete="username" /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" /></label>{error && <div className="alert">{error}</div>}<button className="primary full">Sign in</button></form><small>Change the default credentials before production.</small></div></main>;
}

function ProductPicker({ products, selected, onChange }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = useMemo(() => products.filter(p => (!query || `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())) && (category === "all" || p.category === category)), [products, query, category]);
  const toggle = id => onChange(selected.includes(id) ? selected.filter(x=>x!==id) : [...selected, id]);
  const allVisibleSelected = filtered.length > 0 && filtered.every(p => selected.includes(p.id));
  const toggleAll = () => onChange(allVisibleSelected ? selected.filter(id => !filtered.some(p=>p.id===id)) : [...new Set([...selected, ...filtered.map(p=>p.id)])]);
  return <div className="picker"><div className="picker-toolbar"><div className="searchbox"><Search size={17}/><input placeholder="Search products..." value={query} onChange={e=>setQuery(e.target.value)} /></div><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select><button type="button" className="secondary" onClick={toggleAll}>{allVisibleSelected ? "Clear visible" : "Select visible"}</button></div><div className="selection-count">{selected.length} product{selected.length===1?"":"s"} selected</div><div className="product-grid">{filtered.map(p=><button type="button" key={p.id} className={`product-select ${selected.includes(p.id)?"selected":""}`} onClick={()=>toggle(p.id)}><span className="check">{selected.includes(p.id)?"✓":""}</span><img src={p.image} alt=""/><span className="product-info"><b>{p.name}</b><small>{p.category} · {formatPrice(p.price)}</small></span></button>)}</div>{filtered.length===0 && <div className="empty">No products match your search.</div>}</div>;
}

function Campaigns({ products }) {
  const [campaigns, setCampaigns] = useState(getCampaigns);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const startNew = () => setEditing({ id: `campaign-${Date.now()}`, title:"", description:"", token:"", products:[], categories:[], discountType:"percent", discountValue:10, freeShipping:false, active:true });
  const saveCampaign = (campaign) => { const next = campaigns.some(c=>c.id===campaign.id) ? campaigns.map(c=>c.id===campaign.id?campaign:c) : [...campaigns,campaign]; setCampaigns(next); persistCampaigns(next); setEditing(null); setNotice("Campaign saved successfully."); setTimeout(()=>setNotice(""),2500); };
  const remove = id => { if(!confirm("Delete this campaign?")) return; const next=campaigns.filter(c=>c.id!==id); setCampaigns(next); persistCampaigns(next); };
  if (editing) return <section className="content"><div className="section-head"><div><p className="eyebrow">CAMPAIGN BUILDER</p><h1>{editing.title || "New campaign"}</h1></div><button className="secondary" onClick={()=>setEditing(null)}>Cancel</button></div><div className="form-card"><div className="form-grid"><label>Campaign title<input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} required /></label><label>Campaign code<input value={editing.token} onChange={e=>setEditing({...editing,token:e.target.value.toUpperCase()})} /></label><label className="wide">Description<textarea rows="3" value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/></label><label>Discount type<select value={editing.discountType} onChange={e=>setEditing({...editing,discountType:e.target.value})}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label><label>Discount value<input type="number" min="0" value={editing.discountValue} onChange={e=>setEditing({...editing,discountValue:Number(e.target.value)})}/></label><label className="toggle"><input type="checkbox" checked={editing.freeShipping} onChange={e=>setEditing({...editing,freeShipping:e.target.checked})}/> Free shipping</label><label className="toggle"><input type="checkbox" checked={editing.active} onChange={e=>setEditing({...editing,active:e.target.checked})}/> Active campaign</label></div><h3>Products</h3><ProductPicker products={products} selected={editing.products || []} onChange={ids=>setEditing({...editing,products:ids})}/><div className="form-actions"><button className="secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="primary" onClick={()=>saveCampaign(editing)} disabled={!editing.title.trim()}>Save campaign</button></div></div></section>;
  return <section className="content"><div className="section-head"><div><p className="eyebrow">MARKETING</p><h1>Campaigns</h1><p className="muted">Create targeted promotions and attach one or many products.</p></div><button className="primary" onClick={startNew}>+ New campaign</button></div>{notice&&<div className="success">{notice}</div>}<div className="campaign-list">{campaigns.map(c=><article className="campaign-card" key={c.id}><div><div className="campaign-status"><span className={c.active?"dot active":"dot"}/>{c.active?"Active":"Paused"}</div><h2>{c.title}</h2><p>{c.description}</p><div className="chips"><span>{c.products?.length||0} products</span><span>{c.discountValue}{c.discountType==="percent"?"%":" ৳"} off</span>{c.freeShipping&&<span>Free shipping</span>}{c.token&&<span>{c.token}</span>}</div></div><div className="campaign-actions"><button className="secondary" onClick={()=>setEditing(c)}>Edit</button><button className="danger" onClick={()=>remove(c.id)}>Delete</button></div></article>)}</div></section>;
}

function Dashboard({ products }) { const orders=load("ziyana-orders",[]); const customers=load("ziyana-customers",[]); const revenue=orders.reduce((n,o)=>n+Number(o.total||0),0); return <section className="content"><div className="section-head"><div><p className="eyebrow">OVERVIEW</p><h1>Dashboard</h1><p className="muted">A quick view of your store operations.</p></div></div><div className="stats"><div><CircleDollarSign/><small>Revenue</small><strong>{formatPrice(revenue)}</strong></div><div><ShoppingBag/><small>Orders</small><strong>{orders.length}</strong></div><div><Users/><small>Customers</small><strong>{customers.length}</strong></div><div><Boxes/><small>Products</small><strong>{products.length}</strong></div></div><div className="table-card"><div className="card-head"><h2>Recent orders</h2></div>{orders.slice(-8).reverse().map(o=><div className="table-row" key={o.number}><b>{o.number}</b><span>{o.phone||o.email||"Customer"}</span><span>{formatPrice(o.total||0)}</span><span className="status-pill">{o.status||"Processing"}</span></div>)}{!orders.length&&<div className="empty">No orders yet.</div>}</div></section>; }

function App() {
  const [session,setSession]=useState(()=>load("ziyana-admin-session",null)); const [page,setPage]=useState("dashboard"); const [products]=useState(getProducts); const logout=()=>{localStorage.removeItem("ziyana-admin-session");setSession(null)};
  if(!session) return <AdminLogin onSuccess={()=>setSession(load("ziyana-admin-session",{}))}/>;
  const nav=[ ["dashboard","Dashboard",LayoutDashboard], ["campaigns","Campaigns",Megaphone], ["products","Products",Package], ["orders","Orders",ShoppingBag], ["customers","Customers",Users], ["reports","Reports",BarChart3], ["settings","Settings",Settings] ];
  return <div className="admin-shell"><aside className="sidebar"><div className="brand">Ziyana<span>Shop</span><small>ADMIN</small></div><nav>{nav.map(([id,label,Icon])=><button className={page===id?"nav-item active":"nav-item"} onClick={()=>setPage(id)} key={id}><Icon size={18}/>{label}</button>)}</nav><button className="logout" onClick={logout}><LogOut size={18}/>Sign out</button></aside><main className="admin-main"><header className="admin-top"><div><b>Store administration</b><span> · Bangladesh</span></div><a href="/" target="_blank" rel="noreferrer">View store ↗</a></header>{page==="dashboard"&&<Dashboard products={products}/>} {page==="campaigns"&&<Campaigns products={products}/>} {page==="products"&&<section className="content"><div className="section-head"><div><p className="eyebrow">CATALOG</p><h1>Products</h1></div></div><div className="table-card">{products.map(p=><div className="table-row" key={p.id}><img className="thumb" src={p.image}/><b>{p.name}</b><span>{p.category}</span><span>{formatPrice(p.price)}</span><span>Stock {p.stock}</span></div>)}</div></section>} {page==="orders"&&<section className="content"><div className="section-head"><div><p className="eyebrow">FULFILMENT</p><h1>Orders</h1></div></div><div className="table-card">{load("ziyana-orders",[]).map(o=><div className="table-row" key={o.number}><b>{o.number}</b><span>{o.email||o.phone}</span><span>{formatPrice(o.total||0)}</span><span className="status-pill">{o.status||"Processing"}</span></div>)}</div></section>} {page==="customers"&&<section className="content"><div className="section-head"><div><p className="eyebrow">CUSTOMERS</p><h1>Customers</h1></div></div><div className="table-card">{load("ziyana-customers",[]).map((c,i)=><div className="table-row" key={c.phone||c.email||i}><b>{c.name||"Customer"}</b><span>{c.email}</span><span>{c.phone}</span></div>)}</div></section>} {page==="reports"&&<section className="content"><div className="section-head"><div><p className="eyebrow">ANALYTICS</p><h1>Reports</h1></div></div><Dashboard products={products}/></section>} {page==="settings"&&<section className="content"><div className="section-head"><div><p className="eyebrow">CONFIGURATION</p><h1>Settings</h1></div></div><div className="form-card"><h2>Admin access</h2><p className="muted">For production, move authentication to a server-side identity provider and never store admin passwords in browser storage.</p><div className="info-box">Current admin session: {session.username || "admin"}</div></div></section>}</main></div>;
}

createRoot(document.getElementById("admin-root")).render(<App />);

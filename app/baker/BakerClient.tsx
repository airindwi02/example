"use client";
import LogoutLink from "../_auth/LogoutLink";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useRef, useState } from "react";
import { Bell, Search, LayoutDashboard, Soup, Store, LogOut, Layers, TriangleAlert, ChefHat, Menu, X, Clock } from "lucide-react";
import { condition, productImage } from "./data";
import type { BakerCommand, BakerResult, BakerSnapshot } from "../../lib/baker-types";
import { saveBakerAction } from "./actions";
import UsageForm from "./UsageForm";

type BakerState = BakerSnapshot & {
 pending: boolean; save: (c: BakerCommand)=>Promise<BakerResult>;
 query: string; setQuery: React.Dispatch<React.SetStateAction<string>>;
 recent: string[]; setRecent: React.Dispatch<React.SetStateAction<string[]>>;
};
const BakerContext = createContext<BakerState | null>(null);
export function useBaker() { const state = useContext(BakerContext); if (!state) throw new Error("Baker provider missing"); return state; }
const nav = [
 {label:"Dashboard",href:"/baker",icon:LayoutDashboard},
 {label:"Cari Stok Bahan",href:"/baker/stok-bahan",icon:Search},
 {label:"Pemakaian Bahan",href:"/baker/pemakaian-bahan",icon:Soup},
 {label:"Tentang Alana",href:"/baker/tentang-alana",icon:Store},
];
export function Badge({children, tone}:{children:React.ReactNode;tone?:string}) {
 const text = String(children);
 return <span className={"b-badge "+(tone ?? (/Kritis|Kurang|kurang/.test(text)?"red":/Aman|Cukup|cukup/.test(text)?"green":"amber"))}>{children}</span>;
}
function Asset({name,alt,size=88}:{name:string;alt:string;size?:number}) { return <Image unoptimized className="b-asset" src={"/baker/"+name+".png"} alt={alt} width={size} height={size} />; }
function Dialog({onClose,children}:{onClose:()=>void;children:React.ReactNode}) {
 const ref = useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const previous = document.activeElement as HTMLElement | null;
  const focusables = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button, a, input, [tabindex="0"]') ?? []);
  focusables()[0]?.focus();
  const handler = (event:KeyboardEvent) => {
   if(event.key==="Escape") onClose();
   if(event.key==="Tab") { const items=focusables(); const first=items[0],last=items.at(-1); if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();} else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();} }
  };
  document.addEventListener("keydown",handler);
  return ()=>{document.removeEventListener("keydown",handler);previous?.focus();};
 },[onClose]);
 return <div className="b-modal-backdrop" onClick={onClose}><div ref={ref} className="b-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title" onClick={e=>e.stopPropagation()}>{children}</div></div>;
}
export default function BakerClient({children,initialData}:{children:React.ReactNode;initialData:BakerSnapshot}) {
 const pathname=usePathname(); const router=useRouter();
 const [cache,setCache]=useState({source:initialData,data:initialData});
 const data=cache.source===initialData?cache.data:initialData;
 const {materials}=data;const low=materials.filter(m=>m.stock<m.minimum||m.stock<=0);
 const [pending,setPending]=useState(false);const saving=useRef(false);
 async function save(c:BakerCommand):Promise<BakerResult>{if(saving.current)return {ok:false,message:"Penyimpanan masih berlangsung."};saving.current=true;setPending(true);try{const result=await saveBakerAction(c);if(result.ok)setCache({source:initialData,data:result.data});return result;}catch{return {ok:false,message:"Koneksi terputus. Muat ulang untuk memastikan hasil sebelum mencoba lagi."};}finally{saving.current=false;setPending(false);}}
 const [query,setQuery]=useState("");
 const [recent,setRecent]=useState<string[]>([]);
 const [mobile,setMobile]=useState(false); const [notifications,setNotifications]=useState(false);
 const [read,setRead]=useState(false); const [logout,setLogout]=useState(false);
 const current=nav.find(n=>n.href===pathname);
 const HeaderIcon=current?.icon ?? Search;
 const notificationRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(notifications) notificationRef.current?.querySelector<HTMLButtonElement>("button")?.focus();},[notifications]);
 function goSearch(value:string) { if(!value.trim())return; setQuery(value);setRecent(r=>[value,...r.filter(s=>s!==value)].slice(0,5));setNotifications(false);setMobile(false);router.push("/baker/pencarian?q="+encodeURIComponent(value.trim())); }
 return <BakerContext.Provider value={{...data,pending,save,query,setQuery,recent,setRecent}}>
 <div className="baker-app">
  {mobile&&<button className="b-mobile-shade" aria-label="Tutup menu" onClick={()=>setMobile(false)}/>}
  <aside className={"b-sidebar "+(mobile?"is-open":"")}>
   <Link href="/baker" className="b-brand" onClick={()=>setMobile(false)}><Asset name="logo" alt="Logo Alana Pâtisserie" size={44}/><span><strong>Alana</strong><small>PÂTISSERIE</small></span></Link>
   <nav aria-label="Navigasi Baker">{nav.slice(0,3).map(n=><Link key={n.href} href={n.href} aria-current={pathname===n.href?"page":undefined} className={pathname===n.href?"active":""} onClick={()=>{setMobile(false);setNotifications(false);}}><n.icon size={18}/>{n.label}</Link>)}</nav>
   <div className="b-sidebar-bottom"><Link href={nav[3].href} className={pathname===nav[3].href?"active":""} onClick={()=>{setMobile(false);setNotifications(false);}}><Store size={18}/>Tentang Alana</Link>
   <div className="b-profile"><span className="b-avatar">B</span><span><strong>Baker/Barista</strong><small>Produksi</small></span><button aria-label="Keluar" title="Keluar" onClick={()=>{setLogout(true);setMobile(false);setNotifications(false);}}><LogOut size={18}/></button></div></div>
  </aside>
  <div className="b-workspace">
   <header className="b-header"><button className="b-menu-toggle" aria-label="Buka menu" onClick={()=>setMobile(true)}><Menu/></button><h1><HeaderIcon size={24}/>{current?.label??"Pencarian"}</h1>
    <form className="b-global-search" onSubmit={e=>{e.preventDefault();goSearch(query);}}><Search size={17}/><input aria-label="Pencarian global" placeholder="Cari barang, transaksi..." value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="Hapus pencarian" onClick={()=>setQuery("")}><X size={18}/></button>}</form>
    <button className={"b-bell "+(notifications?"selected":"")} aria-label="Notifikasi" aria-expanded={notifications} onClick={()=>setNotifications(v=>!v)}><Bell size={21}/>{!read&&low.length>0&&<span>{low.length}</span>}</button>
    <div className="b-date"><strong>{data.today}</strong><small>Asia/Jakarta</small></div>
   </header>
   <main className="b-content"><Suspense fallback={<p>Memuat...</p>}>{children}</Suspense></main>
  </div>
  {notifications&&<><button className="b-notification-shade" aria-label="Tutup notifikasi" onClick={()=>setNotifications(false)}/><div ref={notificationRef} className="b-notifications" role="dialog" aria-label="Notifikasi" onKeyDown={e=>{if(e.key==="Escape")setNotifications(false);}}><div className="b-notification-heading"><h2>Notifikasi <Badge tone="red">{(read?0:low.length)+" baru"}</Badge></h2><button onClick={()=>setRead(true)}>Tandai dibaca</button></div>{low.map(m=><Link key={m.id} href={"/baker/stok-bahan?bahan="+m.id} onClick={()=>setNotifications(false)}><span className={"b-notice-dot "+(read?"read":condition(m)==="Menipis"?"amber":"red")}/><span><strong>{m.name} {condition(m).toLowerCase()}</strong><small>Sisa {m.stock} {m.unit}, minimum {m.minimum} {m.unit}</small></span><time>Data terkini</time></Link>)}{!low.length&&<p>Tidak ada bahan menipis.</p>}<Link className="b-all-notifications" href="/baker/stok-bahan?filter=menipis" onClick={()=>setNotifications(false)}>Lihat semua notifikasi</Link></div></>}
  {logout&&<Dialog onClose={()=>setLogout(false)}><span className="b-logout-icon"><LogOut size={25}/></span><h2 id="logout-title">Yakin ingin keluar?</h2><p>Anda akan keluar dari akun Baker/Barista<br/>dan kembali ke halaman login.</p><div className="b-dialog-actions"><button className="b-outline" onClick={()=>setLogout(false)}>Batal</button><LogoutLink className="b-primary" onBeforeLogout={()=>setLogout(false)}>Ya, keluar</LogoutLink></div></Dialog>}
 </div>
 </BakerContext.Provider>;
}
export function ProductionTable({detailed=false}:{detailed?:boolean}) {
 const {history}=useBaker();
 return <div className={"b-table-wrap "+(detailed?"b-detailed-history":"")}><table><thead><tr><th>Tanggal</th><th>Produk</th><th>Hasil</th>{detailed&&<><th>Bahan Terpakai</th><th>Status / Pencatat</th></>}</tr></thead><tbody>{history.slice(0,detailed?50:4).map(h=><tr key={h.id}><td><strong>{h.date}</strong></td><td>{h.product}</td><td>{h.quantity} {h.unit}{h.status==="Gagal"?" (Gagal)":""}</td>{detailed&&<><td>{h.used.map(u=>u.name+" "+u.quantity+" "+u.unit+" ("+u.batchId+")").join(", ")}</td><td>{h.status} / {h.actor}{h.reason?" / "+h.reason:""}</td></>}</tr>)}</tbody></table>{!history.length&&<p className="b-message amber">Belum ada riwayat pemakaian.</p>}</div>;
}
export function ProductAsset({name,size=88}:{name:string;size?:number}){const image=productImage(name);return image?<Asset name={image} alt={name} size={size}/>:<span className="b-asset" aria-label={name}><ChefHat size={size/2}/></span>;}
export function Dashboard() {
 const {materials,products,history,today}=useBaker();
 return <>
  <div className="b-intro b-dashboard-intro"><div><h2>Ringkasan Produksi</h2><p>Pantau bahan dan produk jadi, lalu catat produksi dari satu tempat.</p></div><Image unoptimized className="b-banner" src="/baker/banner.png" alt="Ilustrasi pastry dan gandum" width={320} height={84}/></div>
  <section className="b-stats" aria-label="Ringkasan produksi"><Link href="/baker/stok-bahan"><span>Bahan Tersedia</span><Layers size={19}/><strong>{materials.length}</strong></Link><Link className="b-low-stat" href="/baker/stok-bahan?filter=menipis"><span>Bahan Menipis</span><TriangleAlert size={19}/><strong>{materials.filter(m=>m.stock<m.minimum||m.stock<=0).length}</strong><Badge>Cek</Badge></Link><Link href="/baker/pemakaian-bahan"><span>Produksi Hari Ini</span><ChefHat size={19}/><strong>{history.filter(h=>h.date===today).length} batch</strong></Link></section>
  <section className="b-products-section"><h3>Produk Jadi</h3><div className="b-dashboard-products">{products.map(p=><Link href={"/baker/pemakaian-bahan?produk="+p.id} className="b-product b-compact" key={p.id}><ProductAsset name={p.name}/><div><small>{p.id}</small><strong>{p.name}</strong><p>{p.category}</p><Badge tone={p.stock>p.minimum?"green":"amber"}>Stok: {p.stock} {p.unit}</Badge></div></Link>)}</div>{!products.length&&<p>Belum ada Produk Hasil di database.</p>}</section>
  <div className="b-columns"><section><h3>Bahan Menipis</h3><div className="b-table-wrap"><table><thead><tr><th>Bahan</th><th>Stok</th><th>Kondisi</th></tr></thead><tbody>{materials.filter(m=>m.stock<m.minimum||m.stock<=0).slice(0,4).map(m=><tr key={m.id}><td><Link href={"/baker/stok-bahan?bahan="+m.id}><strong>{m.name}</strong></Link></td><td>{m.stock} {m.unit}</td><td><Badge>{condition(m)}</Badge></td></tr>)}</tbody></table></div></section><section><h3>Produksi Terakhir</h3><ProductionTable/></section></div>
 </>;
}
export function StockPage() { const params=useSearchParams(); return <StockContent key={params.toString()}/>; }
function StockContent() {
 const params=useSearchParams(); const router=useRouter(); const {materials}=useBaker();
 const initial=params.get("bahan"); const chosen=materials.find(m=>m.id===initial);
 const [input,setInput]=useState(chosen?.name??""); const [term,setTerm]=useState(chosen?.name??"");
 const [category,setCategory]=useState("Semua"); const [selected,setSelected]=useState<string|null>(initial);
 const low=params.get("filter")==="menipis"; const [onlyLow,setOnlyLow]=useState(low);
 const rows=materials.filter(m=>(category==="Semua"||m.category===category)&&(!onlyLow||(m.stock<m.minimum||m.stock<=0))&&m.name.toLowerCase().includes(term.toLowerCase()));
 const detail=materials.find(m=>m.id===selected);
 const defaults=materials.filter(m=>category==="Semua"||m.category===category);
 return <><div className="b-intro"><h2>Cari Stok Bahan</h2><p>Masukkan nama bahan, lalu lihat jumlah dan kondisinya.</p><button className="b-outline" onClick={()=>router.refresh()}>Perbarui Data</button></div><div className="b-columns">
  <section><form className="b-stock-search" onSubmit={e=>{e.preventDefault();setTerm(input.trim());setSelected(null);}}><label><Search size={21}/><input aria-label="Nama bahan" placeholder="Masukkan nama bahan..." value={input} onChange={e=>setInput(e.target.value)}/></label><button className="b-primary">Cari</button></form>
  {term&&rows.length===0&&<p className="b-message amber" role="status">Barang tidak ditemukan. Coba nama bahan lain.</p>}
  {!(term&&rows.length===0)&&<div className="b-categories">{["Semua",...new Set(materials.map(m=>m.category))].map(c=><button key={c} className={category===c?"active":""} onClick={()=>setCategory(c)}>{c}</button>)}</div>}
  {onlyLow&&<button className="b-filter-clear" onClick={()=>setOnlyLow(false)}>Bahan menipis <X size={14}/> Hapus filter</button>}
  <div className="b-table-wrap"><table><thead><tr><th>Bahan</th><th>Kategori</th><th>Jumlah</th><th>Kondisi</th></tr></thead><tbody>{(term&&!rows.length?defaults:term||onlyLow||category!=="Semua"?rows:defaults).map(m=><tr className={selected===m.id?"selected":""} key={m.id}><td><button className="b-material-button" onClick={()=>setSelected(m.id)}>{m.name}</button></td><td>{m.category}</td><td>{m.stock} {m.unit}</td><td><Badge>{condition(m)}</Badge></td></tr>)}</tbody></table></div>
  {!rows.length&&category!=="Semua"&&<p className="b-message amber">Belum ada bahan pada kategori ini.</p>}
  </section><aside className="b-panel b-stock-panel"><h3>{detail?"Detail Bahan — "+detail.name:term&&!rows.length?"Saran Pencarian":"Pilihan Bahan"}</h3>{detail?<dl>{[["Jumlah",detail.stock+" "+detail.unit],["Kondisi",condition(detail)],["Batas minimum",detail.minimum+" "+detail.unit],["Terakhir masuk",detail.received||"Belum ada"],["Pemasok",detail.supplier],["Tanggal batch terdekat (historis)",detail.expiry||"Belum diisi"]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>:materials.slice(0,6).map(m=><button className="b-frequent" key={m.id} onClick={()=>{setInput(m.name);setTerm(m.name);setSelected(m.id);setCategory("Semua");setOnlyLow(false);}}><span>{m.name}</span><strong>{m.stock} {m.unit}</strong></button>)}</aside>
 </div></>;
}
export function ProductionPage(){return <UsageForm/>;}
export function AboutPage() {
 return <div className="b-about"><section className="b-about-top"><div><small>TENTANG USAHA</small><h2>Alana Patisserie</h2><p>Usaha roti, kue, dan minuman yang menjaga satu hal di setiap dapurnya: bahan yang segar dan rasa yang konsisten. Sistem persediaan ini membantu seluruh tim memastikan keduanya.</p></div><Image unoptimized src="/baker/about.png" alt="Ilustrasi roti, croissant, cupcake dan gandum" width={472} height={176}/></section><section className="b-vision"><div><h3>Visi</h3><p>Menjadi usaha bakery pilihan masyarakat yang menghadirkan roti dan kue segar berkualitas, dengan pengelolaan bahan yang tertib dan minim terbuang.</p></div><div><h3>Misi</h3><ol>{["Membuat roti, kue, dan minuman dari bahan pilihan yang segar.","Menjaga rasa dan kualitas tetap konsisten di setiap produk.","Mengelola persediaan agar tidak kurang dan tidak terbuang.","Melayani pelanggan dengan ramah, cepat, dan jujur."].map(m=><li key={m}>{m}</li>)}</ol></div></section><section className="b-about-info"><div><small>PRODUK</small><p>Roti dan pastry</p><p>Kue dan dessert</p><p>Kopi, teh, minuman dingin</p></div><div><small>JAM BUKA</small><p>Senin – Jumat <strong>07.00 – 20.00</strong></p><p>Sabtu <strong>07.00 – 21.00</strong></p><p>Minggu <strong>08.00 – 18.00</strong></p></div><div><small>KONTAK</small><p>Jl. Dr Moh Hatta no 72</p><p>Padang, Sumatera Barat</p><p>@alanapatisseriee</p></div></section><footer>Alana Patisserie · Sistem Informasi Persediaan Bahan Baku, Kue, Roti, dan Minuman</footer></div>;
}
export function SearchPage() {
 const {query,setQuery,materials,products,recent,setRecent}=useBaker();
 const params=useSearchParams();const router=useRouter();const shownQuery=params.get("q")??query;
 const [tab,setTab]=useState("Semua");const term=shownQuery.trim().toLowerCase();
 const foundMaterials=term?materials.filter(m=>m.name.toLowerCase().includes(term)):[];
 const foundProducts=term?products.filter(p=>p.name.toLowerCase().includes(term)):[];
 return <div className="b-search-columns"><section><h2 className="b-search-heading">{term?'Hasil untuk “'+shownQuery+'”':"Pencarian"}</h2><p className="b-search-count">{foundMaterials.length+foundProducts.length} hasil ditemukan</p><div className="b-search-tabs">{["Semua","Bahan","Pemakaian"].map((t,i)=><button className={tab===t?"active":""} key={t} onClick={()=>setTab(t)}>{t}<span>{[foundMaterials.length+foundProducts.length,foundMaterials.length,foundProducts.length][i]}</span></button>)}</div>
 {(tab==="Semua"||tab==="Bahan")&&foundMaterials.length>0&&<section className="b-search-group"><h3>BAHAN</h3>{foundMaterials.map(m=><Link className="b-search-result" key={m.id} href={"/baker/stok-bahan?bahan="+m.id}><span className="b-result-icon"><Layers size={20}/></span><span><strong>{m.name}</strong><small>Stok {m.stock} {m.unit} · minimum {m.minimum} {m.unit}</small></span><Badge>{condition(m)}</Badge><b>Lihat</b></Link>)}</section>}
 {(tab==="Semua"||tab==="Pemakaian")&&foundProducts.length>0&&<section className="b-search-group"><h3>PEMAKAIAN</h3>{foundProducts.map(p=><Link className="b-search-result" key={p.id} href={"/baker/pemakaian-bahan?produk="+p.id}><span className="b-result-icon"><Soup size={20}/></span><span><strong>{p.name}</strong><small>Produk hasil: stok {p.stock} {p.unit}</small></span><b>Lihat</b></Link>)}</section>}
 {(!term||(tab==="Bahan"?foundMaterials.length===0:tab==="Pemakaian"?foundProducts.length===0:!foundMaterials.length&&!foundProducts.length))&&<p className="b-message amber">{term?"Tidak ada hasil. Coba kata kunci lain.":"Masukkan kata kunci pada pencarian di header."}</p>}
 </section><aside className="b-panel b-recent"><div><h3>Pencarian terakhir</h3><button onClick={()=>setRecent([])}>Hapus semua</button></div>{recent.map(r=><div className="b-recent-row" key={r}><button onClick={()=>{setQuery(r);router.push("/baker/pencarian?q="+encodeURIComponent(r));}}><Clock size={16}/>{r}</button><button aria-label={"Hapus "+r} onClick={()=>setRecent(items=>items.filter(i=>i!==r))}><X size={16}/></button></div>)}{!recent.length&&<p>Belum ada pencarian terakhir.</p>}</aside></div>;
}

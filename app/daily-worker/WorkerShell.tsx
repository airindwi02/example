"use client";
import LogoutLink from "../_auth/LogoutLink";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Box, CalendarClock, ClipboardCheck, Layers, LayoutDashboard, LogOut, Menu, Search, SlidersHorizontal, Store, X } from "lucide-react";
import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { daysUntil } from "./data";
import { useWorker, WorkerProvider } from "./WorkerState";
import { Status } from "./ui";

export const workerNavigation=[
 {label:"Dashboard",href:"/daily-worker",icon:LayoutDashboard},
 {label:"Penerimaan",href:"/daily-worker/penerimaan",icon:Box},
 {label:"Stok Barang",href:"/daily-worker/stok-barang",icon:Layers},
 {label:"Kadaluwarsa",href:"/daily-worker/kadaluwarsa",icon:CalendarClock},
 {label:"Pemeriksaan",href:"/daily-worker/pemeriksaan",icon:ClipboardCheck},
 {label:"Penyesuaian",href:"/daily-worker/penyesuaian",icon:SlidersHorizontal},
 {label:"Tentang Alana",href:"/daily-worker/tentang-alana",icon:Store},
];
type SearchState={recent:string[];setRecent:React.Dispatch<React.SetStateAction<string[]>>;search:(s:string)=>void};
const SearchContext=createContext<SearchState|null>(null);
export function useWorkerSearch(){const context=useContext(SearchContext);if(!context)throw new Error("Search provider missing");return context;}

function GlobalSearch(){
 const params=useSearchParams();const initial=params.get("q")??"";
 return <SearchField key={initial} initial={initial}/>;
}
function SearchField({initial}:{initial:string}){
 const [query,setQuery]=useState(initial);const {search}=useWorkerSearch();
 return <form className="w-global-search" onSubmit={e=>{e.preventDefault();search(query);}}><button type="submit" aria-label="Cari global"><Search size={18}/></button><input aria-label="Pencarian global" value={query} placeholder="Cari barang, transaksi..." onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="Hapus pencarian global" onClick={()=>setQuery("")}><X size={19}/></button>}</form>;
}
function LogoutDialog({close}:{close:()=>void}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const getButtons=()=>Array.from(ref.current?.querySelectorAll<HTMLElement>("button,a")??[]);
  getButtons()[0]?.focus();
  const onKey=(e:KeyboardEvent)=>{
   if(e.key==="Escape")close();
   if(e.key==="Tab"){const buttons=getButtons();const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  };
  document.addEventListener("keydown",onKey);
  return ()=>{document.removeEventListener("keydown",onKey);previous?.focus();};
 },[close]);
 return <div className="w-modal-shade" onClick={close}><div ref={ref} className="w-logout-dialog" role="dialog" aria-modal="true" aria-labelledby="worker-logout-title" onClick={e=>e.stopPropagation()}><span className="w-logout-icon"><LogOut size={25}/></span><h2 id="worker-logout-title">Yakin ingin keluar?</h2><p>Anda akan keluar dari akun Daily Worker<br/>dan kembali ke halaman login.</p><div className="w-dialog-actions"><button className="w-outline" onClick={close}>Batal</button><LogoutLink className="w-primary" onBeforeLogout={close}>Ya, keluar</LogoutLink></div></div></div>;
}
function Shell({children}:{children:React.ReactNode}){
 const pathname=usePathname(),router=useRouter();const {state}=useWorker();
 const [mobile,setMobile]=useState(false),[notification,setNotification]=useState(false),[read,setRead]=useState(false),[logout,setLogout]=useState(false);
 const [recent,setRecent]=useState<string[]>([]);
 const closeLogout=useCallback(()=>setLogout(false),[]);
 const notificationRef=useRef<HTMLDivElement>(null),bellRef=useRef<HTMLButtonElement>(null);
 const active=workerNavigation.find(n=>n.href===pathname);const Icon=active?.icon??Search;
 const expired=state.batches.filter(b=>b.jumlah_diterima>0&&daysUntil(b.tanggal_kedaluwarsa)<0).length;
 const soon=state.batches.filter(b=>b.jumlah_diterima>0&&daysUntil(b.tanggal_kedaluwarsa)>=0&&daysUntil(b.tanggal_kedaluwarsa)<=7).length;
 const notices=[
  {count:expired,title:expired+" batch melewati kadaluwarsa",description:"Periksa riwayat batch dan stok fisik",time:"Data terkini",href:"/daily-worker/kadaluwarsa?filter=kadaluwarsa",tone:"red"},
  {count:soon,title:soon+" batch kadaluwarsa ≤ 7 hari",description:"Prioritaskan pemakaiannya",time:"Data terkini",href:"/daily-worker/kadaluwarsa?filter=segera",tone:"amber"},
  {count:state.items.filter(b=>b.ui.perlu_cek).length,title:"Pemeriksaan stok menunggu",description:state.items.filter(b=>b.ui.perlu_cek).length+" barang belum dihitung",time:"Data terkini",href:"/daily-worker/pemeriksaan",tone:"green"}
 ];
 useEffect(()=>{if(notification)notificationRef.current?.querySelector<HTMLButtonElement>("button")?.focus();},[notification]);
 function closeNotification(){setNotification(false);bellRef.current?.focus();}
 function search(value:string){if(!value.trim())return;setRecent(r=>[value,...r.filter(v=>v!==value)].slice(0,5));setNotification(false);setMobile(false);router.push("/daily-worker/pencarian?q="+encodeURIComponent(value.trim()));}
 function navigate(){setMobile(false);setNotification(false);}
 return <SearchContext.Provider value={{recent,setRecent,search}}><div className="worker-app">
  {mobile&&<button className="w-mobile-shade" aria-label="Tutup menu" onClick={()=>setMobile(false)}/>}
  <aside className={"w-sidebar "+(mobile?"is-open":"")}>
   <Link className="w-brand" href="/daily-worker" onClick={navigate}><Image unoptimized src="/daily-worker/logo.png" alt="Logo ALANA PÂTISSERIE" width={44} height={44}/><span><strong>Alana</strong><small>PÂTISSERIE</small></span></Link>
   <nav aria-label="Navigasi Daily Worker">{workerNavigation.slice(0,6).map(n=><Link href={n.href} key={n.href} onClick={navigate} className={pathname===n.href?"active":""} aria-current={pathname===n.href?"page":undefined}><n.icon size={19}/>{n.label}</Link>)}</nav>
   <div className="w-sidebar-bottom"><Link href="/daily-worker/tentang-alana" onClick={navigate} className={pathname==="/daily-worker/tentang-alana"?"active":""}><Store size={19}/>Tentang Alana</Link><div className="w-profile"><span className="w-avatar">D</span><span><strong>Daily Worker</strong><small>Staf harian</small></span><button aria-label="Keluar" title="Keluar" onClick={()=>{setLogout(true);navigate();}}><LogOut size={19}/></button></div></div>
  </aside>
  <div className="w-workspace"><header className="w-header">
   <button className="w-menu-toggle" aria-label="Buka menu" aria-expanded={mobile} onClick={()=>setMobile(true)}><Menu size={22}/></button>
   <h1><Icon size={25}/>{active?.label??"Pencarian"}</h1>
   <Suspense fallback={<div className="w-global-search"/>}><GlobalSearch/></Suspense>
   <button ref={bellRef} className={"w-bell "+(notification?"selected":"")} aria-label="Notifikasi" aria-expanded={notification} onClick={()=>setNotification(n=>!n)}><Bell size={21}/>{!read&&notices.length>0&&<span>{notices.length}</span>}</button>
   <div className="w-date"><strong>{state.today}</strong><small>Asia/Jakarta</small></div>
  </header><main className="w-content"><Suspense fallback={<p>Memuat halaman...</p>}>{children}</Suspense></main></div>
  {notification&&<><button className="w-notification-shade" aria-label="Tutup notifikasi" onClick={closeNotification}/><section ref={notificationRef} className="w-notifications" role="dialog" aria-label="Notifikasi" onKeyDown={e=>{if(e.key==="Escape")closeNotification();}}><div className="w-notification-heading"><h2>Notifikasi <Status tone="red">{(read?0:notices.length)+" baru"}</Status></h2><button onClick={()=>setRead(true)}>Tandai dibaca</button></div>{notices.map(n=><Link key={n.title} href={n.href} onClick={navigate}><span className={"w-notice-dot "+(read?"read":n.tone)}/><span><strong>{n.title}</strong><small>{n.description}</small></span><time>{n.time}</time></Link>)}<Link className="w-all-notifications" href="/daily-worker/kadaluwarsa" onClick={navigate}>Lihat semua notifikasi</Link></section></>}
  {logout&&<LogoutDialog close={closeLogout}/>}
 </div></SearchContext.Provider>;
}
export default function WorkerShell({children,initialData}:{children:React.ReactNode;initialData:import("../../lib/worker-types").WorkerSnapshot}){
 return <WorkerProvider initialData={initialData}><Shell>{children}</Shell></WorkerProvider>;
}

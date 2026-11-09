"use client";
import Link from "next/link";
import { CalendarClock, Clock, Download, Layers, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { daysUntil, displayDate, stockStatus } from "./data";
import { useWorker } from "./WorkerState";
import { useWorkerSearch } from "./WorkerShell";
import { Message, Status } from "./ui";
export default function SearchPage(){const params=useSearchParams();return <SearchContent key={params.get("q")??""} query={params.get("q")??""}/>;}
function SearchContent({query}:{query:string}){
 const {state}=useWorker();const {recent,setRecent,search}=useWorkerSearch();const [tab,setTab]=useState("Semua");
 const term=query.trim().toLocaleLowerCase("id-ID");
 const items=term?state.items.filter(b=>b.nama_barang.toLocaleLowerCase("id-ID").includes(term)):[];
 const ids=new Set(items.map(b=>b.id_barang));
 const receipts=term?state.receipts.filter(r=>ids.has(r.id_barang)):[];
 const batches=term?state.batches.filter(b=>ids.has(b.id_barang)&&b.jumlah_diterima>0):[];
 const historyCount=receipts.length+batches.length;
 const resultCount=items.length+historyCount;
 return <div className="w-search-columns"><section><h2 className="w-search-heading">{term?'Hasil untuk “'+query+'”':"Pencarian"}</h2><p className="w-search-count">{resultCount} hasil ditemukan</p>
 <div className="w-search-tabs">{["Semua","Bahan","Riwayat"].map((t,i)=><button className={tab===t?"active":""} key={t} onClick={()=>setTab(t)}>{t}<span>{[resultCount,items.length,historyCount][i]}</span></button>)}</div>
 {(tab==="Semua"||tab==="Bahan")&&!!items.length&&<section className="w-search-group"><h3>BAHAN</h3>{items.map(b=><Link className="w-search-result" key={b.id_barang} href={"/daily-worker/stok-barang?barang="+b.id_barang}><span className="w-result-icon"><Layers size={20}/></span><span><strong>{b.nama_barang}</strong><small>Stok {b.stok_saat_ini} {b.satuan} · minimum {b.stok_minimum} {b.satuan}</small></span><Status>{stockStatus(b)}</Status><b>Lihat</b></Link>)}</section>}
 {(tab==="Semua"||tab==="Riwayat")&&historyCount>0&&<section className="w-search-group"><h3>RIWAYAT</h3><div className="w-search-history">{receipts.map(r=>{const b=state.items.find(b=>b.id_barang===r.id_barang)!;return <Link className="w-search-result" key={r.id_penerimaan+":"+r.id_barang} href={"/daily-worker/penerimaan?barang="+r.id_barang}><span className="w-result-icon"><Download size={20}/></span><span><strong>Penerimaan · <em>{b.nama_barang}</em></strong><small>{displayDate(r.tanggal_terima)} · {r.jumlah_diterima} {b.satuan}</small></span><b>Lihat</b></Link>;})}
 {batches.map(batch=>{const b=state.items.find(b=>b.id_barang===batch.id_barang)!;const days=daysUntil(batch.tanggal_kedaluwarsa);return <Link className="w-search-result" key={batch.id_detail_masuk} href={"/daily-worker/kadaluwarsa?barang="+b.id_barang}><span className="w-result-icon"><CalendarClock size={20}/></span><span><strong>Kadaluwarsa · <em>{b.nama_barang}</em></strong><small>Kadaluwarsa {displayDate(batch.tanggal_kedaluwarsa)}</small></span><Status tone={days<0?"red":days<=7?"amber":"green"}>{!batch.tanggal_kedaluwarsa?"Belum diisi":days<0?"Kadaluwarsa":days<=7?"Segera":"Terjadwal"}</Status><b>Lihat</b></Link>;})}</div></section>}
 {(!term||(tab==="Bahan"?items.length===0:tab==="Riwayat"?historyCount===0:resultCount===0))&&<div className="w-search-empty"><Message>{term?"Tidak ada hasil. Coba kata kunci lain.":"Masukkan kata kunci pada pencarian di header."}</Message></div>}
 </section><aside className="w-panel w-recent"><div className="w-recent-heading"><h3>Pencarian terakhir</h3><button onClick={()=>setRecent([])}>Hapus semua</button></div>{recent.map(r=><div className="w-recent-row" key={r}><button onClick={()=>search(r)}><Clock size={16}/>{r}</button><button aria-label={"Hapus "+r} onClick={()=>setRecent(items=>items.filter(i=>i!==r))}><X size={16}/></button></div>)}{!recent.length&&<p className="w-muted">Belum ada pencarian terakhir.</p>}</aside></div>;
}
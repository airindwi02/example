"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Box, CalendarClock } from "lucide-react";
import { daysUntil, displayDate, type Barang, type Batch } from "./data";
import { useWorker } from "./WorkerState";
import { EmptyPanel, Intro, Message, QuantityInput, Status } from "./ui";

export default function ExpiryPage(){const params=useSearchParams();return <ExpiryContent key={params.toString()} initial={params.get("barang")??""} initialFilter={params.get("filter")??""}/>;}
function ExpiryContent({initial,initialFilter}:{initial:string;initialFilter:string}){
 const {state}=useWorker();
 const [filter,setFilter]=useState(initialFilter==="segera"?"Segera":initialFilter==="kadaluwarsa"?"Kadaluwarsa":"Semua");
 const [selected,setSelected]=useState(state.batches.find(b=>b.id_barang===initial)?.id_detail_masuk??"");
 const [selectionVersion,setSelectionVersion]=useState(0);
 const [success,setSuccess]=useState("");
 function selectItem(id:string){setSelected(id);setSelectionVersion(v=>v+1);setSuccess("");}
 const activeBatches=state.batches.filter(b=>b.jumlah_diterima>0);
 const expired=activeBatches.filter(b=>daysUntil(b.tanggal_kedaluwarsa)<0);
 const soon=activeBatches.filter(b=>daysUntil(b.tanggal_kedaluwarsa)>=0&&daysUntil(b.tanggal_kedaluwarsa)<=7);
 const warnings=[...expired,...soon];
 const shown=warnings.filter(b=>filter==="Semua"||(filter==="Kadaluwarsa"?daysUntil(b.tanggal_kedaluwarsa)<0:daysUntil(b.tanggal_kedaluwarsa)>=0));
 const batch=state.batches.find(b=>b.id_detail_masuk===selected);
 const item=state.items.find(b=>b.id_barang===batch?.id_barang);
 const empty=!warnings.length&&filter!=="Segera";
 const upcoming=activeBatches.filter(b=>daysUntil(b.tanggal_kedaluwarsa)>=0&&daysUntil(b.tanggal_kedaluwarsa)<=30);
 return <><Intro title="Peringatan Kadaluwarsa">Pantau tanggal batch penerimaan. Pembuangan per batch belum tersedia dalam schema.</Intro>
 {empty?<><EmptyPanel title="Tidak ada peringatan kadaluwarsa" className="w-expiry-empty">Tidak ada bahan yang melewati tanggal kadaluwarsa.</EmptyPanel><section className="w-upcoming"><h3>Akan Kadaluwarsa dalam 30 Hari</h3><div className="w-table-wrap"><table><thead><tr><th>Bahan</th><th>Diterima Historis</th><th>Tgl Kadaluwarsa</th><th>Sisa Hari</th><th>Status</th></tr></thead><tbody>{upcoming.map(b=>{const i=state.items.find(i=>i.id_barang===b.id_barang)!;return <tr key={b.id_detail_masuk}><td><strong>{i.nama_barang}</strong></td><td>{b.jumlah_diterima} {i.satuan}</td><td>{displayDate(b.tanggal_kedaluwarsa)}</td><td>{daysUntil(b.tanggal_kedaluwarsa)} hari lagi</td><td><Status tone="blue">Pantau</Status></td></tr>;})}</tbody></table>{!upcoming.length&&<p className="w-no-results">Tidak ada bahan yang akan kadaluwarsa dalam 30 hari.</p>}</div></section>{success&&<div className="w-expiry-final-message"><Message tone="green">{success}</Message></div>}</>:<>
 <section className="w-stats" aria-label="Ringkasan kadaluwarsa"><button className="red" onClick={()=>setFilter("Kadaluwarsa")}><span>Sudah Kadaluwarsa</span><CalendarClock size={19}/><strong>{expired.length}</strong><Status tone="red">Tindak</Status></button><button className="amber" onClick={()=>setFilter("Segera")}><span>Segera Kadaluwarsa</span><CalendarClock size={19}/><strong>{soon.length}</strong><Status>≤ 7 hari</Status></button><div className="w-stat-card"><span>Tanpa Peringatan</span><Box size={19}/><strong>{state.items.length-new Set(warnings.map(b=>b.id_barang)).size}</strong></div></section>
 <div className="w-columns w-expiry-columns"><section><div className="w-filters" aria-label="Filter kadaluwarsa">{["Semua","Kadaluwarsa","Segera"].map(f=><button key={f} className={filter===f?"active":""} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}</button>)}</div>
 <div className="w-table-wrap w-expiry-table"><table><thead><tr><th>Bahan</th><th>Diterima Historis</th><th>Tgl Kad.</th><th>Keterangan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{shown.map(b=>{const i=state.items.find(i=>i.id_barang===b.id_barang)!;const days=daysUntil(b.tanggal_kedaluwarsa);return <tr key={b.id_detail_masuk} className={selected===b.id_detail_masuk?"selected":""} onClick={()=>{selectItem(b.id_detail_masuk);}}><td><button className="w-row-button" onClick={()=>{selectItem(b.id_detail_masuk);}}>{i.nama_barang}</button></td><td>{b.jumlah_diterima} {i.satuan}</td><td>{displayDate(b.tanggal_kedaluwarsa)}</td><td>{Math.abs(days)} hari {days<0?"lewat":"lagi"}</td><td><Status tone={days<0?"red":"amber"}>{days<0?"Kadaluwarsa":"Segera"}</Status></td><td><button className="w-text-link" aria-label={"Tindak "+i.nama_barang} onClick={()=>{selectItem(b.id_detail_masuk);}}>Tindak</button></td></tr>;})}</tbody></table>{!shown.length&&<p className="w-no-results">Tidak ada bahan pada kondisi ini.</p>}</div>
 <div className="w-expiry-message">{success?<Message tone="green">{success}</Message>:<Message>{selected?"Pilih baris untuk melihat riwayat batch.":"Pilih baris untuk melihat informasi batch di panel kanan."}</Message>}</div></section>
 {batch&&item?<ExpiryForm key={selected+selectionVersion} item={item} batch={batch}/>:<EmptyPanel title="Pilih bahan" className="w-expiry-panel">Klik “Tindak” untuk melihat informasi batch.</EmptyPanel>}
 </div></>}
 </>;
}
function ExpiryForm({item,batch}:{item:Barang;batch:Batch}){
 return <aside className="w-panel w-expiry-panel"><h3>Info Batch - {item.nama_barang}</h3><Message tone="cream">Jumlah diterima adalah riwayat, bukan saldo batch. Schema belum mendukung ledger pembuangan per batch. Tidak ada stok yang diubah dari halaman ini.</Message><QuantityInput id="expiry-current" label="Stok Barang Saat Ini" value={item.stok_saat_ini+" "+item.satuan} readOnly/><QuantityInput id="expiry-quantity" label="Jumlah Diterima Historis" value={batch.jumlah_diterima+" "+item.satuan} readOnly/><p>Kedaluwarsa: {displayDate(batch.tanggal_kedaluwarsa)}</p><button className="w-primary w-full w-expiry-save" disabled>Pembuangan batch belum tersedia</button><p>Penyesuaian stok fisik dapat dicatat pada menu Penyesuaian setelah menghitung barang secara nyata.</p></aside>;
}

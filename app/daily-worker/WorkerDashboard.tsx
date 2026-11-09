"use client";
import Image from "next/image";
import Link from "next/link";
import { Box, CalendarClock, Download } from "lucide-react";
import { daysUntil, stockStatus } from "./data";
import { useWorker } from "./WorkerState";
import { Status } from "./ui";
export default function WorkerDashboard(){
 const {state}=useWorker();
 const expired=state.batches.filter(b=>b.jumlah_diterima>0&&daysUntil(b.tanggal_kedaluwarsa)<0);
 const soon=state.batches.filter(b=>b.jumlah_diterima>0&&daysUntil(b.tanggal_kedaluwarsa)>=0&&daysUntil(b.tanggal_kedaluwarsa)<=7);
 const tasks=[
  ...state.batches.filter(b=>b.tanggal_kedaluwarsa&&daysUntil(b.tanggal_kedaluwarsa)<=7).map(b=>({id:"batch-"+b.id_detail_masuk,name:state.items.find(i=>i.id_barang===b.id_barang)?.nama_barang??b.id_barang,issue:daysUntil(b.tanggal_kedaluwarsa)<0?"Batch melewati kedaluwarsa":"Kedaluwarsa dalam "+daysUntil(b.tanggal_kedaluwarsa)+" hari",action:"Lihat",href:"/daily-worker/kadaluwarsa?barang="+b.id_barang})),
  ...state.items.filter(i=>stockStatus(i)!=="Aman"||i.ui.perlu_cek).map(i=>({id:i.id_barang,name:i.nama_barang,issue:stockStatus(i)!=="Aman"?"Stok "+stockStatus(i).toLowerCase():"Perlu pemeriksaan",action:"Periksa",href:"/daily-worker/pemeriksaan?barang="+i.id_barang}))
 ];
 const quick=[
  {name:"Penerimaan",href:"penerimaan",text:"Catat bahan masuk"},
  {name:"Stok Barang",href:"stok-barang",text:"Lihat jumlah stok"},
  {name:"Pemeriksaan",href:"pemeriksaan",text:"Cek stok tercatat"},
  {name:"Penyesuaian",href:"penyesuaian",text:"Sesuaikan stok fisik"}
 ];
 return <><div className="w-intro w-dashboard-intro"><div><h2>Tugas Hari Ini</h2><p>Catat penerimaan, cek stok, dan tindak bahan kadaluwarsa dari satu tempat.</p></div><Image unoptimized src="/daily-worker/banner.png" alt="Ilustrasi croissant, roti, cupcake dan gandum" width={320} height={84}/></div>
 <section className="w-stats four" aria-label="Ringkasan tugas">
  <Link href="/daily-worker/stok-barang"><span>Total Item</span><Box size={19}/><strong>{state.items.length}</strong></Link>
  <Link className="red" href="/daily-worker/kadaluwarsa?filter=kadaluwarsa"><span>Batch Kadaluwarsa</span><CalendarClock size={19}/><strong>{expired.length}</strong><Status tone="red">Tindak</Status></Link>
  <Link className="amber" href="/daily-worker/kadaluwarsa?filter=segera"><span>Batch Segera Kadaluwarsa</span><CalendarClock size={19}/><strong>{soon.length}</strong><Status>≤ 7 hari</Status></Link>
  <Link href="/daily-worker/penerimaan"><span>Penerimaan Hari Ini</span><Download size={19}/><strong>{new Set(state.receipts.filter(r=>r.tanggal_terima===state.today).map(r=>r.id_penerimaan)).size}</strong></Link>
 </section>
 <div className="w-columns w-dashboard-tables"><section><h3>Perlu Tindakan</h3><div className="w-table-wrap"><table><thead><tr><th>Bahan</th><th>Masalah</th><th>Aksi</th></tr></thead><tbody>{tasks.slice(0,6).map(t=><tr key={t.id}><td><strong>{t.name}</strong></td><td>{t.issue}</td><td><Link className="w-text-link" href={t.href}>{t.action}</Link></td></tr>)}</tbody></table>{!tasks.length&&<p className="w-no-results">Semua tugas sudah ditangani.</p>}</div></section>
 <section><h3>Aktivitas Terakhir</h3><div className="w-table-wrap"><table><thead><tr><th>Waktu</th><th>Aktivitas</th><th>Oleh</th></tr></thead><tbody>{state.activities.slice(0,6).map(a=><tr key={a.id}><td><strong>{a.waktu}</strong></td><td><Link href={a.href}>{a.aktivitas}</Link></td><td>{a.oleh}</td></tr>)}</tbody></table></div></section></div>
 <section className="w-shortcuts" aria-label="Pintasan">{quick.map(q=><Link href={"/daily-worker/"+q.href} key={q.href}><h3>{q.name}</h3><span>{q.text} →</span></Link>)}</section>
 </>;
}
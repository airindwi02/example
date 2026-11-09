"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { displayDate, shortDate, signed, stockStatus } from "./data";
import { useWorker } from "./WorkerState";
import { Details, EmptyPanel, Intro, ItemList, Status } from "./ui";
export default function StockPage(){const params=useSearchParams();return <StockContent key={params.toString()} initial={params.get("barang")??""}/>;}
function StockContent({initial}:{initial:string}){
 const {state}=useWorker();const [selected,setSelected]=useState(initial);
 const item=state.items.find(b=>b.id_barang===selected);
 const movements=state.movements.filter(m=>m.id_barang===selected).slice(0,5);
 return <><Intro title="Informasi Stok Barang">Pilih barang untuk melihat jumlah stok di samping.</Intro><div className="w-columns"><section><ItemList selected={selected} onSelect={b=>setSelected(b.id_barang)}/></section><aside className="w-stock-panels">
 {item?<section className="w-panel w-stock-detail"><h3>{item.nama_barang}</h3><p>{item.ui.kategori}</p><strong className="w-stock-number">{item.stok_saat_ini} {item.satuan}</strong><p>Jumlah stok barang terpilih</p><Status>{stockStatus(item)}</Status><Details rows={[["Batas minimum",item.stok_minimum+" "+item.satuan],["Terakhir masuk",displayDate(item.ui.terakhir_masuk)]]}/></section>:<EmptyPanel>Jumlah stok akan tampil di sini.</EmptyPanel>}
 <section className="w-panel w-stock-movements"><h3>{item?"Pergerakan Terakhir":"Sering Dicek"}</h3>{item?(movements.length?<Details rows={movements.map((m,i)=>[shortDate(m.tanggal)+" · "+m.jenis+(movements.some((other,j)=>j<i&&other.tanggal===m.tanggal&&other.jenis===m.jenis)?" ("+(i+1)+")":""),signed(m.jumlah)+" "+item.satuan])}/>:<p className="w-muted">Belum ada pergerakan stok tercatat untuk barang ini.</p>):state.items.slice(0,5).map(b=><button className="w-frequent" key={b.id_barang} onClick={()=>setSelected(b.id_barang)}><span>{b.nama_barang}</span><strong>{b.stok_saat_ini} {b.satuan}</strong></button>)}</section>
 </aside></div></>;
}
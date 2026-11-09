"use client";
import { useTransition, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useBaker, Badge, ProductAsset, ProductionTable } from "./BakerClient";
import type { BakerOutcome } from "../../lib/baker-types";

const token=()=>crypto.randomUUID().replaceAll("-","").slice(0,15);
const row=()=>({key:token(),itemId:"",batchId:"",amount:""});
export default function UsageForm(){const params=useSearchParams();return <UsageContent key={params.toString()} initial={params.get("produk")??""}/>;}
function UsageContent({initial}:{initial:string}){
 const {materials,products,batches,today,pending,save}=useBaker();
 const [transitionPending,startTransition]=useTransition();const busy=pending||transitionPending;
 const [selected,setSelected]=useState(initial),[lines,setLines]=useState([{key:"first",itemId:"",batchId:"",amount:""}]);
 const [request,setRequest]=useState(token),[output,setOutput]=useState("");
 const [status,setStatus]=useState<"Selesai"|"Gagal">("Selesai"),[reason,setReason]=useState("");
 const [error,setError]=useState(""),[result,setResult]=useState<BakerOutcome|null>(null);
 const product=products.find(p=>p.id===selected);
 function choose(id:string){if(busy)return;setSelected(id);setLines([row()]);setOutput("");setStatus("Selesai");setReason("");setError("");setResult(null);setRequest(token());}
 function update(key:string,patch:Partial<ReturnType<typeof row>>){setLines(rows=>rows.map(r=>r.key===key?{...r,...patch}:r));setError("");}
 const enough=!lines.some(l=>{const item=materials.find(m=>m.id===l.itemId);return item&&Number(l.amount)>item.stock;});
 async function submit(){
  if(busy||result||!product)return;
  const response=await save({token:request,productId:product.id,output,status,reason,lines:lines.map(l=>({itemId:l.itemId,batchId:l.batchId,unit:materials.find(m=>m.id===l.itemId)?.unit??"",amount:l.amount}))});
  if(!response.ok){setError(response.message);return;}
  setError("");setResult(response);
 }
 return <><div className="b-intro"><h2>Pemakaian Bahan Baku</h2><p>Pilih produk, bahan dan batch penerimaan, lalu isi jumlah aktual yang digunakan.</p></div><div className="b-columns"><section><div className="b-production-products">{products.map(p=><button key={p.id} className={"b-product "+(selected===p.id?"selected":"")} disabled={busy} onClick={()=>choose(p.id)}><ProductAsset name={p.name} size={96}/><span><small>{p.id}</small><strong>{p.name}</strong><span className="b-recipe-text">{p.category}</span><Badge tone="green">Stok {p.stock} {p.unit}</Badge></span></button>)}</div>{!products.length&&<p className="b-message amber">Belum ada produk hasil di database. Pemakaian wajib terhubung ke produk hasil.</p>}<h3 className="b-history-title">Riwayat Pemakaian &amp; Produksi</h3><ProductionTable detailed/></section>
 <aside className={"b-panel b-production-panel "+(!product?"b-empty-panel":"")}>
 {!product?<><span className="b-empty-icon"><X size={18}/></span><h3>Pilih produk</h3><p>Pilih bahan dan isi pemakaian aktual di panel ini.</p></>:<><div className="b-selected-product"><ProductAsset name={product.name} size={56}/><div><small>{product.id}</small><h3>{product.name}</h3><p>Satuan hasil: {product.unit}</p></div></div>
 {error&&<p className="b-message red" role="alert">{error}</p>}
 {!enough&&!result&&<p className="b-message red" role="alert">Stok bahan tidak mencukupi. Periksa jumlah pemakaian.</p>}
 {result?<><p className="b-message green" role="status">{result.replayed?"Pemakaian sudah tercatat; stok tidak dikurangi kembali.":"Pemakaian tercatat dan stok diperbarui."}</p><div className="b-table-wrap"><table><thead><tr><th>Bahan</th><th>Dipakai</th><th>Stok Baru</th></tr></thead><tbody>{result.changes.map(r=><tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.used} {r.unit}</td><td>{r.before} → {r.after} {r.unit}</td></tr>)}</tbody></table></div><strong className="b-result-output">Hasil produksi: {output} {product.unit} ({status})</strong><button className="b-outline b-production-again" onClick={()=>choose(product.id)}>Produksi Lagi</button></>:<form noValidate onSubmit={e=>{e.preventDefault();startTransition(async()=>{await submit();});}}><fieldset className="b-usage-fields" disabled={busy}>
 <p className="b-message amber">Resep belum tersedia di database. Isi bahan dan jumlah nyata; tidak ada pengurangan otomatis berdasarkan resep.</p>
 {lines.map((l,index)=>{const item=materials.find(m=>m.id===l.itemId);const eligible=batches.filter(b=>b.itemId===l.itemId&&b.available>0&&/^baik$/i.test(b.condition)&&(!b.expiry||b.expiry>=today));return <div className="b-usage-row" key={l.key}>
 <label className="b-usage-field" htmlFor={"material-"+l.key}>Bahan {index+1}<select id={"material-"+l.key} aria-label={"Bahan "+(index+1)} value={l.itemId} onChange={e=>update(l.key,{itemId:e.target.value,batchId:""})}><option value="">Pilih bahan</option>{materials.map(m=><option key={m.id} value={m.id}>{m.name} — {m.stock} {m.unit}</option>)}</select></label>
 <label className="b-usage-field" htmlFor={"batch-"+l.key}>Batch penerimaan {index+1}<select id={"batch-"+l.key} aria-label={"Batch penerimaan "+(index+1)} value={l.batchId} onChange={e=>update(l.key,{batchId:e.target.value})}><option value="">Pilih batch</option>{eligible.map(b=><option key={b.id} value={b.id}>{b.id} — batas riwayat {b.available} {item?.unit}{b.expiry?" / kedaluwarsa "+b.expiry:""}</option>)}</select></label>
 {!!item&&!eligible.length&&<p className="b-error">Tidak ada batch Baik yang belum kedaluwarsa dan masih memiliki batas penerimaan.</p>}
 <label className="b-usage-field" htmlFor={"amount-"+l.key}>Jumlah dipakai {index+1} ({item?.unit??"satuan barang"})<input id={"amount-"+l.key} aria-label={"Jumlah dipakai "+(index+1)} inputMode="decimal" value={l.amount} onChange={e=>update(l.key,{amount:e.target.value})}/></label>
 {lines.length>1&&<button type="button" className="b-outline" onClick={()=>setLines(rows=>rows.filter(r=>r.key!==l.key))}>Hapus bahan {index+1}</button>}</div>;})}
 <button type="button" className="b-outline" disabled={lines.length>=50} onClick={()=>setLines(rows=>[...rows,row()])}>Tambah Bahan</button>
 <p className="b-usage-help">Batas riwayat = jumlah diterima dikurangi pemakaian tercatat. Batas ini bukan saldo fisik batch; server juga memeriksa stok barang terkini.</p>
 <label className="b-usage-field" htmlFor="production-status">Status Produksi<select id="production-status" value={status} onChange={e=>{const v=e.target.value as "Selesai"|"Gagal";setStatus(v);setOutput(v==="Gagal"?"0":"");setReason("");}}><option>Selesai</option><option>Gagal</option></select></label>
 <label className="b-output-label" htmlFor="production-output">Hasil Produksi ({product.unit})</label><input id="production-output" className="b-output" inputMode="decimal" value={output} readOnly={status==="Gagal"} onChange={e=>setOutput(e.target.value)}/>
 {status==="Gagal"&&<label className="b-usage-field" htmlFor="production-reason">Alasan gagal<input id="production-reason" maxLength={255} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
 <button className="b-primary b-save">{busy?"Menyimpan...":"Simpan Produksi"}</button>
 </fieldset></form>}</>}
 </aside></div></>;
}

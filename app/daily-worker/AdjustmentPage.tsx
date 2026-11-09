"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { parseQuantity, round, shortDate, signed, type Barang } from "./data";
import { newToken, useWorker } from "./WorkerState";
import { Details, EmptyPanel, Intro, ItemList, Message, QuantityInput, ReasonChoices } from "./ui";

export default function AdjustmentPage(){const params=useSearchParams();return <AdjustmentContent key={params.toString()} initial={params.get("barang")??""}/>;}
function AdjustmentContent({initial}:{initial:string}){
 const {state}=useWorker();const [selected,setSelected]=useState(initial);
 const item=state.items.find(b=>b.id_barang===selected)??state.items[0];
 if(!item)return <EmptyPanel>Belum ada barang di database.</EmptyPanel>;
 return <><Intro title="Cek dan Sesuaikan Stok Fisik">Hitung jumlah barang fisik, bandingkan dengan stok sistem, lalu catat selisihnya.</Intro><div className="w-columns"><section><ItemList selected={item.id_barang} onSelect={b=>setSelected(b.id_barang)} kind="adjust"/></section><AdjustmentForm key={item.id_barang} item={item} reset={()=>setSelected("")}/></div></>;
}
function AdjustmentForm({item,reset}:{item:Barang;reset:()=>void}){
 const {state,pending,save:saveRecord}=useWorker();
 const [token,setToken]=useState(newToken),[error,setError]=useState("");
 const [actual,setActual]=useState(""),[reason,setReason]=useState("Salah catat"),[note,setNote]=useState("");
 const [attempted,setAttempted]=useState(false),[reviewed,setReviewed]=useState(false),[saved,setSaved]=useState<{before:number;actual:number}|null>(null);
 const amount=parseQuantity(actual,true),before=saved?.before??item.stok_saat_ini;
 const difference=amount===null?null:round(amount-before);
 const invalid=amount===null;
 function review(e:React.FormEvent){e.preventDefault();setAttempted(true);if(invalid)return;setAttempted(false);setReviewed(true);}
 async function save(){if(saved||pending||!reviewed||amount===null)return;const result=await saveRecord({type:"adjust",id:item.id_barang,unit:item.satuan,expectedStock:String(before),actual:String(amount),reason:difference===0?"Baik":reason,note:"",token});if(!result.ok){setError(result.message);return;}setError("");setSaved({before:result.before??before,actual:amount});}
 function restart(){setToken(newToken());setError("");setActual("");setReason("Salah catat");setNote("");setAttempted(false);setReviewed(false);setSaved(null);reset();}
 return <aside className="w-panel w-tall-panel w-adjustment-panel"><h3>Penyesuaian — {item.nama_barang}</h3>
 {attempted&&invalid&&<Message tone="red" id="adjustment-error">{actual.trim().startsWith("-")?"Koreksi jumlah: hasil hitung tidak boleh negatif.":"Koreksi jumlah: isi hasil hitung dengan angka tidak negatif."}</Message>}
 {error&&<Message tone="red">{error}</Message>}
 {saved&&<Message tone="green">Hasil pengecekan tersimpan.</Message>}
 <form noValidate onSubmit={review}><QuantityInput id="adjustment-system" label="Stok Sistem" value={before+" "+item.satuan} readOnly/>
 <QuantityInput id="adjustment-actual" label="Hasil Hitung Fisik" value={actual} onChange={v=>{setActual(v);setAttempted(false);setReviewed(false);}} unit={item.satuan} invalid={attempted&&invalid} readOnly={!!saved||pending} description={attempted?"adjustment-error":undefined}/>
 {difference===null?<div className="w-difference-placeholder"><Message tone="cream">Isi hasil hitung untuk melihat selisih otomatis.</Message></div>:difference===0?<div className="w-difference-placeholder"><Message tone="green"><strong>Selisih 0 — stok fisik sama dengan sistem.</strong><span className="w-match-copy">Stok dipertahankan.</span></Message></div>:<div className={"w-difference "+(difference<0?"red":"green")} role="status"><strong>Selisih</strong><div><b>{signed(difference)} {item.satuan}</b><p>Stok {before} {item.satuan} → {amount} {item.satuan} setelah penyesuaian dicatat.</p></div></div>}
 {reviewed&&difference!==0&&<><ReasonChoices options={["Rusak","Hilang","Salah catat"]} value={reason} onChange={setReason} disabled={!!saved}/><label className="w-field w-adjustment-note" htmlFor="adjustment-note"><span>Catatan (belum didukung schema)</span><input id="adjustment-note" placeholder="Belum ada kolom catatan di database" maxLength={255} value={note} readOnly onChange={e=>setNote(e.target.value)}/></label></>}
 {saved?<button type="button" className="w-outline w-full w-adjustment-action" onClick={restart}>Cek Barang Lain</button>:reviewed?<button type="button" className="w-primary w-full w-adjustment-action" disabled={pending} onClick={save}>{difference===0?"Simpan Hasil Pengecekan":"Catat Penyesuaian"}</button>:<button className="w-primary w-full w-adjustment-action">Periksa Selisih</button>}
 </form>
 {(!reviewed||difference===0)&&<section className="w-mini-history"><h4>Penyesuaian terakhir</h4><Details rows={state.adjustments.slice(0,3).map(a=>{const b=state.items.find(b=>b.id_barang===a.id_barang)!;return [b.nama_barang,shortDate(a.tanggal)+" · "+signed(round(a.stok_fisik-a.stok_sistem))+" "+b.satuan];})}/></section>}
 </aside>;
}
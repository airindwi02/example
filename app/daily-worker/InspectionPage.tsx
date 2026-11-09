"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { parseQuantity, round, shortDate, signed, type Barang } from "./data";
import { newToken, useWorker } from "./WorkerState";
import { Details, EmptyPanel, Intro, ItemList, Message, QuantityInput } from "./ui";
export default function InspectionPage(){const params=useSearchParams();return <InspectionContent key={params.toString()} initial={params.get("barang")??""}/>;}
function InspectionContent({initial}:{initial:string}){
 const {state}=useWorker();const [selected,setSelected]=useState(initial);
 const item=state.items.find(b=>b.id_barang===selected);
 return <><Intro title="Pemeriksaan Stok">Pilih barang, lihat stok tercatat, lalu masukkan stok aktual.</Intro><div className="w-columns"><section><ItemList selected={selected} onSelect={b=>setSelected(b.id_barang)} kind="check"/></section>
 {item?<InspectionForm key={selected} item={item} close={()=>setSelected("")}/>:<EmptyPanel className="w-tall-panel">Stok tercatat akan tampil di sini.</EmptyPanel>}
 </div></>;
}
function InspectionForm({item,close}:{item:Barang;close:()=>void}){
 const {state,pending,save:saveRecord}=useWorker();
 const [token]=useState(newToken),[error,setError]=useState("");
 const [actual,setActual]=useState(""),[attempted,setAttempted]=useState(false),[saved,setSaved]=useState(false);
 const amount=parseQuantity(actual,true);const invalid=amount===null;
 async function save(e:React.FormEvent){e.preventDefault();if(saved||pending)return;setAttempted(true);if(amount===null)return;const result=await saveRecord({type:"check",id:item.id_barang,unit:item.satuan,expectedStock:String(item.stok_saat_ini),actual:String(amount),token});if(!result.ok){setError(result.message);return;}setError("");setSaved(true);setAttempted(false);}
 return <aside className="w-panel w-tall-panel w-inspection-panel"><h3>Pemeriksaan — {item.nama_barang}</h3>
 {attempted&&invalid&&<Message tone="red" id="inspection-error">{actual.trim().startsWith("-")?"Isian perlu diperbaiki: stok aktual tidak boleh negatif.":"Isian perlu diperbaiki: stok aktual harus angka."}</Message>}
 {error&&<Message tone="red">{error}</Message>}
 {saved&&<Message tone="green">Data pemeriksaan berhasil disimpan.</Message>}
 <form noValidate onSubmit={save}><QuantityInput id="inspection-system" label="Stok Tercatat" value={item.stok_saat_ini+" "+item.satuan} readOnly/>
 <QuantityInput id="inspection-actual" label="Stok Aktual" value={actual} onChange={v=>{setActual(v);setAttempted(false);}} unit={item.satuan} invalid={attempted&&invalid} description={attempted?"inspection-error":undefined} readOnly={saved||pending}/>
 {saved?<button type="button" className="w-outline w-full w-inspection-actions" onClick={close}>Periksa Barang Lain</button>:<div className="w-form-actions w-inspection-actions"><button type="button" className="w-outline" onClick={close}>Batal</button><button className="w-primary" disabled={pending}>Simpan Pemeriksaan</button></div>}
 </form><section className="w-mini-history"><h4>Pemeriksaan terakhir</h4><Details rows={state.checks.slice(0,3).map(c=>{const b=state.items.find(b=>b.id_barang===c.id_barang)!;const diff=round(c.stok_fisik-c.stok_sistem);return [b.nama_barang,shortDate(c.tanggal)+" · "+(diff?"Selisih "+signed(diff):"Sesuai")];})}/></section>
 </aside>;
}
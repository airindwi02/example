"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { displayDate, parseDate, parseQuantity, round } from "./data";
import { newToken, useWorker } from "./WorkerState";
import { Details, Intro, Message, QuantityInput } from "./ui";
export default function ReceivingPage(){const params=useSearchParams();return <ReceivingForm key={params.toString()} initial={params.get("barang")??""}/>;}
function ReceivingForm({initial}:{initial:string}){
 const {state,pending,save}=useWorker();
 const [selected,setSelected]=useState(initial),[supplier,setSupplier]=useState(""),[order,setOrder]=useState(""),[quantity,setQuantity]=useState(""),[sent,setSent]=useState(""),[date,setDate]=useState(displayDate(state.today)),[expiry,setExpiry]=useState(""),[condition,setCondition]=useState("Baik"),[reason,setReason]=useState("");
 const [token,setToken]=useState(newToken),[error,setError]=useState(""),[message,setMessage]=useState(""),[locked,setLocked]=useState(false);
 const item=state.items.find(b=>b.id_barang===selected),amount=parseQuantity(quantity),sentAmount=parseQuantity(sent),parsedDate=parseDate(date),parsedExpiry=expiry?parseDate(expiry):"";
 const orders=state.orders.filter(o=>o.supplierId===supplier&&o.items.some(d=>d.id===selected&&d.remaining>0));
 const preview=item??state.items[0];
 function reset(){setSelected("");setSupplier("");setOrder("");setQuantity("");setSent("");setDate(displayDate(state.today));setExpiry("");setCondition("Baik");setReason("");setLocked(false);setError("");setMessage("");setToken(newToken());}
 async function submit(again:boolean){
  if(pending||locked)return;
  if(!item||amount===null||sentAmount===null||!parsedDate||(expiry&&!parsedExpiry)||!supplier||!order){setError("Lengkapi barang, pemasok, pesanan, jumlah dikirim/diterima, dan tanggal yang valid.");return;}
  const result=await save({type:"receive",id:item.id_barang,unit:item.satuan,expectedStock:String(item.stok_saat_ini),token,amount:String(amount),sent:String(sentAmount),date:parsedDate,supplierId:supplier,orderId:order,expiry:parsedExpiry||"",condition,reason});
  if(!result.ok){setError(result.message);return;}
  const success=(result.replayed?"Penerimaan sudah tercatat":"Penerimaan berhasil disimpan")+". "+item.nama_barang+"; stok terkini "+result.after+" "+item.satuan+".";
  if(again)reset();else setLocked(true);
  setMessage(success);setError("");
 }
 return <><Intro title="Catat Bahan Baku Masuk">Isi nama, jumlah, dan tanggal penerimaan sesuai pesanan.</Intro>
 {error&&<Message tone="red">{error}</Message>}{message&&<Message tone="green">{message}</Message>}
 <div className="w-columns w-receiving-columns"><section className="w-panel w-receiving-form"><h3>Form Penerimaan</h3><form noValidate onSubmit={e=>{e.preventDefault();void submit(false);}}><fieldset disabled={pending||locked} style={{border:0,padding:0,margin:0,minWidth:0}}>
 <label className="w-field" htmlFor="receipt-item"><span>Nama Bahan</span><select id="receipt-item" value={selected} onChange={e=>{setSelected(e.target.value);setOrder("");}}><option value="">Pilih bahan baku</option>{state.items.map(b=><option key={b.id_barang} value={b.id_barang}>{b.nama_barang}</option>)}</select></label>
 <label className="w-field" htmlFor="receipt-supplier"><span>Pemasok</span><select id="receipt-supplier" value={supplier} onChange={e=>{setSupplier(e.target.value);setOrder("");}}><option value="">Pilih pemasok</option>{state.suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label className="w-field" htmlFor="receipt-order"><span>Pesanan Pembelian</span><select id="receipt-order" value={order} onChange={e=>setOrder(e.target.value)}><option value="">Pilih pesanan</option>{orders.map(o=><option key={o.id} value={o.id}>{o.id} — sisa {o.items.find(d=>d.id===selected)!.remaining} {item?.satuan}</option>)}</select></label>
 {!orders.length&&selected&&supplier&&<Message>Belum ada sisa pesanan untuk barang dan pemasok ini. Penerimaan tidak membuat pesanan fiktif.</Message>}
 <QuantityInput id="receipt-sent" label="Jumlah Dikirim" value={sent} onChange={setSent} unit={item?.satuan}/>
 <QuantityInput id="receipt-quantity" label="Jumlah Diterima" value={quantity} onChange={setQuantity} unit={item?.satuan}/>
 <label className="w-field" htmlFor="receipt-date"><span>Tanggal Penerimaan</span><input id="receipt-date" placeholder="DD/MM/YYYY" value={date} onChange={e=>setDate(e.target.value)}/></label>
 <label className="w-field" htmlFor="receipt-expiry"><span>Tanggal Kedaluwarsa (opsional)</span><input id="receipt-expiry" placeholder="DD/MM/YYYY" value={expiry} onChange={e=>setExpiry(e.target.value)}/></label>
 <label className="w-field" htmlFor="receipt-condition"><span>Kondisi</span><input id="receipt-condition" maxLength={20} value={condition} onChange={e=>setCondition(e.target.value)}/></label>
 <label className="w-field" htmlFor="receipt-reason"><span>Alasan jika diterima sebagian</span><input id="receipt-reason" maxLength={255} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <div className="w-form-actions"><button type="button" className="w-outline" onClick={reset}>Batal</button><button type="button" className="w-outline" onClick={()=>void submit(true)}>Simpan &amp; Catat Lagi</button><button className="w-primary">{pending?"Menyimpan...":"Simpan Penerimaan"}</button></div></fieldset></form>{locked&&<button className="w-outline" onClick={reset}>Catat Penerimaan Lain</button>}</section>
 <aside className="w-panel w-receipt-info"><h3>Info Stok{preview?" — "+preview.nama_barang:""}</h3>{preview?<Details rows={[["Stok Sekarang",preview.stok_saat_ini+" "+preview.satuan],["Perkiraan Setelah Penerimaan",(locked?preview.stok_saat_ini:round(preview.stok_saat_ini+(amount??0)))+" "+preview.satuan],["Batas Minimum",preview.stok_minimum+" "+preview.satuan],["Terakhir Masuk",displayDate(preview.ui.terakhir_masuk)],["Pemasok Terakhir",preview.ui.pemasok]]}/>:<p>Belum ada barang di database.</p>}</aside></div>
 <section className="w-receipt-history"><h3>Penerimaan Terakhir</h3><div className="w-table-wrap"><table><thead><tr><th>Tanggal</th><th>Bahan</th><th>Jumlah</th><th>Pemasok</th><th>Dicatat oleh</th></tr></thead><tbody>{state.receipts.slice(0,5).map((r,index)=>{const b=state.items.find(b=>b.id_barang===r.id_barang);return <tr key={r.id_penerimaan+index}><td>{displayDate(r.tanggal_terima)}</td><td>{b?.nama_barang}</td><td>{r.jumlah_diterima} {b?.satuan}</td><td>{r.nama_pemasok}</td><td>{r.recordedBy}</td></tr>;})}</tbody></table></div></section></>;
}

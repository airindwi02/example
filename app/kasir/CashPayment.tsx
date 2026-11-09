"use client";
import {useState,useTransition,useSyncExternalStore,useMemo} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useKasir} from "./KasirState";
import {currency} from "./data";
import {cashChange,cartTotals} from "../../lib/kasir-cart";
import {checkoutKasirAction} from "./actions";
const slot="alana-cash-pending-intent";
function stored(){try{return sessionStorage.getItem(slot)??"";}catch{return "";}}
function subscribe(fn:()=>void){window.addEventListener("alana-cash-intent",fn);return ()=>window.removeEventListener("alana-cash-intent",fn);}
function notify(){window.dispatchEvent(new Event("alana-cash-intent"));}
export default function CashPayment(){
 const {state,dispatch,paid:result,setPaid:setResult}=useKasir(),router=useRouter();
 const [received,setReceived]=useState(""),[review,setReview]=useState(false),[message,setMessage]=useState("");
 const [pending,start]=useTransition();const raw=useSyncExternalStore(subscribe,stored,()=>"");const intent=useMemo(()=>{try{return JSON.parse(raw||"null");}catch{return null;}},[raw]);
 const {count,subtotal}=cartTotals(state);
 const estimate=cashChange(subtotal,received);

 async function send(retry=false){
  const payload=retry?intent:{key:crypto.randomUUID(),method:"TUNAI",received,lines:state.products.filter(p=>state.cart[p.id]).map(p=>({id:p.id,qty:state.cart[p.id],price:p.price===null?"":String(p.price)}))};
  try{sessionStorage.setItem(slot,JSON.stringify(payload));}catch{setMessage("Penyimpanan permintaan lokal tidak tersedia. Pembayaran belum dikirim.");return;}
  notify();
  try{const r=await checkoutKasirAction(payload);if(r.ok){sessionStorage.removeItem(slot);notify();setResult(r);setMessage("Pembayaran tersimpan dan stok diperbarui.");dispatch({type:"new"});router.refresh();}else{setMessage(r.message);if(!r.uncertain){sessionStorage.removeItem(slot);notify();setReview(false);}}}catch{setMessage("Koneksi terputus. Periksa atau ulangi permintaan yang sama sebelum membuat pembayaran baru.");}
 }
 if(result)return <div><p role="status">{message}</p><strong>{result.id}</strong><p>Total {currency(result.total)} / Kembalian {currency(result.change)}</p><Link className="k-outline" href={"/kasir/riwayat-penjualan?pilih="+result.id}>Lihat dan Cetak Struk</Link><button className="k-primary" onClick={()=>{setResult(null);setReview(false);setReceived("");setMessage("");}}>Transaksi Baru</button></div>;
 return <div><p className="k-order-footnote">Pembayaran Tunai · pajak 0% · biaya layanan Rp0.</p>{message&&<p role="alert">{message}</p>}{intent?<button className="k-primary k-full" disabled={pending} onClick={()=>start(async()=>{await send(true);})}>Periksa / Ulangi Pembayaran Tertunda</button>:<><div className="k-payment-fields"><label>Metode<select aria-label="Metode pembayaran" value="TUNAI" disabled><option value="TUNAI">Tunai</option><option disabled>QRIS</option><option disabled>Debit</option></select></label><label>Diterima<input aria-label="Uang diterima" inputMode="decimal" disabled={pending||review} value={received} onChange={e=>setReceived(e.target.value)}/></label></div><div className="k-order-sum k-change"><span>Kembalian (perkiraan)</span><strong>{currency(estimate)}</strong></div>{review?<><p>Konfirmasi produk, jumlah, harga, dan pembayaran Tunai.</p><button className="k-outline" disabled={pending} onClick={()=>setReview(false)}>Ubah</button><button className="k-primary" disabled={pending||subtotal===null||Object.keys(state.errors).length>0} onClick={()=>start(async()=>{await send();})}>{pending?"Menyimpan...":"Bayar"}</button></>:<button className="k-primary k-full" disabled={!count||subtotal===null||Object.keys(state.errors).length>0} onClick={()=>setReview(true)}>Tinjau Pembayaran</button>}</>}</div>;
}

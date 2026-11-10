import { randomBytes } from "node:crypto";
import {Prisma,type PrismaClient,type Prisma as P} from "../app/generated/prisma/client";
import {cashPaymentPolicy,cashPaymentTerms,pricingEnabled} from "./payment-policy";
const Money=Prisma.Decimal.clone({precision:40});
export class PaymentError extends Error {}
type Actor={id_pengguna:string;password_hash:string};
export type PaymentRow={id_transaksi:string;id_pengguna:string;kunci_idempotensi:string;metode_pembayaran:string;total_bayar:Prisma.Decimal;pajak_layanan:Prisma.Decimal;uang_diterima:Prisma.Decimal;kembalian:Prisma.Decimal;waktu_bayar:Date};
export function money(s:unknown,positive=false){if(typeof s!=="string"||!/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/.test(s))throw new PaymentError("Nominal tidak valid; gunakan maksimal dua desimal.");const n=new Money(s);if(positive&&!n.greaterThan(0))throw new PaymentError("Nominal harus positif.");return n;}
export function paymentInput(input:unknown){
 if(!input||typeof input!=="object")throw new PaymentError("Data pembayaran tidak valid.");
 const c=input as {key:string;method:string;received:string;lines:{id:string;qty:number;price:string}[]};
 if(typeof c.key!=="string"||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(c.key)||c.method!==cashPaymentTerms.method||!Array.isArray(c.lines)||!c.lines.length||c.lines.length>50)throw new PaymentError("Pembayaran harus Tunai dengan produk dan kunci permintaan yang valid.");
 const seen=new Set();const lines=c.lines.map(l=>{if(!l||typeof l.id!=="string"||!l.id||l.id.length>10||seen.has(l.id)||!Number.isInteger(l.qty)||l.qty<1||l.qty>99999999)throw new PaymentError("Jumlah atau identitas produk tidak valid.");seen.add(l.id);return {id:l.id,qty:l.qty,price:money(l.price,true)};}).sort((a,b)=>a.id.localeCompare(b.id));
 return {key:c.key.toLowerCase(),received:money(c.received,true),lines};
}
export async function paymentReady(tx:P.TransactionClient){const rows=await tx.$queryRaw<{n:number}[]>`SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND ((table_name='barang' AND column_name='harga_jual') OR (table_name='transaksi' AND column_name IN ('metode_pembayaran','total_bayar','pajak_layanan','uang_diterima','kembalian','waktu_bayar','kunci_idempotensi')))`;return rows[0]?.n===8;}
async function actor(tx:P.TransactionClient,a:Actor,role:string){await tx.$queryRaw`SELECT id_pengguna FROM public.pengguna WHERE id_pengguna=${a.id_pengguna} FOR SHARE`;const u=await tx.pengguna.findUnique({where:{id_pengguna:a.id_pengguna},select:{peran:true,status_akun:true,password_hash:true}});if(!u||u.peran!==role||u.status_akun!=="ACTIVE"||u.password_hash!==a.password_hash)throw new PaymentError("Akun aktif dengan role yang sesuai diperlukan.");}
export async function setPrice(db:PrismaClient,a:Actor,id:unknown,raw:unknown){
 if(!pricingEnabled())throw new PaymentError("Pengelolaan harga belum diaktifkan.");
 if(typeof id!=="string"||!id||id.length>10)throw new PaymentError("Produk tidak valid.");
 const price=money(raw,true);if(price.greaterThan("9999999999.99"))throw new PaymentError("Harga melebihi kapasitas database.");
 return db.$transaction(async tx=>{await actor(tx,a,"Owner");if(!await paymentReady(tx))throw new PaymentError("Schema pembayaran belum siap.");await tx.$queryRaw`SELECT id_barang FROM public.barang WHERE id_barang=${id} FOR UPDATE`;const item=await tx.barang.findUnique({where:{id_barang:id}});if(item?.jenis_barang!=="Produk Hasil")throw new PaymentError("Harga jual hanya untuk Produk Hasil.");await tx.$executeRaw`UPDATE public.barang SET harga_jual=${price.toFixed(2)}::numeric WHERE id_barang=${id}`;return price.toFixed(2);});
}
export async function payCash(db:PrismaClient,a:Actor,input:unknown){
 if(!cashPaymentPolicy())throw new PaymentError("Pembayaran Tunai belum diaktifkan untuk lingkungan ini.");
 const c=paymentInput(input);
 return db.$transaction(async tx=>{
  await actor(tx,a,"Kasir");if(!await paymentReady(tx))throw new PaymentError("Schema pembayaran belum siap.");
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${c.key}),197864785)`;
  const existing=(await tx.$queryRaw<PaymentRow[]>`SELECT * FROM public.transaksi WHERE kunci_idempotensi=${c.key}::uuid`)[0];
  if(existing){if(existing.id_pengguna!==a.id_pengguna)throw new PaymentError("Kunci permintaan tidak dimiliki akun ini.");const details=await tx.detail_transaksi.findMany({where:{id_transaksi:existing.id_transaksi}});if(existing.metode_pembayaran!=="TUNAI"||!existing.uang_diterima.equals(c.received)||details.length!==c.lines.length||!c.lines.every(l=>details.some(d=>d.id_barang===l.id&&d.jumlah_terjual.equals(l.qty)&&d.harga.equals(l.price))))throw new PaymentError("Kunci permintaan sudah digunakan untuk isi berbeda.");return {id:existing.id_transaksi,replayed:true,total:existing.total_bayar.toFixed(2),change:existing.kembalian.toFixed(2)};}
  let total=new Money(0);const details=[];
  for(const l of c.lines){await tx.$queryRaw`SELECT id_barang FROM public.barang WHERE id_barang=${l.id} FOR UPDATE`;const i=(await tx.$queryRaw<{id_barang:string;jenis_barang:string;harga_jual:Prisma.Decimal|null;stok_saat_ini:Prisma.Decimal}[]>`SELECT id_barang,jenis_barang,harga_jual,stok_saat_ini FROM public.barang WHERE id_barang=${l.id}`)[0];if(!i||i.jenis_barang!=="Produk Hasil"||!i.harga_jual||!i.harga_jual.greaterThan(0))throw new PaymentError("Produk belum memiliki harga jual resmi.");if(!i.harga_jual.equals(l.price))throw new PaymentError("Harga berubah. Perbarui data dan konfirmasi ulang.");if(i.stok_saat_ini.lessThan(l.qty))throw new PaymentError("Stok produk tidak mencukupi.");total=total.plus(new Money(i.harga_jual.toString()).times(l.qty));details.push({id_barang:l.id,jumlah_dipesan:l.qty,jumlah_terjual:l.qty,stok_tersedia:i.stok_saat_ini,harga:i.harga_jual});}
  if(total.greaterThan("9999999999999999.99")||c.received.lessThan(total))throw new PaymentError("Uang diterima kurang atau total melampaui kapasitas.");
  const id=randomBytes(8).toString("hex").slice(0,15),change=c.received.minus(total);
  const taxAndService=new Money(cashPaymentTerms.serviceFeeAmount).plus(total.times(cashPaymentTerms.taxRatePercent).div(100)).toFixed(2);
  await tx.$executeRaw`INSERT INTO public.transaksi (id_transaksi,id_pengguna,tanggal,status_transaksi,metode_pembayaran,total_bayar,pajak_layanan,uang_diterima,kembalian,waktu_bayar,kunci_idempotensi) VALUES (${id},${a.id_pengguna},(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date,'Berhasil',${cashPaymentTerms.method},${total.toFixed(2)}::numeric,${taxAndService}::numeric,${c.received.toFixed(2)}::numeric,${change.toFixed(2)}::numeric,CURRENT_TIMESTAMP,${c.key}::uuid)`;
  for(const d of details){await tx.detail_transaksi.create({data:{id_transaksi:id,...d}});const updated=await tx.$executeRaw`UPDATE public.barang SET stok_saat_ini=stok_saat_ini-${d.jumlah_terjual}::numeric WHERE id_barang=${d.id_barang} AND stok_saat_ini>=${d.jumlah_terjual}::numeric`;if(updated!==1)throw new PaymentError("Stok berubah. Pembayaran dibatalkan.");}
  return {id,replayed:false,total:total.toFixed(2),change:change.toFixed(2)};
 },{maxWait:10000,timeout:20000});
}

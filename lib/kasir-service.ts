import { Prisma, type PrismaClient } from "../app/generated/prisma/client";
import { productImage } from "../app/baker/data";
import { todayDate } from "../app/daily-worker/data";
import { CHECKOUT_BLOCKED, type KasirSnapshot } from "../app/kasir/data";
import {cashPaymentPolicy,pricingEnabled} from "./payment-policy";
import {paymentReady,type PaymentRow} from "./payment-service";
const Money=Prisma.Decimal.clone({precision:40});
export class KasirError extends Error {}
export async function readKasir(tx:Prisma.TransactionClient,actor:string):Promise<KasirSnapshot>{
 const ready=(pricingEnabled()||cashPaymentPolicy())&&await paymentReady(tx);
 const prices=ready?await tx.$queryRaw<{id_barang:string;harga_jual:Prisma.Decimal|null}[]>`SELECT id_barang,harga_jual FROM barang`:[];
 const payments=ready?await tx.$queryRaw<PaymentRow[]>`SELECT * FROM transaksi WHERE kunci_idempotensi IS NOT NULL`:[];
 const items=await tx.barang.findMany({where:{jenis_barang:"Produk Hasil"},orderBy:{nama_barang:"asc"}});
 const sales=await tx.transaksi.findMany({orderBy:[{tanggal:"desc"},{id_transaksi:"desc"}],select:{id_transaksi:true,id_pengguna:true,tanggal:true,status_transaksi:true,alasan_gagal:true,pengguna:{select:{nama_pengguna:true}},detail_transaksi:{select:{id_transaksi:true,id_barang:true,jumlah_dipesan:true,stok_tersedia:true,jumlah_terjual:true,harga:true,barang:{select:{nama_barang:true,satuan:true}}}}}});
 return {today:todayDate(),actor,paymentsEnabled:ready&&cashPaymentPolicy(),products:items.map(i=>({id:i.id_barang,name:i.nama_barang,category:i.jenis_barang,stock:Number(i.stok_saat_ini),minimum:Number(i.stok_minimum),unit:i.satuan,image:productImage(i.nama_barang)??"",price:prices.find(p=>p.id_barang===i.id_barang)?.harga_jual?Number(prices.find(p=>p.id_barang===i.id_barang)!.harga_jual):null})),
 sales:sales.map(s=>{const payment=payments.find(p=>p.id_transaksi===s.id_transaksi);return ({id_transaksi:s.id_transaksi,id_pengguna:s.id_pengguna,tanggal:s.tanggal.toISOString().slice(0,10),status_transaksi:s.status_transaksi,reason:s.alasan_gagal,actor:s.pengguna.nama_pengguna,time:payment?new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit"}).format(payment.waktu_bayar):"",method:payment?.metode_pembayaran??"Tidak tercatat",received:payment?.uang_diterima.toFixed(2)??null,change:payment?.kembalian.toFixed(2)??null,fee:payment?.pajak_layanan.toFixed(2)??null,paidTotal:payment?.total_bayar.toFixed(2)??null,total:s.detail_transaksi.reduce((n,l)=>n.plus(new Money(l.harga.toString()).times(l.jumlah_terjual.toString())),new Money(0)).toFixed(),details:s.detail_transaksi.map(l=>({id_barang:l.id_barang,name:l.barang.nama_barang,unit:l.barang.satuan,jumlah_dipesan:Number(l.jumlah_dipesan),stok_tersedia:Number(l.stok_tersedia),jumlah_terjual:Number(l.jumlah_terjual),harga:Number(l.harga),total:new Money(l.harga.toString()).times(l.jumlah_terjual.toString()).toFixed()}))});})};
}
// Intentionally no write branch until an authoritative price/payment contract exists.
export async function checkoutKasir(client:PrismaClient,actor:{id_pengguna:string;password_hash:string},input:unknown):Promise<never>{
 const account=await client.pengguna.findUnique({where:{id_pengguna:actor.id_pengguna},select:{peran:true,status_akun:true,password_hash:true}});
 if(account?.peran!=="Kasir"||account.status_akun!=="ACTIVE"||account.password_hash!==actor.password_hash)throw new KasirError("Hanya Kasir aktif yang dapat melakukan pembayaran.");
 if(!input||typeof input!=="object"||!Array.isArray((input as {lines?:unknown}).lines))throw new KasirError("Data pembayaran tidak valid.");
 throw new KasirError(CHECKOUT_BLOCKED);
}

import { Prisma, type PrismaClient } from "../app/generated/prisma/client";
import { todayDate } from "../app/daily-worker/data";
import type { BakerCommand, BakerSnapshot, BakerOutcome } from "./baker-types";

export class BakerError extends Error {}
type Actor = { id_pengguna: string; password_hash: string };
const iso = (d?: Date | null) => d?.toISOString().slice(0,10) ?? "";
function quantity(value: unknown, zero=false) {
 if(typeof value!=="string"||!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)||(!zero&&Number(value)===0))throw new BakerError("Jumlah harus positif dan maksimal dua desimal.");
 return new Prisma.Decimal(value);
}
const validId=(s: unknown,max: number): s is string => typeof s==="string"&&s.length>0&&s.length<=max;
export function validateUsage(c: BakerCommand) {
 if(!c||typeof c.token!=="string"||!/^[a-f0-9]{15}$/.test(c.token)||!validId(c.productId,10)||!["Selesai","Gagal"].includes(c.status)||typeof c.reason!=="string"||c.reason.length>255||!Array.isArray(c.lines)||c.lines.length<1||c.lines.length>50)throw new BakerError("Lengkapi produk, status, dan bahan yang digunakan.");
 const output=quantity(c.output,c.status==="Gagal");
 if(c.status==="Gagal"&&(!output.isZero()||!c.reason.trim()))throw new BakerError("Produksi gagal harus memiliki alasan dan hasil nol.");
 if(c.status==="Selesai"&&c.reason.trim())throw new BakerError("Alasan gagal hanya untuk produksi gagal.");
 const seen=new Set<string>();
 const lines=c.lines.map(l=>{if(!l||!validId(l.itemId,10)||!validId(l.batchId,15)||!validId(l.unit,10)||seen.has(l.batchId))throw new BakerError("Bahan, batch, atau satuan tidak valid. Gabungkan jumlah untuk batch yang sama.");seen.add(l.batchId);return {...l,amount:quantity(l.amount)};}).sort((a,b)=>a.batchId.localeCompare(b.batchId));
 return {output,lines,reason:c.reason.trim()||null};
}

export async function readBaker(tx: Prisma.TransactionClient): Promise<BakerSnapshot> {
 const today=todayDate();
 const items=await tx.barang.findMany({orderBy:{nama_barang:"asc"}});
 const batches=await tx.detail_barang_masuk.findMany({orderBy:[{barang_masuk:{tanggal_terima:"desc"}},{id_detail_masuk:"asc"}],include:{barang_masuk:{include:{pemasok:true}},detail_barang_dipakai:{select:{jumlah_dipakai:true}}}});
 const history=await tx.barang_dipakai.findMany({orderBy:[{tanggal:"desc"},{id_pemakaian:"desc"}],include:{barang:true,pengguna:{select:{nama_pengguna:true}},detail_barang_dipakai:{include:{barang:true}}}});
 const mapped=items.map(i=>{const latest=batches.find(b=>b.id_barang===i.id_barang);const dates=batches.filter(b=>b.id_barang===i.id_barang&&b.tanggal_kedaluwarsa).map(b=>iso(b.tanggal_kedaluwarsa)).sort();return {id:i.id_barang,name:i.nama_barang,category:i.jenis_barang,stock:Number(i.stok_saat_ini),unit:i.satuan,minimum:Number(i.stok_minimum),received:iso(latest?.barang_masuk.tanggal_terima),supplier:latest?.barang_masuk.pemasok.nama_pemasok??"Belum ada penerimaan",expiry:dates[0]??""};});
 return {today,materials:mapped.filter(i=>i.category==="Bahan Baku"),products:mapped.filter(i=>i.category==="Produk Hasil"),
  batches:batches.map(b=>({id:b.id_detail_masuk,itemId:b.id_barang,received:iso(b.barang_masuk.tanggal_terima),expiry:iso(b.tanggal_kedaluwarsa),condition:b.kondisi,available:Math.max(0,Number(b.jumlah_diterima.minus(b.detail_barang_dipakai.reduce((n,d)=>n.plus(d.jumlah_dipakai),new Prisma.Decimal(0)))))})),
  history:history.map(h=>({id:h.id_pemakaian,date:iso(h.tanggal),productId:h.id_produk_hasil,product:h.barang.nama_barang,quantity:Number(h.jumlah_hasil),unit:h.barang.satuan,status:h.status_produksi,reason:h.alasan_gagal,actor:h.pengguna.nama_pengguna,used:h.detail_barang_dipakai.map(d=>({itemId:d.id_barang,name:d.barang.nama_barang,batchId:d.id_detail_masuk,quantity:Number(d.jumlah_dipakai),unit:d.barang.satuan}))}))};
}

export async function saveBaker(client: PrismaClient,actor: Actor,c: BakerCommand): Promise<BakerOutcome> {
 const {output,lines,reason}=validateUsage(c);
 return client.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id_pengguna FROM public.pengguna WHERE id_pengguna=${actor.id_pengguna} FOR SHARE`;
  const user=await tx.pengguna.findUnique({where:{id_pengguna:actor.id_pengguna},select:{peran:true,status_akun:true,password_hash:true}});
  if(!user||!["Baker","Barista"].includes(user.peran)||user.status_akun!=="ACTIVE"||user.password_hash!==actor.password_hash)throw new BakerError("Hanya Baker atau Barista aktif yang dapat menyimpan pemakaian.");
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${c.token}), 197864784)`;
  const existing=await tx.barang_dipakai.findUnique({where:{id_pemakaian:c.token},include:{detail_barang_dipakai:true}});
  if(existing){const details=existing.detail_barang_dipakai;const same=existing.id_pengguna===actor.id_pengguna&&existing.id_produk_hasil===c.productId&&existing.jenis_keluar==="Produksi"&&existing.jumlah_hasil.equals(output)&&existing.status_produksi===c.status&&existing.alasan_gagal===reason&&details.length===lines.length&&lines.every(l=>details.some(d=>d.id_barang===l.itemId&&d.id_detail_masuk===l.batchId&&d.jumlah_dipakai.equals(l.amount)));
   if(!same)throw new BakerError("ID permintaan sudah digunakan untuk data berbeda.");
   const data=await readBaker(tx);if(lines.some(l=>data.materials.find(m=>m.id===l.itemId)?.unit!==l.unit))throw new BakerError("Satuan barang berubah. Muat ulang halaman.");return {data,replayed:true,changes:[]};
  }
  const ids=[...new Set([c.productId,...lines.map(l=>l.itemId)])].sort();
  // Shared stock row locks coordinate with Daily Worker and Owner operations.
  for(const id of ids)await tx.$queryRaw`SELECT id_barang FROM public.barang WHERE id_barang=${id} FOR UPDATE`;
  const items=await tx.barang.findMany({where:{id_barang:{in:ids}}});
  const product=items.find(i=>i.id_barang===c.productId);
  if(!product||product.jenis_barang!=="Produk Hasil")throw new BakerError("Pilih produk hasil yang tersedia di database.");
  const totals=new Map<string,Prisma.Decimal>();
  for(const l of lines){const item=items.find(i=>i.id_barang===l.itemId);if(!item||item.jenis_barang!=="Bahan Baku"||item.satuan!==l.unit)throw new BakerError("Barang atau satuan tidak sesuai database.");totals.set(l.itemId,(totals.get(l.itemId)??new Prisma.Decimal(0)).plus(l.amount));}
  for(const [id,total] of totals){if(items.find(i=>i.id_barang===id)!.stok_saat_ini.lessThan(total))throw new BakerError("Stok bahan tidak mencukupi. Muat ulang data dan periksa jumlah pemakaian.");}
  for(const l of lines){await tx.$queryRaw`SELECT id_detail_masuk FROM public.detail_barang_masuk WHERE id_detail_masuk=${l.batchId} FOR UPDATE`;const batch=await tx.detail_barang_masuk.findUnique({where:{id_detail_masuk:l.batchId},include:{detail_barang_dipakai:{select:{jumlah_dipakai:true}}}});
   if(!batch||batch.id_barang!==l.itemId||!/^baik$/i.test(batch.kondisi)||batch.tanggal_kedaluwarsa&&iso(batch.tanggal_kedaluwarsa)<todayDate())throw new BakerError("Batch harus sesuai bahan, berkondisi Baik, dan belum kedaluwarsa.");
   const used=batch.detail_barang_dipakai.reduce((n,d)=>n.plus(d.jumlah_dipakai),new Prisma.Decimal(0));
   if(batch.jumlah_diterima.minus(used).lessThan(l.amount))throw new BakerError("Jumlah melebihi penerimaan batch yang belum tercatat dipakai. Pilih batch lain atau periksa stok.");
  }
  const afterProduct=product.stok_saat_ini.plus(output);if(afterProduct.greaterThan("99999999.99"))throw new BakerError("Jumlah produk melampaui kapasitas database.");
  await tx.barang_dipakai.create({data:{id_pemakaian:c.token,id_pengguna:actor.id_pengguna,id_produk_hasil:c.productId,tanggal:new Date(todayDate()+"T00:00:00Z"),jenis_keluar:"Produksi",jumlah_hasil:output,status_produksi:c.status,alasan_gagal:reason,detail_barang_dipakai:{create:lines.map(l=>({id_detail_masuk:l.batchId,id_barang:l.itemId,jumlah_diminta:l.amount,jumlah_dipakai:l.amount,stok_tersedia:items.find(i=>i.id_barang===l.itemId)!.stok_saat_ini}))}}});
  const changes=[];
  for(const [id,amount] of totals){const i=items.find(i=>i.id_barang===id)!,after=i.stok_saat_ini.minus(amount);await tx.barang.update({where:{id_barang:id},data:{stok_saat_ini:after}});changes.push({id,name:i.nama_barang,before:Number(i.stok_saat_ini),used:Number(amount),after:Number(after),unit:i.satuan});}
  if(!output.isZero())await tx.barang.update({where:{id_barang:product.id_barang},data:{stok_saat_ini:afterProduct}});
  return {data:await readBaker(tx),replayed:false,changes};
 },{maxWait:10000,timeout:20000});
}

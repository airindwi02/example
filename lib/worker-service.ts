import { randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "../app/generated/prisma/client";
import { todayDate } from "../app/daily-worker/data";
import type { WorkerSnapshot, WorkerCommand } from "./worker-types";
import { ORDER_STATUS } from "./order-types";
export class WorkerError extends Error {}
type Actor = { id_pengguna: string; password_hash: string };
const decimal = (value: unknown, zero = true) => {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value) || (!zero && Number(value) === 0)) throw new WorkerError("Jumlah harus valid, tidak negatif, dan maksimal dua desimal.");
  return new Prisma.Decimal(value);
};
const date = (value: unknown, optional = false): Date | null => {
  if (optional && !value) return null;
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) throw new WorkerError("Tanggal tidak valid.");
  const d = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== value) throw new WorkerError("Tanggal tidak valid.");
  return d;
};
const iso = (d: Date | null | undefined) => d?.toISOString().slice(0,10) ?? "";
async function actorGuard(tx: Prisma.TransactionClient, actor: Actor) {
  await tx.$queryRaw`SELECT id_pengguna FROM public.pengguna WHERE id_pengguna = ${actor.id_pengguna} FOR SHARE`;
  const user = await tx.pengguna.findUnique({ where:{id_pengguna:actor.id_pengguna},select:{peran:true,status_akun:true,password_hash:true} });
  if (user?.peran !== "Daily Worker" || user.status_akun !== "ACTIVE" || user.password_hash !== actor.password_hash) throw new WorkerError("Hanya Daily Worker aktif yang dapat menyimpan data.");
}
export async function readWorker(tx: Prisma.TransactionClient): Promise<WorkerSnapshot> {
  // A transaction uses one connection: execute reads sequentially.
  const items = await tx.barang.findMany({orderBy:{id_barang:"asc"}});
  const receipts = await tx.barang_masuk.findMany({orderBy:[{tanggal_terima:"desc"},{id_penerimaan:"desc"}],include:{pemasok:true,pengguna:{select:{nama_pengguna:true}},detail_barang_masuk:true}});
  const checks = await tx.pemeriksaan_stok.findMany({orderBy:[{tanggal:"desc"},{id_pemeriksaan:"desc"}],include:{detail_pemeriksaan:true,pengguna:{select:{nama_pengguna:true}}}});
  const orders = await tx.pemesanan_barang.findMany({orderBy:{id_pemesanan:"asc"},include:{detail_pesanan:true,barang_masuk:{include:{detail_barang_masuk:true}}}});
  const suppliers = await tx.pemasok.findMany({orderBy:{nama_pemasok:"asc"}});
  const usage = await tx.detail_barang_dipakai.findMany({include:{barang_dipakai:{select:{tanggal:true}}}});
  const sales = await tx.detail_transaksi.findMany({include:{transaksi:{select:{tanggal:true}}}});
  const details = checks.flatMap(c=>c.detail_pemeriksaan.map(d=>({id_pemeriksaan:c.id_pemeriksaan,id_barang:d.id_barang,tanggal:iso(c.tanggal),stok_sistem:Number(d.stok_sistem),stok_fisik:Number(d.stok_fisik),kondisi_fisik:d.kondisi_fisik,tindak_lanjut:d.tindak_lanjut??"",catatan:"",recordedBy:c.pengguna.nama_pengguna})));
  const adjustments = details.filter(d=>d.tindak_lanjut === "Penyesuaian");
  const receiptDetails = receipts.flatMap(r=>r.detail_barang_masuk.map(d=>({id_penerimaan:r.id_penerimaan,id_barang:d.id_barang,tanggal_terima:iso(r.tanggal_terima),jumlah_diterima:Number(d.jumlah_diterima),nama_pemasok:r.pemasok.nama_pemasok,recordedBy:r.pengguna.nama_pengguna})));
  const names = new Map(items.map(i=>[i.id_barang,i.nama_barang]));
  const movements = [
    ...receiptDetails.map(r=>({id_barang:r.id_barang,tanggal:r.tanggal_terima,jenis:"Masuk",jumlah:r.jumlah_diterima})),
    ...usage.map(u=>({id_barang:u.id_barang,tanggal:iso(u.barang_dipakai.tanggal),jenis:"Pemakaian",jumlah:-Number(u.jumlah_dipakai)})),
    ...sales.map(s=>({id_barang:s.id_barang,tanggal:iso(s.transaksi.tanggal),jenis:"Penjualan",jumlah:-Number(s.jumlah_terjual)})),
    ...adjustments.map(a=>({id_barang:a.id_barang,tanggal:a.tanggal,jenis:"Penyesuaian",jumlah:Number(new Prisma.Decimal(a.stok_fisik).minus(a.stok_sistem))})),
  ].sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  return { today:todayDate(),
    items:items.map(i=>{const r=receiptDetails.find(r=>r.id_barang===i.id_barang),c=details.find(c=>c.id_barang===i.id_barang);return {id_barang:i.id_barang,nama_barang:i.nama_barang,satuan:i.satuan,jenis_barang:i.jenis_barang,stok_minimum:Number(i.stok_minimum),stok_saat_ini:Number(i.stok_saat_ini),ui:{kategori:i.jenis_barang,pemasok:r?.nama_pemasok??"Belum ada penerimaan",terakhir_masuk:r?.tanggal_terima??"",terakhir_periksa:c?.tanggal??"",perlu_cek:!c||c.tanggal!==todayDate()}};}),
    batches:receipts.flatMap(r=>r.detail_barang_masuk.map(d=>({id_detail_masuk:d.id_detail_masuk,id_barang:d.id_barang,jumlah_diterima:Number(d.jumlah_diterima),tanggal_kedaluwarsa:iso(d.tanggal_kedaluwarsa)}))),
    receipts:receiptDetails, checks:details.filter(d=>d.tindak_lanjut!=="Penyesuaian"), adjustments,movements,
    activities:[...receiptDetails.map(r=>({id:r.id_penerimaan+":"+r.id_barang,waktu:r.tanggal_terima,aktivitas:`Terima ${names.get(r.id_barang)} ${r.jumlah_diterima}`,href:"/daily-worker/penerimaan?barang="+r.id_barang,oleh:r.recordedBy})),...details.map(c=>({id:c.id_pemeriksaan+":"+c.id_barang,waktu:c.tanggal,aktivitas:(c.tindak_lanjut==="Penyesuaian"?"Sesuaikan ":"Periksa ")+names.get(c.id_barang),href:"/daily-worker/pemeriksaan?barang="+c.id_barang,oleh:c.recordedBy}))].sort((a,b)=>b.waktu.localeCompare(a.waktu)),
    suppliers:suppliers.map(s=>({id:s.id_pemasok,name:s.nama_pemasok})),
    orders:orders.filter(o=>o.status_pemesanan===ORDER_STATUS.ordered||o.status_pemesanan===ORDER_STATUS.partial).map(o=>({id:o.id_pemesanan,supplierId:o.id_pemasok,status:o.status_pemesanan,items:o.detail_pesanan.map(d=>({id:d.id_barang,remaining:Math.max(0,Number(d.jumlah_dipesan.minus(o.barang_masuk.flatMap(m=>m.detail_barang_masuk).filter(x=>x.id_barang===d.id_barang).reduce((n,x)=>n.plus(x.jumlah_diterima),new Prisma.Decimal(0)))))}))})),
  };
}
function validatedOrderTotals(
  lines: { id_barang: string; jumlah_dipesan: Prisma.Decimal }[],
  receipts: { id_pemasok: string; status_penerimaan: string; detail_barang_masuk: { id_barang: string; jumlah_dikirim: Prisma.Decimal; jumlah_diterima: Prisma.Decimal }[] }[],
  supplierId: string,
) {
  if (!lines.length) throw new WorkerError("Rincian pesanan kosong; status tidak dapat dihitung dengan aman.");
  const totals = new Map(lines.map((line) => [line.id_barang, { sent: new Prisma.Decimal(0), received: new Prisma.Decimal(0), ordered: line.jumlah_dipesan }]));
  for (const receipt of receipts) {
    if (receipt.id_pemasok !== supplierId || receipt.detail_barang_masuk.length === 0) throw new WorkerError("Riwayat penerimaan tidak sesuai pemasok atau tidak memiliki rincian; status tidak diubah.");
    let partialReceipt = false;
    for (const detail of receipt.detail_barang_masuk) {
      const total = totals.get(detail.id_barang);
      if (!total || detail.jumlah_dikirim.lessThanOrEqualTo(0) || detail.jumlah_diterima.lessThanOrEqualTo(0) || detail.jumlah_diterima.greaterThan(detail.jumlah_dikirim)) throw new WorkerError("Riwayat penerimaan tidak valid; status pesanan tidak diubah.");
      if (detail.jumlah_diterima.lessThan(detail.jumlah_dikirim)) partialReceipt = true;
      total.sent = total.sent.plus(detail.jumlah_dikirim);
      total.received = total.received.plus(detail.jumlah_diterima);
      if (total.sent.greaterThan(total.ordered) || total.received.greaterThan(total.ordered)) throw new WorkerError("Riwayat penerimaan melampaui jumlah pesanan; status tidak diubah.");
    }
    if (receipt.status_penerimaan !== (partialReceipt ? "Sebagian" : "Diterima")) throw new WorkerError("Status riwayat penerimaan tidak sesuai jumlah; status pesanan tidak diubah.");
  }
  return totals;
}
export async function saveWorker(client: PrismaClient, actor: Actor, command: WorkerCommand) {
  const c=command;
  if (!c || !["receive","check","adjust"].includes(c.type) || !/^[a-f0-9]{15}$/.test(c.token) || typeof c.id!=="string" || c.id.length>10 || !c.id || typeof c.unit!=="string" || c.unit.length>10) throw new WorkerError("Data atau identitas permintaan tidak valid.");
  const amount=decimal(c.type==="receive"?c.amount:c.actual,c.type!=="receive"); const expected=decimal(c.expectedStock);
  if (c.batch) throw new WorkerError("Pembuangan per batch belum didukung schema. Tidak ada stok yang diubah.");
  if (c.note?.trim()) throw new WorkerError("Catatan bebas belum memiliki kolom penyimpanan. Kosongkan catatan.");
  const acceptedDate=c.type==="receive"?date(c.date)!:date(todayDate())!;
  const expiry=c.type==="receive"?date(c.expiry,true):null;
  const condition=(c.type==="receive"?c.condition:c.reason)||"Baik";
  if(typeof condition!=="string"||!condition.trim()||condition.length>(c.type==="receive"?20:30))throw new WorkerError("Kondisi atau alasan tidak valid.");
  if(c.type==="receive"&&(!c.orderId||c.orderId.length>15||!c.supplierId||c.supplierId.length>10))throw new WorkerError("Pilih pemasok dan pesanan yang sah.");
  const sent=c.type==="receive"?decimal(c.sent,false):null;
  if(sent&&amount.greaterThan(sent))throw new WorkerError("Jumlah diterima tidak boleh melebihi jumlah dikirim.");
  const reason=c.reason?.trim()||null;
  if(c.type==="receive"&&((reason?.length??0)>255||(sent!.greaterThan(amount)&&!reason)))throw new WorkerError("Isi alasan penerimaan sebagian, maksimal 255 karakter.");
  return client.$transaction(async tx=>{
    await actorGuard(tx,actor);
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${c.token}), 197864783)`;
    if(c.type==="receive")await tx.$queryRaw`SELECT id_pemesanan FROM public.pemesanan_barang WHERE id_pemesanan=${c.orderId!} FOR UPDATE`;
    await tx.$queryRaw`SELECT id_barang FROM public.barang WHERE id_barang=${c.id} FOR UPDATE`;
    const item=await tx.barang.findUnique({where:{id_barang:c.id}});if(!item||item.satuan!==c.unit)throw new WorkerError("Barang atau satuan berubah. Muat ulang halaman.");
    if(c.type==="receive") {
      const existing=await tx.barang_masuk.findUnique({where:{id_penerimaan:c.token},include:{detail_barang_masuk:true}});
      if(existing){const d=existing.detail_barang_masuk[0];if(existing.id_pengguna!==actor.id_pengguna||existing.id_pemesanan!==c.orderId||existing.id_pemasok!==c.supplierId||iso(existing.tanggal_terima)!==c.date||existing.alasan_penolakan!==reason||existing.detail_barang_masuk.length!==1||d?.id_barang!==c.id||!d.jumlah_diterima.equals(amount)||!d.jumlah_dikirim.equals(sent!)||d.kondisi!==condition||iso(d.tanggal_kedaluwarsa)!==(c.expiry||""))throw new WorkerError("ID permintaan sudah digunakan untuk data berbeda.");return{data:await readWorker(tx),before:null,after:Number(item.stok_saat_ini),replayed:true};}
      const order=await tx.pemesanan_barang.findUnique({where:{id_pemesanan:c.orderId},include:{detail_pesanan:true,barang_masuk:{include:{detail_barang_masuk:true}}}});
      const line=order?.detail_pesanan.find(d=>d.id_barang===c.id);
      if(!order||!line||order.id_pemasok!==c.supplierId||(order.status_pemesanan!==ORDER_STATUS.ordered&&order.status_pemesanan!==ORDER_STATUS.partial))throw new WorkerError("Barang dan pemasok harus sesuai pesanan yang tersedia.");
      const totals=validatedOrderTotals(order.detail_pesanan,order.barang_masuk.map(receipt=>({id_pemasok:receipt.id_pemasok,status_penerimaan:receipt.status_penerimaan,detail_barang_masuk:receipt.detail_barang_masuk})),order.id_pemasok);
      const received=totals.get(c.id)!.received;
      if(sent!.greaterThan(line.jumlah_dipesan.minus(received)))throw new WorkerError("Jumlah melebihi sisa pesanan. Muat ulang data.");
      const after=item.stok_saat_ini.plus(amount);if(after.greaterThan("99999999.99"))throw new WorkerError("Jumlah stok melampaui kapasitas database.");
      await tx.barang_masuk.create({data:{id_penerimaan:c.token,id_pemesanan:order.id_pemesanan,id_pemasok:c.supplierId!,id_pengguna:actor.id_pengguna,tanggal_terima:acceptedDate,status_penerimaan:sent!.equals(amount)?"Diterima":"Sebagian",alasan_penolakan:reason,detail_barang_masuk:{create:{id_detail_masuk:randomBytes(8).toString("hex").slice(0,15),id_barang:item.id_barang,jumlah_dikirim:sent!,jumlah_diterima:amount,tanggal_kedaluwarsa:expiry,kondisi:condition}}}});
      await tx.barang.update({where:{id_barang:c.id},data:{stok_saat_ini:after}});
      const updatedReceipts=await tx.barang_masuk.findMany({where:{id_pemesanan:order.id_pemesanan},select:{id_pemasok:true,status_penerimaan:true,detail_barang_masuk:{select:{id_barang:true,jumlah_dikirim:true,jumlah_diterima:true}}}});
      const updatedTotals=validatedOrderTotals(order.detail_pesanan,updatedReceipts,order.id_pemasok);
      const allReceived=[...updatedTotals.values()].every(total=>total.received.equals(total.ordered));
      const anyReceived=[...updatedTotals.values()].some(total=>total.received.greaterThan(0));
      await tx.pemesanan_barang.update({where:{id_pemesanan:order.id_pemesanan},data:{status_pemesanan:allReceived?ORDER_STATUS.complete:anyReceived?ORDER_STATUS.partial:ORDER_STATUS.ordered}});
      return{data:await readWorker(tx),before:Number(item.stok_saat_ini),after:Number(after),replayed:false};
    }
    const tag=c.type==="adjust"?"Penyesuaian":"Pemeriksaan";
    const existing=await tx.pemeriksaan_stok.findUnique({where:{id_pemeriksaan:c.token},include:{detail_pemeriksaan:true}});
    if(existing){const d=existing.detail_pemeriksaan[0];if(existing.id_pengguna!==actor.id_pengguna||existing.detail_pemeriksaan.length!==1||d?.id_barang!==c.id||!d.stok_sistem.equals(expected)||!d.stok_fisik.equals(amount)||d.kondisi_fisik!==condition||d.tindak_lanjut!==tag)throw new WorkerError("ID permintaan sudah digunakan untuk data berbeda.");return{data:await readWorker(tx),before:Number(d.stok_sistem),after:Number(item.stok_saat_ini),replayed:true};}
    if(!item.stok_saat_ini.equals(expected))throw new WorkerError("Stok berubah sejak dibuka. Muat ulang dan hitung kembali sebelum menyimpan.");
    await tx.pemeriksaan_stok.create({data:{id_pemeriksaan:c.token,id_pengguna:actor.id_pengguna,tanggal:acceptedDate,detail_pemeriksaan:{create:{id_barang:c.id,stok_sistem:item.stok_saat_ini,stok_fisik:amount,kondisi_fisik:condition,tindak_lanjut:tag}}}});
    if(c.type==="adjust")await tx.barang.update({where:{id_barang:c.id},data:{stok_saat_ini:amount}});
    return{data:await readWorker(tx),before:Number(item.stok_saat_ini),after:Number(c.type==="adjust"?amount:item.stok_saat_ini),replayed:false};
  },{maxWait:10000,timeout:15000});
}

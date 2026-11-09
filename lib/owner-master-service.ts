import { randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "../app/generated/prisma/client";
import type { MasterInput, MasterSnapshot } from "./owner-master-types";

import {pricingEnabled} from "./payment-policy";
import {paymentReady} from "./payment-service";
export class MasterError extends Error {}
type Actor = { id_pengguna: string; password_hash: string };
async function assertActor(tx: Prisma.TransactionClient, actor: Actor) {
  await tx.$queryRaw`SELECT id_pengguna FROM public.pengguna WHERE id_pengguna = ${actor.id_pengguna} FOR SHARE`;
  const current = await tx.pengguna.findUnique({ where: { id_pengguna: actor.id_pengguna }, select: { peran: true, status_akun: true, password_hash: true } });
  if (current?.peran !== "Owner" || current.status_akun !== "ACTIVE" || current.password_hash !== actor.password_hash) throw new MasterError("Hanya Owner aktif yang dapat mengelola master data.");
}
export async function readMaster(tx: Prisma.TransactionClient): Promise<MasterSnapshot> {
  const [items, suppliers] = await Promise.all([
    tx.barang.findMany({ orderBy: { id_barang: "asc" }, include: { detail_barang_masuk: { select: { barang_masuk: { select: { pemasok: { select: { nama_pemasok: true } } } } } } } }),
    tx.pemasok.findMany({ orderBy: { id_pemasok: "asc" }, include: { barang_masuk: { select: { detail_barang_masuk: { select: { barang: { select: { nama_barang: true } } } } } } } }),
  ]);
  const unique = (values: string[]) => [...new Set(values)].sort((a,b) => a.localeCompare(b,"id"));
  const ready=pricingEnabled()&&await paymentReady(tx);
  const prices=ready?await tx.$queryRaw<{id_barang:string;harga_jual:import("../app/generated/prisma/client").Prisma.Decimal|null}[]>`SELECT id_barang,harga_jual FROM barang`:[];
  return {
    pricing:{enabled:ready,prices:Object.fromEntries(prices.map(p=>[p.id_barang,p.harga_jual?.toFixed(2)??null]))},
    ingredients: items.map(i => ({ id: i.id_barang, name: i.nama_barang, category: i.jenis_barang, unit: i.satuan, stock: Number(i.stok_saat_ini), minimum: Number(i.stok_minimum), supplier: unique(i.detail_barang_masuk.map(d => d.barang_masuk.pemasok.nama_pemasok)).join(", ") || "Belum ada riwayat penerimaan" })),
    suppliers: suppliers.map(s => ({ id: s.id_pemasok, name: s.nama_pemasok, phone: s.telepon, address: s.alamat ?? "", goods: unique(s.barang_masuk.flatMap(m => m.detail_barang_masuk.map(d => d.barang.nama_barang))).join(", ") || "Belum ada riwayat penerimaan" })),
    units: unique(items.map(i=>i.satuan)).map(unit=>({ id: unit, name: unit, symbol: unit })),
    categories: unique(["Bahan Baku", "Produk Hasil", ...items.map(i=>i.jenis_barang)]),
  };
}
export function validateMaster(raw: unknown): MasterInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new MasterError("Data tidak valid.");
  const r = raw as Record<string, unknown>;
  const text = (key: string, max: number, required = false) => {
    const value = r[key];
    if (value === undefined && !required) return "";
    if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new MasterError(`Data ${key} tidak valid atau melebihi panjang yang diizinkan.`);
    return value.trim();
  };
  if (r.kind !== "barang" && r.kind !== "pemasok") throw new MasterError("Jenis master data tidak valid.");
  const input: MasterInput = { kind: r.kind, id: text("id",10) || undefined, name: text("name",50,true) };
  if (input.id && !/^[A-Za-z0-9_-]{1,10}$/.test(input.id)) throw new MasterError("ID data tidak valid.");
  if (r.kind === "barang") {
    input.category = text("category",15,true); input.unit = text("unit",10,true); input.minimum = text("minimum",16,true);
    if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(input.minimum) || Number(input.minimum) > 99999999.99) throw new MasterError("Batas minimum harus angka 0–99999999.99 dengan maksimal dua desimal; gunakan titik.");
    if (Object.hasOwn(r,"stock") || Object.hasOwn(r,"stok_saat_ini")) throw new MasterError("Stok tidak dapat diubah melalui Master Data.");
  } else {
    input.phone = text("phone",20,true); input.address = text("address",255);
    if (!/^\+?[0-9 -]{8,20}$/.test(input.phone)) throw new MasterError("Nomor telepon pemasok tidak valid.");
  }
  return input;
}
export async function saveMaster(client: PrismaClient, actor: Actor, raw: unknown) {
  const input = validateMaster(raw);
  return client.$transaction(async tx => {
    await assertActor(tx,actor);
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1484312401, 197864782)`;
    const id = input.id ?? randomBytes(5).toString("hex");
    if (input.kind === "barang") {
      if (await tx.barang.findFirst({ where: { nama_barang: { equals: input.name, mode: "insensitive" }, ...(input.id ? { NOT: { id_barang: input.id } } : {}) }, select: { id_barang: true } })) throw new MasterError("Nama barang sudah digunakan.");
      const data = { nama_barang: input.name, jenis_barang: input.category!, satuan: input.unit!, stok_minimum: input.minimum! };
      if (input.id) await tx.barang.update({ where: { id_barang: id }, data });
      else await tx.barang.create({ data: { ...data, id_barang: id, stok_saat_ini: "0" } });
    } else {
      if (await tx.pemasok.findFirst({ where: { nama_pemasok: { equals: input.name, mode: "insensitive" }, ...(input.id ? { NOT: { id_pemasok: input.id } } : {}) }, select: { id_pemasok: true } })) throw new MasterError("Nama pemasok sudah digunakan.");
      const data = { nama_pemasok: input.name, telepon: input.phone!, alamat: input.address || null };
      if (input.id) await tx.pemasok.update({ where: { id_pemasok: id }, data });
      else await tx.pemasok.create({ data: { ...data, id_pemasok: id } });
    }
    return { id, data: await readMaster(tx) };
  });
}
export async function deleteMaster(client: PrismaClient, actor: Actor, kind: unknown, id: unknown) {
  if (!["barang","pemasok"].includes(String(kind)) || typeof id !== "string" || !/^[A-Za-z0-9_-]{1,10}$/.test(id)) throw new MasterError("Data penghapusan tidak valid.");
  return client.$transaction(async tx => {
    await assertActor(tx,actor);
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1484312401, 197864782)`;
    if (kind === "barang") {
      await tx.$queryRaw`SELECT id_barang FROM public.barang WHERE id_barang = ${id} FOR UPDATE`;
      const item = await tx.barang.findUnique({ where: { id_barang: id }, include: { _count: { select: { barang_dipakai: true, detail_barang_dipakai: true, detail_barang_masuk: true, detail_laporan: true, detail_pemeriksaan: true, detail_pesanan: true, detail_transaksi: true } } } });
      if (!item) throw new MasterError("Barang tidak ditemukan.");
      if (Number(item.stok_saat_ini) !== 0 || Object.values(item._count).some(count=>count>0)) throw new MasterError("Barang masih memiliki stok atau digunakan pada riwayat. Data tidak dihapus.");
      await tx.barang.delete({ where: { id_barang: id } });
    } else {
      await tx.$queryRaw`SELECT id_pemasok FROM public.pemasok WHERE id_pemasok = ${id} FOR UPDATE`;
      const supplier = await tx.pemasok.findUnique({ where: { id_pemasok: id }, include: { _count: { select: { barang_masuk: true, pemesanan_barang: true } } } });
      if (!supplier) throw new MasterError("Pemasok tidak ditemukan.");
      if (Object.values(supplier._count).some(count=>count>0)) throw new MasterError("Pemasok digunakan pada pemesanan atau penerimaan. Data tidak dihapus.");
      await tx.pemasok.delete({ where: { id_pemasok: id } });
    }
    return readMaster(tx);
  });
}

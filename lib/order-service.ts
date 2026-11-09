import "server-only";
import { Prisma, type PrismaClient } from "../app/generated/prisma/client";
import { ORDER_STATUS, type OrderCommand, type OrderSnapshot } from "./order-types";

export class OrderError extends Error {}
type Actor = { id_pengguna: string; password_hash: string };
const dateValue = (value: unknown) => {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) throw new OrderError("Tanggal pesanan tidak valid.");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new OrderError("Tanggal pesanan tidak valid.");
  return parsed;
};
const moneyOrQuantity = (value: unknown, label: string, maxIntegerDigits: number) => {
  if (typeof value !== "string" || !new RegExp(`^(?:0|[1-9]\\d{0,${maxIntegerDigits - 1}})(?:\\.\\d{1,2})?$`).test(value)) throw new OrderError(`${label} harus angka valid dengan maksimal dua desimal.`);
  const result = new Prisma.Decimal(value);
  if (result.lessThanOrEqualTo(0)) throw new OrderError(`${label} harus lebih besar dari nol.`);
  return result;
};

export function validateOrder(raw: unknown): OrderCommand {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new OrderError("Data pesanan tidak valid.");
  const value = raw as Record<string, unknown>;
  if (typeof value.requestId !== "string" || !/^[a-f0-9]{15}$/.test(value.requestId)) throw new OrderError("ID permintaan pesanan tidak valid.");
  if (typeof value.supplierId !== "string" || !/^[A-Za-z0-9_-]{1,10}$/.test(value.supplierId)) throw new OrderError("Pilih pemasok yang valid.");
  const orderDate = dateValue(value.orderDate);
  const estimatedDate = dateValue(value.estimatedDate);
  if (estimatedDate < orderDate) throw new OrderError("Estimasi penerimaan tidak boleh sebelum tanggal pemesanan.");
  if (!Array.isArray(value.lines) || value.lines.length < 1 || value.lines.length > 100) throw new OrderError("Pesanan harus memiliki 1 sampai 100 baris barang.");
  const seen = new Set<string>();
  const lines = value.lines.map((line) => {
    if (!line || typeof line !== "object" || Array.isArray(line)) throw new OrderError("Rincian pesanan tidak valid.");
    const item = line as Record<string, unknown>;
    if (typeof item.itemId !== "string" || !/^[A-Za-z0-9_-]{1,10}$/.test(item.itemId) || seen.has(item.itemId)) throw new OrderError("Barang tidak valid atau tercantum lebih dari sekali.");
    seen.add(item.itemId);
    const quantity = moneyOrQuantity(item.quantity, "Jumlah barang", 8);
    const price = moneyOrQuantity(item.price, "Harga pemesanan", 10);
    return { itemId: item.itemId, quantity: quantity.toFixed(2), price: price.toFixed(2) };
  });
  return { requestId: value.requestId, supplierId: value.supplierId, orderDate: orderDate.toISOString().slice(0, 10), estimatedDate: estimatedDate.toISOString().slice(0, 10), lines };
}

async function assertOwner(tx: Prisma.TransactionClient, actor: Actor) {
  await tx.$queryRaw`SELECT id_pengguna FROM public.pengguna WHERE id_pengguna=${actor.id_pengguna} FOR SHARE`;
  const current = await tx.pengguna.findUnique({ where: { id_pengguna: actor.id_pengguna }, select: { peran: true, status_akun: true, password_hash: true } });
  if (current?.peran !== "Owner" || current.status_akun !== "ACTIVE" || current.password_hash !== actor.password_hash) throw new OrderError("Hanya Owner aktif yang dapat mengelola pesanan.");
}

export async function readOrders(tx: Prisma.TransactionClient): Promise<OrderSnapshot> {
  const [suppliers, items, orders] = await Promise.all([
    tx.pemasok.findMany({ orderBy: { nama_pemasok: "asc" }, select: { id_pemasok: true, nama_pemasok: true } }),
    tx.barang.findMany({ orderBy: { nama_barang: "asc" }, select: { id_barang: true, nama_barang: true, satuan: true } }),
    tx.pemesanan_barang.findMany({ orderBy: [{ tanggal_pemesanan: "desc" }, { id_pemesanan: "desc" }], include: { pemasok: true, pengguna: { select: { nama_pengguna: true } }, detail_pesanan: { include: { barang: { select: { nama_barang: true, satuan: true } } }, orderBy: { id_barang: "asc" } }, barang_masuk: { include: { detail_barang_masuk: true } } } }),
  ]);
  return {
    suppliers: suppliers.map((s) => ({ id: s.id_pemasok, name: s.nama_pemasok })),
    items: items.map((b) => ({ id: b.id_barang, name: b.nama_barang, unit: b.satuan })),
    orders: orders.map((order) => ({
      id: order.id_pemesanan, supplierId: order.id_pemasok, supplierName: order.pemasok.nama_pemasok, createdBy: order.pengguna.nama_pengguna,
      orderDate: order.tanggal_pemesanan.toISOString().slice(0, 10), estimatedDate: order.tanggal_estimasi.toISOString().slice(0, 10), status: order.status_pemesanan,
      lines: order.detail_pesanan.map((line) => {
        const received = order.barang_masuk.flatMap((receipt) => receipt.detail_barang_masuk).filter((detail) => detail.id_barang === line.id_barang).reduce((total, detail) => total.plus(detail.jumlah_diterima), new Prisma.Decimal(0));
        return { itemId: line.id_barang, itemName: line.barang.nama_barang, unit: line.barang.satuan, quantity: line.jumlah_dipesan.toFixed(2), price: line.harga_pesan.toFixed(2), received: received.toFixed(2) };
      }),
    })),
  };
}

export async function createOrder(client: PrismaClient, actor: Actor, raw: unknown) {
  const input = validateOrder(raw);
  return client.$transaction(async (tx) => {
    await assertOwner(tx, actor);
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${input.requestId}), 197864784)`;
    const existing = await tx.pemesanan_barang.findUnique({ where: { id_pemesanan: input.requestId }, include: { detail_pesanan: true } });
    if (existing) {
      const same = existing.id_pengguna === actor.id_pengguna && existing.id_pemasok === input.supplierId && existing.tanggal_pemesanan.toISOString().slice(0, 10) === input.orderDate && existing.tanggal_estimasi.toISOString().slice(0, 10) === input.estimatedDate && existing.detail_pesanan.length === input.lines.length && input.lines.every((line) => existing.detail_pesanan.some((saved) => saved.id_barang === line.itemId && saved.jumlah_dipesan.equals(line.quantity) && saved.harga_pesan.equals(line.price)));
      if (!same) throw new OrderError("ID permintaan sudah dipakai untuk isi pesanan berbeda.");
      return { id: existing.id_pemesanan, replayed: true, data: await readOrders(tx) };
    }
    if (!await tx.pemasok.findUnique({ where: { id_pemasok: input.supplierId }, select: { id_pemasok: true } })) throw new OrderError("Pemasok tidak ditemukan.");
    const found = await tx.barang.findMany({ where: { id_barang: { in: input.lines.map((line) => line.itemId) } }, select: { id_barang: true } });
    if (found.length !== input.lines.length) throw new OrderError("Satu atau lebih barang tidak ditemukan.");
    await tx.pemesanan_barang.create({ data: { id_pemesanan: input.requestId, id_pemasok: input.supplierId, id_pengguna: actor.id_pengguna, tanggal_pemesanan: dateValue(input.orderDate), tanggal_estimasi: dateValue(input.estimatedDate), status_pemesanan: ORDER_STATUS.ordered, detail_pesanan: { create: input.lines.map((line) => ({ id_barang: line.itemId, jumlah_dipesan: line.quantity, harga_pesan: line.price })) } } });
    return { id: input.requestId, replayed: false, data: await readOrders(tx) };
  }, { maxWait: 10000, timeout: 15000 });
}

export async function cancelOrder(client: PrismaClient, actor: Actor, id: unknown) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,15}$/.test(id)) throw new OrderError("ID pesanan tidak valid.");
  return client.$transaction(async (tx) => {
    await assertOwner(tx, actor);
    await tx.$queryRaw`SELECT id_pemesanan FROM public.pemesanan_barang WHERE id_pemesanan=${id} FOR UPDATE`;
    const order = await tx.pemesanan_barang.findUnique({ where: { id_pemesanan: id }, include: { barang_masuk: { select: { id_penerimaan: true } } } });
    if (!order) throw new OrderError("Pesanan tidak ditemukan.");
    if (order.status_pemesanan === ORDER_STATUS.cancelled) return readOrders(tx);
    if (order.status_pemesanan !== ORDER_STATUS.ordered || order.barang_masuk.length > 0) throw new OrderError("Pesanan hanya dapat dibatalkan sebelum penerimaan pertama.");
    await tx.pemesanan_barang.update({ where: { id_pemesanan: id }, data: { status_pemesanan: ORDER_STATUS.cancelled } });
    return readOrders(tx);
  }, { maxWait: 10000, timeout: 15000 });
}

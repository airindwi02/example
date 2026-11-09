import "server-only";

import { Prisma } from "../app/generated/prisma/client";
import { todayDate } from "../app/daily-worker/data";
import { prisma } from "./prisma";
import { requireMasterOwner } from "./owner-master";

export type OwnerMovementKind = "Masuk" | "Pemakaian" | "Penjualan" | "Penyesuaian";
export type OwnerMovement = {
  key: string;
  id: string;
  date: string;
  itemId: string;
  item: string;
  category: string;
  amount: number;
  unit: string;
  kind: OwnerMovementKind;
  supplier: string;
  recorder: string;
  status: string;
};
export type OwnerDashboardData = {
  totalItems: number;
  stockedItems: number;
  lowStockItems: number;
  successfulSalesToday: number;
  lowStock: { id: string; name: string; category: string; unit: string; stock: number; minimum: number }[];
  latestMovements: OwnerMovement[];
  latestSales: { id: string; date: string; status: string; user: string; products: string; quantity: number }[];
};
export type InventoryReportRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  openingStock: number | null;
  incoming: number;
  outgoing: number;
  adjustment: number;
  closingStock: number | null;
  currentStock: number;
  minimum: number;
};
export type InventoryReport = {
  start: string;
  end: string;
  category: string;
  rows: InventoryReportRow[];
  totals: { incomingLines: number; outgoingLines: number; adjustedItems: number; lowStockItems: number };
  hasSavedSnapshot: boolean;
};
export type OwnerSearchResults = {
  query: string;
  items: { id: string; name: string; category: string; unit: string; stock: number; minimum: number }[];
  movements: OwnerMovement[];
};

const iso = (value: Date) => value.toISOString().slice(0, 10);
const number = (value: Prisma.Decimal | number) => Number(value);
const dateAtJakarta = (value: string) => new Date(`${value}T00:00:00.000Z`);
const itemTerm = (value: string) => ({ contains: value, mode: "insensitive" as const });

async function movementRows() {
  const [receipts, usage, sales, checks] = await Promise.all([
    prisma.barang_masuk.findMany({
      orderBy: [{ tanggal_terima: "desc" }, { id_penerimaan: "desc" }],
      include: { pemasok: { select: { nama_pemasok: true } }, pengguna: { select: { nama_pengguna: true } }, detail_barang_masuk: { include: { barang: true } } },
    }),
    prisma.barang_dipakai.findMany({
      orderBy: [{ tanggal: "desc" }, { id_pemakaian: "desc" }],
      include: { pengguna: { select: { nama_pengguna: true } }, detail_barang_dipakai: { include: { barang: true } } },
    }),
    prisma.transaksi.findMany({
      where: { status_transaksi: "Berhasil" },
      orderBy: [{ tanggal: "desc" }, { id_transaksi: "desc" }],
      select: { id_transaksi: true, tanggal: true, status_transaksi: true, pengguna: { select: { nama_pengguna: true } }, detail_transaksi: { select: { id_barang: true, jumlah_terjual: true, barang: { select: { nama_barang: true, jenis_barang: true, satuan: true } } } } },
    }),
    prisma.pemeriksaan_stok.findMany({
      where: { detail_pemeriksaan: { some: { tindak_lanjut: "Penyesuaian" } } },
      orderBy: [{ tanggal: "desc" }, { id_pemeriksaan: "desc" }],
      include: { pengguna: { select: { nama_pengguna: true } }, detail_pemeriksaan: { include: { barang: true } } },
    }),
  ]);

  const rows: OwnerMovement[] = [];
  for (const receipt of receipts) {
    for (const detail of receipt.detail_barang_masuk) {
      const amount = number(detail.jumlah_diterima);
      if (amount <= 0 || !["Diterima", "Sebagian"].includes(receipt.status_penerimaan)) continue;
      rows.push({ key: `masuk:${receipt.id_penerimaan}:${detail.id_barang}`, id: receipt.id_penerimaan, date: iso(receipt.tanggal_terima), itemId: detail.id_barang, item: detail.barang.nama_barang, category: detail.barang.jenis_barang, amount, unit: detail.barang.satuan, kind: "Masuk", supplier: receipt.pemasok.nama_pemasok, recorder: receipt.pengguna.nama_pengguna, status: receipt.status_penerimaan });
    }
  }
  for (const record of usage) {
    for (const detail of record.detail_barang_dipakai) {
      const amount = number(detail.jumlah_dipakai);
      if (amount <= 0) continue;
      rows.push({ key: `pakai:${record.id_pemakaian}:${detail.id_barang}`, id: record.id_pemakaian, date: iso(record.tanggal), itemId: detail.id_barang, item: detail.barang.nama_barang, category: detail.barang.jenis_barang, amount, unit: detail.barang.satuan, kind: "Pemakaian", supplier: "", recorder: record.pengguna.nama_pengguna, status: record.status_produksi });
    }
  }
  for (const record of sales) {
    for (const detail of record.detail_transaksi) {
      const amount = number(detail.jumlah_terjual);
      if (amount <= 0) continue;
      rows.push({ key: `jual:${record.id_transaksi}:${detail.id_barang}`, id: record.id_transaksi, date: iso(record.tanggal), itemId: detail.id_barang, item: detail.barang.nama_barang, category: detail.barang.jenis_barang, amount, unit: detail.barang.satuan, kind: "Penjualan", supplier: "", recorder: record.pengguna.nama_pengguna, status: record.status_transaksi });
    }
  }
  for (const record of checks) {
    for (const detail of record.detail_pemeriksaan) {
      if (detail.tindak_lanjut !== "Penyesuaian") continue;
      const delta = number(detail.stok_fisik.minus(detail.stok_sistem));
      if (delta === 0) continue;
      rows.push({ key: `koreksi:${record.id_pemeriksaan}:${detail.id_barang}`, id: record.id_pemeriksaan, date: iso(record.tanggal), itemId: detail.id_barang, item: detail.barang.nama_barang, category: detail.barang.jenis_barang, amount: delta, unit: detail.barang.satuan, kind: "Penyesuaian", supplier: "", recorder: record.pengguna.nama_pengguna, status: detail.kondisi_fisik });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id) || a.item.localeCompare(b.item, "id"));
}

export async function readOwnerDashboard(): Promise<OwnerDashboardData> {
  await requireMasterOwner();
  const today = todayDate();
  const [items, successfulSalesToday, sales, movements] = await Promise.all([
    prisma.barang.findMany({ orderBy: [{ stok_saat_ini: "asc" }, { nama_barang: "asc" }] }),
    prisma.transaksi.count({ where: { status_transaksi: "Berhasil", tanggal: dateAtJakarta(today) } }),
    prisma.transaksi.findMany({ orderBy: [{ tanggal: "desc" }, { id_transaksi: "desc" }], take: 8, select: { id_transaksi: true, tanggal: true, status_transaksi: true, pengguna: { select: { nama_pengguna: true } }, detail_transaksi: { select: { jumlah_terjual: true, barang: { select: { nama_barang: true } } } } } }),
    movementRows(),
  ]);
  const lowStock = items.filter((item) => item.stok_saat_ini.lessThanOrEqualTo(item.stok_minimum)).map((item) => ({ id: item.id_barang, name: item.nama_barang, category: item.jenis_barang, unit: item.satuan, stock: number(item.stok_saat_ini), minimum: number(item.stok_minimum) }));
  return {
    totalItems: items.length,
    stockedItems: items.filter((item) => item.stok_saat_ini.greaterThan(0)).length,
    lowStockItems: lowStock.length,
    successfulSalesToday,
    lowStock,
    latestMovements: movements.slice(0, 6),
    latestSales: sales.map((sale) => ({ id: sale.id_transaksi, date: iso(sale.tanggal), status: sale.status_transaksi, user: sale.pengguna.nama_pengguna, products: sale.detail_transaksi.map((detail) => detail.barang.nama_barang).join(", ") || "—", quantity: sale.status_transaksi === "Berhasil" ? sale.detail_transaksi.reduce((sum, detail) => sum + number(detail.jumlah_terjual), 0) : 0 })),
  };
}

export async function readOwnerMovements(): Promise<OwnerMovement[]> {
  await requireMasterOwner();
  return movementRows();
}

export async function readInventoryReport(input: { start: string; end: string; category: string }): Promise<InventoryReport> {
  await requireMasterOwner();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.start) || !/^\d{4}-\d{2}-\d{2}$/.test(input.end) || input.start > input.end || input.end > "2100-12-31" || input.start < "2000-01-01") throw new Error("Periode laporan tidak valid.");
  const start = dateAtJakarta(input.start);
  if (iso(start) !== input.start || iso(dateAtJakarta(input.end)) !== input.end) throw new Error("Periode laporan tidak valid.");
  const endExclusive = new Date(dateAtJakarta(input.end).getTime() + 86_400_000);
  const [items, receipts, usage, sales, checks, snapshot] = await Promise.all([
    prisma.barang.findMany({ where: input.category === "Semua Kategori" ? undefined : { jenis_barang: input.category }, orderBy: { nama_barang: "asc" } }),
    prisma.detail_barang_masuk.findMany({ where: { barang_masuk: { is: { tanggal_terima: { gte: start, lt: endExclusive }, status_penerimaan: { in: ["Diterima", "Sebagian"] } } }, jumlah_diterima: { gt: 0 } }, include: { barang: true, barang_masuk: { select: { status_penerimaan: true } } } }),
    prisma.detail_barang_dipakai.findMany({ where: { barang_dipakai: { is: { tanggal: { gte: start, lt: endExclusive } } }, jumlah_dipakai: { gt: 0 } }, include: { barang: true, barang_dipakai: { select: { status_produksi: true } } } }),
    prisma.detail_transaksi.findMany({ where: { transaksi: { is: { tanggal: { gte: start, lt: endExclusive }, status_transaksi: "Berhasil" } }, jumlah_terjual: { gt: 0 } }, include: { barang: true } }),
    prisma.detail_pemeriksaan.findMany({ where: { pemeriksaan_stok: { is: { tanggal: { gte: start, lt: endExclusive } } }, tindak_lanjut: "Penyesuaian" }, include: { barang: true } }),
    prisma.laporan_persediaan.findFirst({ where: { periode_awal: start, periode_akhir: dateAtJakarta(input.end) }, orderBy: [{ tanggal: "desc" }, { id_laporan: "desc" }], include: { detail_laporan: true } }),
  ]);
  const opening = new Map((snapshot?.detail_laporan ?? []).map((detail) => [detail.id_barang, { start: number(detail.stok_awal), end: number(detail.stok_akhir) }]));
  const sumByItem = (rows: { id_barang: string; value: Prisma.Decimal | number }[]) => {
    const result = new Map<string, number>();
    for (const row of rows) result.set(row.id_barang, (result.get(row.id_barang) ?? 0) + number(row.value));
    return result;
  };
  const incoming = sumByItem(receipts.map((row) => ({ id_barang: row.id_barang, value: row.jumlah_diterima })));
  const used = sumByItem(usage.map((row) => ({ id_barang: row.id_barang, value: row.jumlah_dipakai })));
  const sold = sumByItem(sales.map((row) => ({ id_barang: row.id_barang, value: row.jumlah_terjual })));
  const adjustment = new Map<string, number>();
  for (const row of checks) adjustment.set(row.id_barang, (adjustment.get(row.id_barang) ?? 0) + number(row.stok_fisik.minus(row.stok_sistem)));
  const rows = items.map((item) => ({
    id: item.id_barang,
    name: item.nama_barang,
    category: item.jenis_barang,
    unit: item.satuan,
    openingStock: opening.get(item.id_barang)?.start ?? null,
    incoming: incoming.get(item.id_barang) ?? 0,
    outgoing: (used.get(item.id_barang) ?? 0) + (sold.get(item.id_barang) ?? 0),
    adjustment: adjustment.get(item.id_barang) ?? 0,
    closingStock: opening.get(item.id_barang)?.end ?? null,
    currentStock: number(item.stok_saat_ini),
    minimum: number(item.stok_minimum),
  }));
  const itemIds = new Set(items.map((item) => item.id_barang));
  return {
    start: input.start,
    end: input.end,
    category: input.category,
    rows,
    totals: {
      incomingLines: receipts.filter((row) => itemIds.has(row.id_barang)).length,
      outgoingLines: usage.filter((row) => itemIds.has(row.id_barang)).length + sales.filter((row) => itemIds.has(row.id_barang)).length,
      adjustedItems: new Set(checks.filter((row) => itemIds.has(row.id_barang) && !row.stok_fisik.equals(row.stok_sistem)).map((row) => row.id_barang)).size,
      lowStockItems: items.filter((item) => item.stok_saat_ini.lessThanOrEqualTo(item.stok_minimum)).length,
    },
    hasSavedSnapshot: !!snapshot,
  };
}

export async function searchOwnerData(rawQuery: string): Promise<OwnerSearchResults> {
  await requireMasterOwner();
  const query = rawQuery.trim().slice(0, 80);
  if (!query) return { query, items: [], movements: [] };
  const term = itemTerm(query);
  const items = await prisma.barang.findMany({ where: { OR: [{ id_barang: term }, { nama_barang: term }] }, orderBy: { nama_barang: "asc" }, take: 50 });
  const itemIds = items.map((item) => item.id_barang);
  const containsId = itemTerm(query);
  const matchingDetails = itemIds.length ? { where: { id_barang: { in: itemIds } } } : {};
  const [receipts, usage, sales, checks] = await Promise.all([
    prisma.barang_masuk.findMany({ where: { OR: [{ id_penerimaan: containsId }, { detail_barang_masuk: { some: { id_barang: { in: itemIds } } } }] }, orderBy: [{ tanggal_terima: "desc" }, { id_penerimaan: "desc" }], take: 50, include: { pemasok: { select: { nama_pemasok: true } }, pengguna: { select: { nama_pengguna: true } }, detail_barang_masuk: { ...matchingDetails, include: { barang: true } } } }),
    prisma.barang_dipakai.findMany({ where: { OR: [{ id_pemakaian: containsId }, { detail_barang_dipakai: { some: { id_barang: { in: itemIds } } } }] }, orderBy: [{ tanggal: "desc" }, { id_pemakaian: "desc" }], take: 50, include: { pengguna: { select: { nama_pengguna: true } }, detail_barang_dipakai: { ...matchingDetails, include: { barang: true } } } }),
    prisma.transaksi.findMany({ where: { status_transaksi: "Berhasil", OR: [{ id_transaksi: containsId }, { detail_transaksi: { some: { id_barang: { in: itemIds } } } }] }, orderBy: [{ tanggal: "desc" }, { id_transaksi: "desc" }], take: 50, select: { id_transaksi: true, tanggal: true, status_transaksi: true, pengguna: { select: { nama_pengguna: true } }, detail_transaksi: { ...matchingDetails, select: { id_barang: true, jumlah_terjual: true, barang: { select: { nama_barang: true, jenis_barang: true, satuan: true } } } } } }),
    prisma.pemeriksaan_stok.findMany({ where: { OR: [{ id_pemeriksaan: containsId }, { detail_pemeriksaan: { some: { tindak_lanjut: "Penyesuaian", id_barang: { in: itemIds } } } }] }, orderBy: [{ tanggal: "desc" }, { id_pemeriksaan: "desc" }], take: 50, include: { pengguna: { select: { nama_pengguna: true } }, detail_pemeriksaan: { where: { tindak_lanjut: "Penyesuaian", ...(itemIds.length ? { id_barang: { in: itemIds } } : {}) }, include: { barang: true } } } }),
  ]);
  const movements: OwnerMovement[] = [];
  for (const header of receipts) for (const detail of header.detail_barang_masuk) if (detail.jumlah_diterima.greaterThan(0) && ["Diterima", "Sebagian"].includes(header.status_penerimaan)) movements.push({ key: `masuk:${header.id_penerimaan}:${detail.id_barang}`, id: header.id_penerimaan, date: iso(header.tanggal_terima), itemId: detail.id_barang, item: detail.barang.nama_barang, category: detail.barang.jenis_barang, amount: number(detail.jumlah_diterima), unit: detail.barang.satuan, kind: "Masuk", supplier: header.pemasok.nama_pemasok, recorder: header.pengguna.nama_pengguna, status: header.status_penerimaan });
  for (const header of usage) for (const detail of header.detail_barang_dipakai) if (detail.jumlah_dipakai.greaterThan(0)) movements.push({ key: `pakai:${header.id_pemakaian}:${detail.id_barang}`, id: header.id_pemakaian, date: iso(header.tanggal), itemId: detail.id_barang, item: detail.barang.nama_barang, category: detail.barang.jenis_barang, amount: number(detail.jumlah_dipakai), unit: detail.barang.satuan, kind: "Pemakaian", supplier: "", recorder: header.pengguna.nama_pengguna, status: header.status_produksi });
  for (const header of sales) for (const detail of header.detail_transaksi) if (detail.jumlah_terjual.greaterThan(0)) movements.push({ key: `jual:${header.id_transaksi}:${detail.id_barang}`, id: header.id_transaksi, date: iso(header.tanggal), itemId: detail.id_barang, item: detail.barang.nama_barang, category: detail.barang.jenis_barang, amount: number(detail.jumlah_terjual), unit: detail.barang.satuan, kind: "Penjualan", supplier: "", recorder: header.pengguna.nama_pengguna, status: header.status_transaksi });
  for (const header of checks) for (const detail of header.detail_pemeriksaan) {
    const delta = number(detail.stok_fisik.minus(detail.stok_sistem));
    if (delta !== 0) movements.push({ key: `koreksi:${header.id_pemeriksaan}:${detail.id_barang}`, id: header.id_pemeriksaan, date: iso(header.tanggal), itemId: detail.id_barang, item: detail.barang.nama_barang, category: detail.barang.jenis_barang, amount: delta, unit: detail.barang.satuan, kind: "Penyesuaian", supplier: "", recorder: header.pengguna.nama_pengguna, status: detail.kondisi_fisik });
  }
  return {
    query,
    items: items.map((item) => ({ id: item.id_barang, name: item.nama_barang, category: item.jenis_barang, unit: item.satuan, stock: number(item.stok_saat_ini), minimum: number(item.stok_minimum) })),
    movements: movements.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
  };
}

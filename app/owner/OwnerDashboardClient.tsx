"use client";
import Link from "next/link";
import Image from "next/image";
import { Package, TriangleAlert, Boxes, ArrowLeftRight, ArrowRight } from "lucide-react";
import type { OwnerDashboardData } from "../../lib/owner-operations";
import { stockStatus } from "../../lib/owner-master-types";
import { Badge, Empty, Intro } from "./OwnerUI";

export default function OwnerDashboardClient({ data }: { data: OwnerDashboardData }) {
  return (
    <>
      <Intro title="Ringkasan Persediaan Hari Ini" subtitle="Ringkasan stok dan transaksi dari database." >
        <Image className="o-dashboard-art" src="/owner/dashboard-art.png" width={320} height={84} alt="" />
      </Intro>
      <div className="o-summary">
        {[
          { label: "Total Barang", value: data.totalItems, Icon: Package },
          { label: "Barang dengan Stok", value: data.stockedItems, Icon: Boxes },
          { label: "Stok Mencapai Minimum", value: data.lowStockItems, Icon: TriangleAlert, badge: "Perlu beli" },
          { label: "Penjualan Berhasil Hari Ini", value: data.successfulSalesToday, Icon: ArrowLeftRight },
        ].map((card) => (
          <div key={card.label} className={`o-stat ${card.badge ? "o-stat-warning" : ""}`}>
            <span>{card.label}</span><card.Icon size={19} /><strong>{card.value}</strong>
            {card.badge && <Badge>{card.badge}</Badge>}
          </div>
        ))}
      </div>
      <div className="o-columns o-dashboard-tables">
        <section>
          <h3>Stok Menipis</h3>
          <div className="o-table-wrap">
            <table><thead><tr><th>Barang</th><th>Stok</th><th>Minimum</th><th>Status</th></tr></thead>
              <tbody>{data.lowStock.slice(0, 6).map((item) => <tr key={item.id}>
                <td><Link href={`/owner/master-data?cari=${encodeURIComponent(item.name)}&pilih=${item.id}`}><strong>{item.name}</strong></Link></td>
                <td>{item.stock} {item.unit}</td><td>{item.minimum} {item.unit}</td><td><Badge>{stockStatus(item)}</Badge></td>
              </tr>)}</tbody>
            </table>
            {!data.lowStock.length && <p className="o-table-empty">Tidak ada barang pada atau di bawah stok minimum.</p>}
          </div>
        </section>
        <section>
          <h3>Transaksi Penjualan Terakhir</h3>
          <div className="o-table-wrap">
            <table><thead><tr><th>Tanggal</th><th>No. Transaksi</th><th>Produk</th><th>Jumlah</th><th>Status</th></tr></thead>
              <tbody>{data.latestSales.map((sale) => <tr key={sale.id}>
                <td>{sale.date}</td><td><Link href={`/owner/riwayat-keluar?pilih=jual:${sale.id}`}>{sale.id}</Link></td>
                <td>{sale.products}</td><td>{sale.status === "Berhasil" ? sale.quantity : "—"}</td>
                <td><Badge>{sale.status}</Badge></td>
              </tr>)}</tbody>
            </table>
            {!data.latestSales.length && <Empty title="Belum ada transaksi penjualan" description="Transaksi akan tampil setelah dicatat." />}
          </div>
        </section>
      </div>
      {data.latestMovements.length > 0 && <section className="o-dashboard-movements">
        <h3>Pergerakan Persediaan Terbaru</h3>
        <div className="o-table-wrap"><table><thead><tr><th>Tanggal</th><th>Barang</th><th>Jenis</th><th>Jumlah</th><th>Pengguna</th></tr></thead>
          <tbody>{data.latestMovements.map((movement) => <tr key={movement.key}>
            <td>{movement.date}</td><td><Link href={`/owner/riwayat-${movement.kind === "Masuk" ? "masuk" : "keluar"}?pilih=${encodeURIComponent(movement.key)}`}>{movement.item}</Link></td>
            <td>{movement.kind}</td><td>{movement.kind === "Penyesuaian" && movement.amount > 0 ? "+" : ""}{movement.amount} {movement.unit}</td><td>{movement.recorder}</td>
          </tr>)}</tbody>
        </table></div>
      </section>}
      <div className="o-shortcuts">
        {[
          { name: "Master Data", sub: "Kelola master data", href: "master-data" },
          { name: "Laporan", sub: "Lihat laporan", href: "laporan" },
          { name: "Stok Menipis", sub: "Lihat peringatan", href: "stok-menipis" },
          { name: "Riwayat Transaksi", sub: "Masuk & keluar", href: "riwayat-masuk" },
        ].map((item) => <Link key={item.name} href={`/owner/${item.href}`}><h3>{item.name}</h3><span>{item.sub} <ArrowRight size={13} /></span></Link>)}
      </div>
    </>
  );
}

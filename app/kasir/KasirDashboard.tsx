"use client";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  ArrowLeftRight,
  TriangleAlert,
  ArrowRight,
} from "lucide-react";
import { useKasir } from "./KasirState";
import { currency, saleCount, saleTotal } from "./data";
import { Badge, Intro } from "./KasirUI";
export default function KasirDashboard() {
  const { state } = useKasir();
  const today=state.today;
  const low = state.products.filter((p) => p.stock <= p.minimum);
  const sold = state.sales
    .filter((s) => s.tanggal === today && /^(berhasil|selesai)$/i.test(s.status_transaksi))
    .reduce((sum, s) => sum + saleCount(s), 0);
  return (
    <>
      <Intro
        title="Ringkasan Hari Ini"
        subtitle="Pantau stok produk dan penjualan, lalu mulai transaksi dari sini."
      >
        <Image unoptimized
          className="k-dashboard-art"
          src="/kasir/dashboard-art.png"
          width={320}
          height={84}
          alt=""
        />
      </Intro>
      <div className="k-summary">
        <div className="k-stat">
          <span>Produk Tersedia</span>
          <ShoppingBag size={19} />
          <strong>{state.products.filter((p) => p.stock > 0).length}</strong>
        </div>
        <div className="k-stat">
          <span>Terjual Hari Ini</span>
          <ArrowLeftRight size={19} />
          <strong>{sold} item</strong>
        </div>
        <Link
          className="k-stat k-stat-warning"
          href="/kasir/produk-terjual?stok=rendah"
        >
          <span>Stok Rendah</span>
          <TriangleAlert size={19} />
          <strong>{low.length}</strong>
          <Badge>Cek</Badge>
        </Link>
      </div>
      <section>
        <h3>Stok Produk</h3>
        <div className="k-product-grid">
          {state.products.map((p) => (
            <Link
              key={p.id}
              className="k-product-mini"
              href={`/kasir/produk-terjual?cari=${encodeURIComponent(p.name)}`}
            >
              <Image
                src={p.image?`/kasir/${p.image}.png`:"/kasir/logo.png"}
                width={88}
                height={88}
                alt={p.name}
              />
              <div>
                <small>{p.id}</small>
                <h4>{p.name}</h4>
                <strong>{currency(p.price)}</strong>
                <span
                  className={`k-badge ${p.stock <= p.minimum ? "k-menipis" : "k-aman"}`}
                >
                  Stok: {p.stock} {p.unit}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div className="k-start-sale">
        <div>
          <h3>Mulai Transaksi Baru</h3>
          <p>
            Pilih produk, periksa jumlah, dan selesaikan penjualan di satu
            halaman.
          </p>
        </div>
        <Link className="k-primary" href="/kasir/produk-terjual">
          Buka Produk Terjual <ArrowRight size={16} />
        </Link>
      </div>
      <section className="k-latest-sales">
        <h3>Penjualan Terakhir</h3>
        <div className="k-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>No. Transaksi</th>
                <th>Item</th>
                <th>Total item</th>
              </tr>
            </thead>
            <tbody>
              {state.sales
                .filter((s) => s.tanggal === today)
                .slice(0, 3)
                .map((s) => (
                  <tr key={s.id_transaksi}>
                    <td>
                      <strong>{s.tanggal}</strong>
                    </td>
                    <td>
                      <Link
                        href={`/kasir/riwayat-penjualan?pilih=${encodeURIComponent(s.id_transaksi)}`}
                      >
                        {s.id_transaksi}
                      </Link>
                    </td>
                    <td>
                      {s.details
                        .map(
                          (l) =>
                            `${l.name} × ${l.jumlah_terjual}`,
                        )
                        .join(", ")}
                    </td>
                    <td>{currency(saleTotal(s))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

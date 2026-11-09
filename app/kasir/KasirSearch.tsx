"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShoppingBag, ReceiptText, Clock3, X } from "lucide-react";
import { useKasir } from "./KasirState";
import { matches, currency, shortDate, saleTotal } from "./data";
import { Badge, Empty } from "./KasirUI";
function SearchBody() {
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const { state, recent, setRecent } = useKasir();
  const [tab, setTab] = useState("Semua");
  const products = query
    ? state.products.filter((p) => matches(p.name + " " + p.id, query))
    : [];
  const sales = query
    ? state.sales.filter((s) =>
        matches(
          s.id_transaksi +
            " " +
            s.details
              .map((l) => l.name)
              .join(" "),
          query,
        ),
      )
    : [];
  const count = products.length + sales.length;
  const shown =
    tab === "Semua" ? count : tab === "Produk" ? products.length : sales.length;
  return (
    <div className="k-search-layout">
      <section>
        <h2 className="k-search-heading">
          {query ? `Hasil untuk “${query}”` : "Pencarian"}
        </h2>
        <p className="k-search-count">
          {query
            ? `${count} hasil ditemukan`
            : "Masukkan kata kunci produk atau transaksi pada pencarian di header."}
        </p>
        <div
          className="k-result-tabs"
          role="tablist"
          aria-label="Kategori pencarian"
        >
          {[
            ["Semua", count],
            ["Produk", products.length],
            ["Penjualan", sales.length],
          ].map(([label, n]) => (
            <button
              key={label}
              role="tab"
              aria-selected={tab === label}
              onClick={() => setTab(String(label))}
            >
              {label} <span>{n}</span>
            </button>
          ))}
        </div>
        {!shown && (
          <Empty
            title={query ? "Hasil tidak ditemukan" : "Mulai pencarian"}
            description="Coba nama produk atau nomor transaksi lain."
          />
        )}
        {(tab === "Semua" || tab === "Produk") && !!products.length && (
          <section className="k-result-group">
            <h3>PRODUK</h3>
            {products.map((p) => (
              <Link
                className="k-result-card"
                href={`/kasir/produk-terjual?cari=${encodeURIComponent(p.name)}`}
                key={p.id}
              >
                <span className="k-result-icon">
                  <ShoppingBag size={19} />
                </span>
                <div>
                  <strong>{p.name}</strong>
                  <p>
                    {p.id} · {currency(p.price)} · stok {p.stock} {p.unit}
                  </p>
                </div>
                <Badge>
                  {p.stock > p.minimum
                    ? "Tersedia"
                    : p.stock === 0
                      ? "Habis"
                      : "Stok rendah"}
                </Badge>
                <span className="k-result-view">Lihat</span>
              </Link>
            ))}
          </section>
        )}
        {(tab === "Semua" || tab === "Penjualan") && !!sales.length && (
          <section className="k-result-group">
            <h3>PENJUALAN</h3>
            {sales.map((s) => (
              <Link
                className="k-result-card"
                key={s.id_transaksi}
                href={`/kasir/riwayat-penjualan?pilih=${encodeURIComponent(s.id_transaksi)}&cari=${encodeURIComponent(s.id_transaksi)}`}
              >
                <span className="k-result-icon">
                  <ReceiptText size={19} />
                </span>
                <div>
                  <strong>
                    Penjualan ·{" "}
                    {s.details
                      .map(
                        (l) =>
                          `${l.name} × ${l.jumlah_terjual}`,
                      )
                      .join(", ")}
                  </strong>
                  <p>
                    {shortDate(s.tanggal)} · {currency(saleTotal(s))}
                  </p>
                </div>
                <span className="k-result-view">Lihat</span>
              </Link>
            ))}
          </section>
        )}
      </section>
      <aside className="k-recent">
        <div>
          <h3>Pencarian terakhir</h3>
          <button disabled={!recent.length} onClick={() => setRecent([])}>
            Hapus semua
          </button>
        </div>
        {recent.map((q) => (
          <div className="k-recent-row" key={q}>
            <Clock3 size={16} />
            <Link href={`/kasir/pencarian?q=${encodeURIComponent(q)}`}>
              {q}
            </Link>
            <button
              aria-label={`Hapus riwayat ${q}`}
              onClick={() => setRecent((r) => r.filter((s) => s !== q))}
            >
              <X size={17} />
            </button>
          </div>
        ))}
        {!recent.length && (
          <p className="k-recent-empty">Belum ada pencarian terakhir.</p>
        )}
      </aside>
    </div>
  );
}
export default function KasirSearch() {
  const params = useSearchParams();
  return <SearchBody key={params.toString()} />;
}

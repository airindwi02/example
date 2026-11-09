"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Layers, ShoppingBag, Upload, Download, Clock3, X } from "lucide-react";
import { useOwner } from "./OwnerState";
import type { OwnerSearchResults } from "../../lib/owner-operations";
import { stockStatus } from "../../lib/owner-master-types";
import { Badge, Empty } from "./OwnerUI";
function SearchClientBody({ data }: { data: OwnerSearchResults }) {
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const [tab, setTab] = useState("Semua");
  const { recent, setRecent } = useOwner();
  const bahan = data.items.filter((i) => i.category !== "Produk Hasil");
  const product = data.items.filter((i) => i.category === "Produk Hasil");
  const transactions = data.movements;
  const count = bahan.length + product.length + transactions.length;
  return (
    <div className="o-search-layout">
      <section>
        <h2 className="o-search-heading">
          {query ? `Hasil untuk “${query}”` : "Pencarian"}
        </h2>
        <p className="o-search-count">
          {query
            ? `${count} hasil ditemukan`
            : "Masukkan nama bahan, produk, atau transaksi pada pencarian di header."}
        </p>
        <div
          className="o-result-tabs"
          role="tablist"
          aria-label="Kategori hasil pencarian"
        >
          {[
            ["Semua", count],
            ["Bahan", bahan.length],
            ["Produk", product.length],
            ["Transaksi", transactions.length],
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
        {(!count ||
          (tab === "Bahan" && !bahan.length) ||
          (tab === "Produk" && !product.length) ||
          (tab === "Transaksi" && !transactions.length)) && (
          <Empty
            title={query ? "Hasil tidak ditemukan" : "Mulai pencarian"}
            description="Coba kata kunci nama bahan, produk, atau nomor transaksi."
          />
        )}
        {(tab === "Semua" || tab === "Bahan") && !!bahan.length && (
          <section className="o-result-group">
            <h3>BAHAN</h3>
            {bahan.map((i) => (
              <Link
                key={i.id}
                className="o-result-card"
                href={`/owner/master-data?cari=${encodeURIComponent(i.name)}&pilih=${i.id}`}
              >
                <span className="o-result-icon">
                  <Layers size={19} />
                </span>
                <div>
                  <strong>{i.name}</strong>
                  <p>
                    Stok {i.stock} {i.unit} · minimum {i.minimum} {i.unit}
                  </p>
                </div>
                <Badge>{stockStatus(i)}</Badge>
                <span className="o-result-view">Lihat</span>
              </Link>
            ))}
          </section>
        )}
        {(tab === "Semua" || tab === "Produk") && !!product.length && (
          <section className="o-result-group">
            <h3>PRODUK</h3>
            {product.map((i) => (
              <Link
                key={i.id}
                className="o-result-card"
                href={`/owner/master-data?cari=${encodeURIComponent(i.name)}&pilih=${i.id}`}
              >
                <span className="o-result-icon">
                  <ShoppingBag size={19} />
                </span>
                <div>
                  <strong>{i.name}</strong>
                  <p>
                    {i.id} · stok {i.stock} {i.unit}
                  </p>
                </div>
                <Badge>Tersedia</Badge>
                <span className="o-result-view">Lihat</span>
              </Link>
            ))}
          </section>
        )}
        {(tab === "Semua" || tab === "Transaksi") && !!transactions.length && (
          <section className="o-result-group">
            <h3>TRANSAKSI</h3>
            <div className="o-result-transactions">
              {transactions.map((i) => (
                <Link
                  key={i.key}
                  className="o-result-card"
                  href={`/owner/riwayat-${i.kind === "Masuk" ? "masuk" : "keluar"}?pilih=${encodeURIComponent(i.key)}`}
                >
                  <span className="o-result-icon">
                    {i.kind === "Masuk" ? (
                      <Download size={19} />
                    ) : (
                      <Upload size={19} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {i.kind} · {i.item}
                    </strong>
                    <p>
                      {i.date} · {i.amount} {i.unit} · {i.recorder}
                    </p>
                  </div>
                  <span className="o-result-view">Lihat</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
      <aside className="o-recent">
        <div>
          <h3>Pencarian terakhir</h3>
          <button onClick={() => setRecent([])} disabled={!recent.length}>
            Hapus semua
          </button>
        </div>
        {recent.map((q) => (
          <div className="o-recent-row" key={q}>
            <Clock3 size={16} />
            <Link href={`/owner/pencarian?q=${encodeURIComponent(q)}`}>
              {q}
            </Link>
            <button
              aria-label={`Hapus riwayat ${q}`}
              onClick={() => setRecent((r) => r.filter((i) => i !== q))}
            >
              <X size={17} />
            </button>
          </div>
        ))}
        {!recent.length && (
          <p className="o-recent-empty">Belum ada pencarian terakhir.</p>
        )}
      </aside>
    </div>
  );
}

export default function SearchClient({ data }: { data: OwnerSearchResults }) {
  const params = useSearchParams();
  return <SearchClientBody key={params.toString()} data={data} />;
}

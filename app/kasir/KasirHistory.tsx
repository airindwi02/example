"use client";
import Image from "next/image";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { useKasir } from "./KasirState";
import {
  currency,
  shortDate,
  saleTotal,
  saleCount,
  productFor,
  matches,
} from "./data";
import { Empty, Intro, Pager, SearchBox } from "./KasirUI";
function HistoryBody() {
  const { state } = useKasir();
  const today=state.today;
  const params = useSearchParams();
  const [period, setPeriod] = useState(
      params.get("pilih") ? "Semua" : "Hari Ini",
    ),
    [query, setQuery] = useState(params.get("cari") ?? ""),
    [selected, setSelected] = useState(
      params.get("pilih") ?? state.sales[0]?.id_transaksi??"",
    ),
    [page, setPage] = useState(1);
  const rows = state.sales.filter(
    (s) =>
      (period === "Semua"
        ? true
        : period === "Hari Ini"
          ? s.tanggal === today
          : period === "7 Hari"
            ? s.tanggal >= new Date(Date.parse(today)-6*86400000).toISOString().slice(0,10) && s.tanggal <= today
            : s.tanggal.startsWith(today.slice(0,7))) &&
      matches(
        [
          s.id_transaksi,
          shortDate(s.tanggal),
          s.method,
          ...s.details.map((l) => l.name),
        ].join(" "),
        query,
      ),
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / 9)));
  const shown = rows.slice((currentPage - 1) * 9, currentPage * 9);
  const sale = rows.find((s) => s.id_transaksi === selected) ?? rows[0];
  return (
    <div className="k-history-view">
      <Intro
        title="Riwayat Penjualan"
        subtitle="Pilih transaksi untuk melihat rinciannya di samping."
      />
      <div className="k-columns">
        <section>
          <div className="k-history-toolbar">
            <div className="k-tabs">
              {["Hari Ini", "7 Hari", "Bulan Ini", "Semua"].map((p) => (
                <button
                  key={p}
                  aria-pressed={period === p}
                  onClick={() => {
                    setPeriod(p);
                    setPage(1);
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <SearchBox
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder="Cari transaksi..."
            />
          </div>
          <div className="k-table-wrap">
            <table>
              <thead>
                <tr>
                  {["Tanggal", "No. Transaksi", "Item", "Total item", "Metode"].map(
                    (h) => (
                      <th key={h}>{h}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr
                    key={s.id_transaksi}
                    className={
                      sale?.id_transaksi === s.id_transaksi ? "k-selected" : ""
                    }
                  >
                    <td>
                      <button
                        className="k-history-date"
                        aria-label={`Rincian ${s.id_transaksi}`}
                        onClick={() => setSelected(s.id_transaksi)}
                      >
                        {shortDate(s.tanggal)}
                      </button>
                    </td>
                    <td>
                      <button
                        className="k-history-number"
                        onClick={() => setSelected(s.id_transaksi)}
                      >
                        {s.id_transaksi}
                      </button>
                    </td>
                    <td>{saleCount(s)} item</td>
                    <td>{currency(saleTotal(s))}</td>
                    <td>{s.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <Empty
                title="Belum ada data penjualan"
                description="Coba kata kunci atau periode lain."
              />
            )}
          </div>
          <Pager
            page={currentPage}
            size={9}
            total={rows.length}
            noun="transaksi"
            onChange={setPage}
          />
        </section>
        {sale && (
          <aside
            className="k-panel k-history-detail"
            aria-label="Rincian transaksi"
          >
            <h3>Rincian Transaksi</h3>
            <p>
              {sale.id_transaksi} · {shortDate(sale.tanggal)}
            </p>
            <p>Status: {sale.status_transaksi} / Kasir: {sale.actor}{sale.reason?" / "+sale.reason:""}</p><div className="k-history-items">
              {sale.details.map((l) => {
                const p = {...productFor(l.id_barang, state.products),name:l.name};
                return (
                  <div key={l.id_barang}>
                    <Image unoptimized
                      src={p.image?`/kasir/${p.image}.png`:"/kasir/logo.png"}
                      width={56}
                      height={56}
                      alt={p.name}
                    />
                    <div>
                      <small>{p.id}</small>
                      <strong>{p.name}</strong>
                      <p>
                        {l.jumlah_terjual} × {currency(l.harga)}
                      </p>
                    </div>
                    <strong>{currency(l.total)}</strong>
                  </div>
                );
              })}
            </div>
            <div className="k-history-totals">
              <div>
                <span>Subtotal / {saleCount(sale)} item</span>
                <strong>{currency(sale.total)}</strong>
              </div>
              <div className="k-history-total">
                <span>Total item</span>
                <strong>{currency(saleTotal(sale))}</strong>
              </div>
              <div>
                <span>Diterima ({sale.method})</span>
                <strong>{sale.received===null?"Tidak tercatat":currency(sale.received)}</strong>
              </div>
              <div>
                <span>Kembalian</span>
                <strong className="k-green">
                  {sale.change==null?"Tidak tercatat":currency(sale.change)}
                </strong>
              </div>
            </div>
            <button
              className="k-outline k-print-button"
              onClick={() => window.print()}
            >
              <Printer size={16} /> Cetak Struk
            </button>
          </aside>
        )}
      </div>
      {sale && (
        <article className="k-print-receipt" aria-label="Struk penjualan">
          <h2>ALANA PÂTISSERIE</h2>
          <p>
            Jl. Dr Moh Hatta no 72
            <br />
            Padang, Sumatera Barat
          </p>
          <p>
            {sale.id_transaksi}
            <br />
            {shortDate(sale.tanggal)}
            <br />
            Kasir: {sale.actor}
          </p>
          <p>Ringkasan transaksi historis / Status: {sale.status_transaksi}</p>
          <hr />
          {sale.details.map((l) => (
            <div className="k-receipt-line" key={l.id_barang}>
              <div>
                {l.name}
                <br />
                {l.jumlah_terjual} × {currency(l.harga)}
              </div>
              <strong>{currency(l.jumlah_terjual * l.harga)}</strong>
            </div>
          ))}
          <hr />
          <p>
            Subtotal: {currency(sale.total)}
            <br />
            Pajak &amp; layanan: {sale.fee==null?"Tidak tercatat":currency(sale.fee)}
            <br />
            <strong>Total item: {currency(saleTotal(sale))}</strong>
            <br />
            Diterima ({sale.method}): {sale.received===null?"Tidak tercatat":currency(sale.received)}
            <br />
            Kembalian: {sale.change==null?"Tidak tercatat":currency(sale.change)}
          </p>
          <p>Terima kasih atas kunjungan Anda.</p>
        </article>
      )}
    </div>
  );
}
export default function KasirHistory() {
  const params = useSearchParams();
  return <HistoryBody key={params.toString()} />;
}

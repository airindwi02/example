"use client";
import Image from "next/image";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OwnerMovement } from "../../lib/owner-operations";
import { matches } from "../../lib/owner-master-types";
import { Badge, Empty, Intro, Pager, SearchBox } from "./OwnerUI";

const jakartaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const displayDate = (value: string) => value.split("-").reverse().join("/");
const ago = (date: string, count: number) => new Date(Date.parse(`${date}T00:00:00Z`) - count * 86_400_000).toISOString().slice(0, 10);

function HistoryBody({ direction, movements }: { direction: "masuk" | "keluar"; movements: OwnerMovement[] }) {
  const params = useSearchParams();
  const incoming = direction === "masuk";
  const today = jakartaToday();
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("Bulan Ini");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(params.get("pilih") ?? "");
  const [kind, setKind] = useState("Semua Jenis");
  const firstDay = `${today.slice(0, 7)}-01`;
  const rows = movements.filter((row) =>
    (incoming ? row.kind === "Masuk" : row.kind !== "Masuk") &&
    (period === "Semua" || (period === "Hari Ini" && row.date === today) || (period === "7 Hari" && row.date >= ago(today, 6) && row.date <= today) || (period === "Bulan Ini" && row.date >= firstDay && row.date <= today)) &&
    (kind === "Semua Jenis" || row.kind === kind) &&
    matches([row.id, row.itemId, row.item, row.supplier, row.kind, row.date, row.recorder, row.status].join(" "), query),
  );
  const selectedRecord = rows.find((row) => row.key === selected) ?? rows.find((row) => selected && row.key.startsWith(`${selected}:`));
  const chosen = selectedRecord ?? rows[0];
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / 9)));
  const shown = rows.slice((currentPage - 1) * 9, currentPage * 9);
  return <>
    <Intro title={`Riwayat Barang ${incoming ? "Masuk" : "Keluar"}`} subtitle="Pergerakan yang tersimpan di PostgreSQL. Saldo pada tanggal transaksi tidak tersedia di schema saat ini." />
    <div className={rows.length ? "o-columns" : ""}>
      <section className="o-history-list">
        <div className="o-history-toolbar">
          <div className="o-tabs" aria-label="Periode transaksi">{["Hari Ini", "7 Hari", "Bulan Ini", "Semua"].map((value) => <button key={value} aria-pressed={period === value} onClick={() => { setPeriod(value); setPage(1); }}>{value}</button>)}</div>
          <SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Cari transaksi..." />
        </div>
        {!incoming && <label className="o-kind-filter">Jenis transaksi<select className="o-kind-select" aria-label="Jenis transaksi" value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}><option value="Semua Jenis">Semua Jenis</option><option>Penjualan</option><option>Pemakaian</option><option>Penyesuaian</option></select></label>}
        {rows.length ? <>
          <div className="o-table-wrap"><table><thead><tr>{["Tanggal", "No.", "Barang", "Jumlah", incoming ? "Pemasok" : "Jenis"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
            <tbody>{shown.map((row) => <tr key={row.key} className={chosen?.key === row.key ? "o-selected" : ""}>
              <td><button className="o-row-button" onClick={() => setSelected(row.key)}><strong>{displayDate(row.date)}</strong></button></td>
              <td>{row.id}</td><td><button className="o-row-button" onClick={() => setSelected(row.key)}>{row.item}</button></td>
              <td>{row.kind === "Penyesuaian" && row.amount > 0 ? "+" : ""}{row.amount} {row.unit}</td>
              <td>{incoming ? row.supplier : <Badge>{row.kind}</Badge>}</td>
            </tr>)}</tbody>
          </table></div>
          <Pager page={currentPage} size={9} total={rows.length} noun="pergerakan" onChange={setPage} />
        </> : <Empty className="o-history-empty" title={`Belum ada data transaksi ${direction}`} description="Transaksi akan muncul setelah dicatat. Coba ubah rentang waktu atau pencarian." />}
      </section>
      {chosen && <aside className="o-panel o-history-detail" aria-label="Rincian transaksi">
        <h3>{incoming ? "Rincian Penerimaan Bahan Baku" : "Rincian Barang Keluar"}</h3>
        {!incoming && <div className="o-product-detail">
          {chosen.item === "Croissant Butter" && <Image src="/owner/croissant.png" width={72} height={72} alt="Croissant Butter" />}
          <div><small>{chosen.itemId} · {chosen.category}</small><h3>{chosen.item}</h3><p>{chosen.kind} · {chosen.amount} {chosen.unit}</p></div>
        </div>}
        <dl className="o-details">{Object.entries({ "No. Transaksi": chosen.id, Tanggal: displayDate(chosen.date), Jenis: chosen.kind, ...(incoming ? { Pemasok: chosen.supplier } : {}), Status: chosen.status, "Dicatat oleh": chosen.recorder }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
        <h3>Rincian Barang</h3><div className="o-table-wrap"><table><thead><tr><th>Barang</th><th>Jumlah</th><th>Saldo historis</th></tr></thead><tbody><tr><td><strong>{chosen.item}</strong></td><td>{chosen.amount} {chosen.unit}</td><td>Tidak tersedia</td></tr></tbody></table></div>
        <div className="o-note"><strong>Catatan</strong><p>Database menyimpan pergerakan ini, tetapi tidak menyimpan saldo stok per transaksi.</p></div>
      </aside>}
    </div>
  </>;
}

export default function HistoryClient({ direction, movements }: { direction: "masuk" | "keluar"; movements: OwnerMovement[] }) {
  const params = useSearchParams();
  return <HistoryBody key={direction + params.toString()} direction={direction} movements={movements} />;
}

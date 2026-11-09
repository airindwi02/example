"use client";
import { useCallback, useState } from "react";
import { Download, PackagePlus, PackageMinus, ArrowLeftRight, TriangleAlert, CheckCircle2, CircleMinus, X } from "lucide-react";
import type { InventoryReport, InventoryReportRow } from "../../lib/owner-operations";
import { Badge, Dialog, Empty, Intro } from "./OwnerUI";
import { createReportPdf } from "./exportPdf";
import { loadInventoryReportAction } from "./laporan/actions";

type Period = { start: string; end: string; category: string };
const jakartaDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const displayDate = (value: string) => value.split("-").reverse().join("/");
const formatNumber = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
function status(row: InventoryReportRow) { return row.currentStock <= 0 ? "Habis" : row.currentStock <= row.minimum ? "Menipis" : "Aman"; }

export default function ReportClient({ initialData, categories }: { initialData: InventoryReport; categories: string[] }) {
  const [report, setReport] = useState(initialData);
  const [draft, setDraft] = useState<Period>({ start: initialData.start, end: initialData.end, category: initialData.category });
  const [quick, setQuick] = useState("Bulan Ini");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<{ title: string; text: string; error?: boolean } | null>(null);
  const close = useCallback(() => setConfirm(false), []);

  async function apply(period: Period) {
    if (!period.start || !period.end || period.end < period.start) { setError("Periode tanggal tidak valid."); return; }
    setPending(true); setError(""); setToast(null);
    try {
      const result = await loadInventoryReportAction(period);
      if (!result.ok) { setError(result.message); return; }
      setReport(result.data); setDraft(period);
    } catch { setError("Laporan tidak dapat dimuat. Coba kembali."); }
    finally { setPending(false); }
  }

  function shortcut(label: string) {
    const end = jakartaDate();
    const monthStart = `${end.slice(0, 7)}-01`;
    let start = monthStart, finish = end;
    if (label === "7 Hari") start = new Date(Date.parse(`${end}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
    if (label === "Bulan Lalu") {
      const prior = new Date(Date.parse(`${monthStart}T00:00:00Z`) - 86_400_000);
      finish = prior.toISOString().slice(0, 10); start = `${finish.slice(0, 7)}-01`;
    }
    const period = { ...draft, start, end: finish };
    setQuick(label); void apply(period);
  }

  function exportFile() {
    let url: string | undefined;
    try {
      const lines = [
        "ALANA PATISSERIE - LAPORAN PERSEDIAAN",
        `Periode: ${displayDate(report.start)} - ${displayDate(report.end)}`,
        `Kategori: ${report.category}`,
        `Snapshot saldo periode tersedia: ${report.hasSavedSnapshot ? "Ya" : "Tidak"}`,
        "Stok awal/akhir historis hanya ditampilkan jika snapshot tersimpan untuk periode yang tepat.",
        "Stok saat ini adalah nilai database pada waktu laporan dibuat.",
        `Ringkasan: ${report.totals.incomingLines} baris masuk; ${report.totals.outgoingLines} baris keluar; ${report.totals.adjustedItems} barang disesuaikan; ${report.totals.lowStockItems} barang saat ini mencapai minimum.`,
        "",
        "Barang | Kategori | Stok awal | Masuk | Keluar | Penyesuaian | Stok akhir | Stok saat ini | Status",
        ...report.rows.map((row) => `${row.name} | ${row.category} | ${formatNumber(row.openingStock)} ${row.unit} | ${formatNumber(row.incoming)} ${row.unit} | ${formatNumber(row.outgoing)} ${row.unit} | ${formatNumber(row.adjustment)} ${row.unit} | ${formatNumber(row.closingStock)} ${row.unit} | ${formatNumber(row.currentStock)} ${row.unit} | ${status(row)}`),
      ];
      const filename = `Laporan_Persediaan_${report.start}_${report.end}.pdf`;
      url = URL.createObjectURL(createReportPdf(lines));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      const downloadUrl = url; setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
      setConfirm(false); setToast({ title: "File laporan berhasil diunduh", text: filename });
    } catch {
      if (url) URL.revokeObjectURL(url);
      setConfirm(false); setToast({ title: "File laporan gagal diekspor", text: "Unduhan tidak dapat dibuat. Silakan coba lagi.", error: true });
    }
  }

  return <>
    <Intro title="Laporan Persediaan" subtitle="Pergerakan periode dan stok saat ini dibaca dari PostgreSQL.">
      <button className="o-primary o-export-button" disabled={!report.rows.length || pending} onClick={() => { setToast(null); setConfirm(true); }}><Download size={17} /> Ekspor Laporan</button>
    </Intro>
    <section className="o-report-filters" aria-label="Filter laporan">
      <div className="o-report-fields">
        <label>Tanggal Awal<input type="date" value={draft.start} onChange={(event) => { setDraft({ ...draft, start: event.target.value }); setQuick(""); }} /></label>
        <label>Tanggal Akhir<input aria-invalid={!!error} type="date" value={draft.end} onChange={(event) => { setDraft({ ...draft, end: event.target.value }); setQuick(""); }} /></label>
        <label>Kategori Bahan<select aria-label="Kategori Bahan" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option>Semua Kategori</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <button className="o-primary" disabled={pending} onClick={() => void apply(draft)}>{pending ? "Memuat..." : "Tampilkan Laporan"}</button>
      </div>
      {error ? <p className="o-error" role="alert">{error}</p> : <div className="o-tabs o-quick-tabs">{["Hari Ini", "7 Hari", "Bulan Ini", "Bulan Lalu"].map((label) => <button key={label} aria-pressed={quick === label} disabled={pending} onClick={() => shortcut(label)}>{label}</button>)}</div>}
    </section>
    <p className="o-report-limitation" role="note">{report.hasSavedSnapshot ? "Stok awal dan akhir berasal dari snapshot tersimpan untuk periode yang dipilih." : "Snapshot saldo tidak tersedia untuk periode ini. Stok awal dan akhir historis tidak dapat dipastikan; stok saat ini tetap ditampilkan terpisah."}</p>
    <div className="o-summary o-report-summary">
      {[
        { label: "Baris Barang Masuk", value: report.totals.incomingLines, unit: "baris", Icon: PackagePlus },
        { label: "Baris Barang Keluar", value: report.totals.outgoingLines, unit: "baris", Icon: PackageMinus },
        { label: "Barang Disesuaikan", value: report.totals.adjustedItems, unit: "barang", Icon: ArrowLeftRight, badge: "Periode" },
        { label: "Stok Mencapai Minimum", value: report.totals.lowStockItems, unit: "barang", Icon: TriangleAlert, badge: "Saat ini" },
      ].map((card) => <div className={`o-stat ${card.badge ? "o-stat-warning" : ""}`} key={card.label}><span>{card.label}</span><card.Icon size={19} /><strong>{card.value} <small>{card.unit}</small></strong>{card.badge && <Badge>{card.badge}</Badge>}</div>)}
    </div>
    <div className="o-table-wrap"><table><thead><tr>{["Bahan", "Kategori", "Stok Awal", "Masuk", "Keluar", "Penyesuaian", "Stok Akhir", "Stok Saat Ini", "Status"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
      <tbody>{report.rows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.category}</td><td>{formatNumber(row.openingStock)}</td><td>{formatNumber(row.incoming)}</td><td>{formatNumber(row.outgoing)}</td><td>{formatNumber(row.adjustment)}</td><td>{formatNumber(row.closingStock)}</td><td>{formatNumber(row.currentStock)} {row.unit}</td><td><Badge>{status(row)}</Badge></td></tr>)}</tbody>
    </table>{!report.rows.length && <Empty title="Tidak ada data laporan" description="Tidak ada barang pada kategori yang dipilih." />}</div>
    {confirm && <Dialog title="Konfirmasi ekspor laporan" onClose={close} className="o-export-backdrop"><span className="o-export-icon"><Download size={27} /></span><h2>Ekspor laporan?</h2><p>Laporan persediaan periode {displayDate(report.start)} – {displayDate(report.end)} akan diekspor sesuai hasil yang tampil.</p><div className="o-dialog-actions"><button className="o-outline" onClick={() => { close(); setToast({ title: "File laporan tidak diekspor", text: "Anda dapat mengekspor kapan saja" }); }}>Tidak</button><button className="o-primary" onClick={exportFile}>Ya, Ekspor</button></div></Dialog>}
    {toast && <div className={`o-toast ${toast.error ? "o-toast-error" : ""}`} role="status">{toast.error ? <CircleMinus size={22} /> : toast.title.includes("tidak") ? <CircleMinus size={22} /> : <CheckCircle2 size={22} />}<div><strong>{toast.title}</strong><p>{toast.text}</p></div><button aria-label="Tutup pesan ekspor" onClick={() => setToast(null)}><X size={17} /></button></div>}
  </>;
}

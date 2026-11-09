"use client";
import { useMemo, useState } from "react";
import { Search, Plus, X, Eye, Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge, Dialog, Empty, Intro, Notice } from "../OwnerUI";
import { cancelOrderAction, createOrderAction } from "./actions";
import type { OrderCommand, OrderSnapshot } from "../../../lib/order-types";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const idempotencyId = () => crypto.randomUUID().replaceAll("-", "").slice(0, 15);
const rupiah = (value: string) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(Number(value));
const dateLabel = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
type DraftLine = { itemId: string; quantity: string; price: string };

export default function OrdersClient({ initialData }: { initialData: OrderSnapshot }) {
  const router = useRouter();
  const [data, setData] = useState(initialData), [query, setQuery] = useState(""), [filter, setFilter] = useState("Semua Status");
  const [selected, setSelected] = useState<string | null>(initialData.orders[0]?.id ?? null), [creating, setCreating] = useState(false), [cancel, setCancel] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(idempotencyId);
  const [supplier, setSupplier] = useState(""), [orderDate, setOrderDate] = useState(today), [estimatedDate, setEstimatedDate] = useState(""), [lines, setLines] = useState<DraftLine[]>([{ itemId: "", quantity: "", price: "" }]);
  const [pending, setPending] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const filtered = useMemo(() => data.orders.filter((order) => (filter === "Semua Status" || order.status === filter) && `${order.id} ${order.supplierName} ${order.createdBy} ${order.lines.map((line) => line.itemName).join(" ")}`.toLocaleLowerCase("id").includes(query.trim().toLocaleLowerCase("id"))), [data.orders, filter, query]);
  const active = data.orders.find((order) => order.id === selected) ?? null;
  function patchLine(index: number, patch: Partial<DraftLine>) { setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line)); }
  function resetForm() { setRequestId(idempotencyId()); setSupplier(""); setOrderDate(today()); setEstimatedDate(""); setLines([{ itemId: "", quantity: "", price: "" }]); setError(""); }
  async function save() {
    if (pending) return;
    setPending(true); setError(""); setNotice("");
    try {
      const input: OrderCommand = { requestId, supplierId: supplier, orderDate, estimatedDate, lines: lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity, price: line.price })) };
      const result = await createOrderAction(input);
      if (!result.ok) { setError(result.message); return; }
      setData(result.data); setSelected(result.id); setCreating(false); resetForm(); setNotice(result.message); router.refresh();
    } catch { setError("Koneksi terputus. Muat ulang untuk memastikan pesanan tersimpan sebelum mencoba kembali."); }
    finally { setPending(false); }
  }
  async function confirmCancel() {
    if (!cancel || pending) return;
    setPending(true); setError("");
    try { const result = await cancelOrderAction(cancel); if (!result.ok) { setError(result.message); return; } setData(result.data); setNotice(result.message); setCancel(null); router.refresh(); }
    catch { setError("Pesanan gagal dibatalkan. Muat ulang untuk memeriksa statusnya."); }
    finally { setPending(false); }
  }
  return <>
    <Intro title="Pesanan Barang" subtitle="Buat dan pantau pesanan pemasok. Stok berubah setelah barang diterima oleh Daily Worker.">
      <button className="o-primary" onClick={() => { resetForm(); setCreating(true); }}><Plus size={17}/> Buat Pesanan</button>
    </Intro>
    {notice && <Notice>{notice}</Notice>}{error && !creating && <p className="o-error" role="alert">{error}</p>}
    <section className="o-orders-toolbar" aria-label="Filter pesanan">
      <label className="o-searchbox"><Search size={18}/><input aria-label="Cari pesanan" placeholder="Cari ID, pemasok, atau barang..." value={query} onChange={(event) => setQuery(event.target.value)}/></label>
      <label className="o-order-filter">Status<select aria-label="Filter status pesanan" value={filter} onChange={(event) => setFilter(event.target.value)}>{["Semua Status", "Dipesan", "Diterima Sebagian", "Selesai", "Dibatalkan"].map((status) => <option key={status}>{status}</option>)}</select></label>
    </section>
    <div className="o-order-columns">
      <section className="o-order-list">
        <div className="o-table-wrap"><table><thead><tr><th>ID Pesanan</th><th>Pemasok</th><th>Tanggal Pesan</th><th>Estimasi</th><th>Status</th><th>Rincian</th></tr></thead><tbody>
          {filtered.map((order) => <tr key={order.id} className={selected === order.id ? "o-order-selected" : ""}><td><strong>{order.id}</strong></td><td>{order.supplierName}</td><td>{dateLabel(order.orderDate)}</td><td>{dateLabel(order.estimatedDate)}</td><td><Badge>{order.status}</Badge></td><td><button className="o-outline o-order-view" onClick={() => setSelected(order.id)} aria-label={`Lihat rincian ${order.id}`}><Eye size={16}/> Lihat</button></td></tr>)}
          {!filtered.length && <tr><td colSpan={6} className="o-table-empty">{data.orders.length ? "Tidak ada pesanan yang cocok." : "Belum ada pesanan barang."}</td></tr>}
        </tbody></table></div>
      </section>
      <aside className="o-panel o-order-detail" aria-label="Rincian pesanan">
        {active ? <><div className="o-order-detail-heading"><div><small>RINCIAN PESANAN</small><h3>{active.id}</h3></div><Badge>{active.status}</Badge></div>
          <dl className="o-details"><div><dt>Pemasok</dt><dd>{active.supplierName}</dd></div><div><dt>Dibuat oleh</dt><dd>{active.createdBy}</dd></div><div><dt>Tanggal pesan</dt><dd>{dateLabel(active.orderDate)}</dd></div><div><dt>Estimasi penerimaan</dt><dd>{dateLabel(active.estimatedDate)}</dd></div></dl>
          <h4>Barang dipesan</h4><div className="o-table-wrap"><table><thead><tr><th>Barang</th><th>Jumlah</th><th>Diterima</th><th>Harga/unit</th></tr></thead><tbody>{active.lines.map((line) => <tr key={line.itemId}><td>{line.itemName}</td><td>{line.quantity} {line.unit}</td><td>{line.received} {line.unit}</td><td>{rupiah(line.price)}</td></tr>)}</tbody></table></div>
          {active.status === "Dipesan" && <button className="o-order-cancel" onClick={() => { setError(""); setCancel(active.id); }}><Ban size={16}/> Batalkan pesanan</button>}
          {active.status === "Dibatalkan" && <p className="o-order-footnote">Pesanan dibatalkan sebelum ada penerimaan.</p>}
        </> : <Empty title="Pilih pesanan" description="Pilih pesanan pada tabel untuk melihat pemasok dan rincian barang."/>}
      </aside>
    </div>
    {creating && <Dialog title="Buat Pesanan Barang" onClose={() => !pending && setCreating(false)} className="o-order-dialog-backdrop"><div className="o-order-dialog"><header><div><small>PEMESANAN PEMASOK</small><h2>Buat Pesanan Barang</h2></div><button aria-label="Tutup" disabled={pending} onClick={() => setCreating(false)}><X size={20}/></button></header>
      {error && <p className="o-error" role="alert">{error}</p>}
      <form className="o-order-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <label>Pemasok<select required value={supplier} onChange={(event) => setSupplier(event.target.value)}><option value="">Pilih pemasok</option>{data.suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <div className="o-form-row"><label>Tanggal pemesanan<input type="date" required value={orderDate} onChange={(event) => setOrderDate(event.target.value)}/></label><label>Estimasi penerimaan<input type="date" min={orderDate} required value={estimatedDate} onChange={(event) => setEstimatedDate(event.target.value)}/></label></div>
        <div className="o-order-lines-heading"><h3>Rincian barang</h3><button type="button" className="o-outline" disabled={pending||lines.length>=20} onClick={() => setLines((current) => [...current,{itemId:"",quantity:"",price:""}])}><Plus size={15}/>Tambah Barang</button></div>
        {lines.map((line,index) => <div className="o-order-line" key={index}><label>Barang<select required value={line.itemId} onChange={(event) => patchLine(index,{itemId:event.target.value})}><option value="">Pilih barang</option>{data.items.filter((item) => item.id===line.itemId||!lines.some((other,i)=>i!==index&&other.itemId===item.id)).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></label><label>Jumlah<input required inputMode="decimal" maxLength={11} placeholder="Contoh: 10" value={line.quantity} onChange={(event) => patchLine(index,{quantity:event.target.value})}/></label><label>Harga per unit (Rp)<input required inputMode="decimal" maxLength={13} placeholder="Contoh: 15000" value={line.price} onChange={(event) => patchLine(index,{price:event.target.value})}/></label>{lines.length>1&&<button type="button" className="o-order-remove" aria-label={`Hapus baris ${index+1}`} disabled={pending} onClick={() => setLines((current)=>current.filter((_,i)=>i!==index))}><X size={17}/></button>}</div>)}
        <p className="o-order-footnote">Harga dan jumlah disimpan sebagai nilai pesanan. Pembuatan pesanan tidak menambah stok.</p>
        <footer><button type="button" className="o-outline" disabled={pending} onClick={() => setCreating(false)}>Batal</button><button className="o-primary" disabled={pending}>{pending?"Menyimpan...":"Simpan Pesanan"}</button></footer>
      </form>
    </div></Dialog>}
    {cancel && <Dialog title="Batalkan pesanan" onClose={() => !pending && setCancel(null)}><div className="o-dialog-content"><h2>Batalkan pesanan?</h2><p>Pesanan {cancel} belum memiliki penerimaan. Tindakan ini menghentikan pesanan dari pilihan penerimaan Daily Worker.</p><div className="o-dialog-actions"><button className="o-outline" disabled={pending} onClick={() => setCancel(null)}>Kembali</button><button className="o-danger" disabled={pending} onClick={() => void confirmCancel()}>{pending?"Memproses...":"Ya, Batalkan"}</button></div></div></Dialog>}
  </>;
}

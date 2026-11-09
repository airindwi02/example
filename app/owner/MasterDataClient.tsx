"use client";
import OwnerPriceForm from "./OwnerPriceForm";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { saveMasterAction, deleteMasterAction } from "./master-data/actions";
import { matches, stockStatus, type MasterItem as Ingredient, type MasterSupplier as Supplier, type MasterUnit as Unit, type MasterSnapshot } from "../../lib/owner-master-types";
import { Badge, Empty, Intro, Notice, Pager, SearchBox } from "./OwnerUI";
type Tab = "Bahan Baku" | "Satuan" | "Pemasok" | "Batas Minimum";
type RecordData = Ingredient | Supplier | Unit;
type Form = {
  name: string;
  category: string;
  unit: string;
  minimum: string;
  supplier: string;
  symbol: string;
  phone: string;
  address: string;
};
const blank: Form = {
  name: "",
  category: "Bahan Baku",
  unit: "kg",
  minimum: "",
  supplier: "",
  symbol: "",
  phone: "",
  address: "",
};
function MasterDataClientBody({ initialData }: { initialData: MasterSnapshot }) {
  const [state, setData] = useState(initialData);
  const [pending, setPending] = useState(false);
  const categories = state.categories;
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("Bahan Baku");
  const [query, setQuery] = useState(params.get("cari") ?? "");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(params.get("pilih"));
  const [mode, setMode] = useState<"detail" | "form" | "delete">("detail");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const records: RecordData[] =
    tab === "Satuan"
      ? state.units
      : tab === "Pemasok"
        ? state.suppliers
        : state.ingredients;
  const filtered = records.filter((r) =>
    matches(Object.values(r).join(" "), query),
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 8)),
  );
  const shown = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const item = records.find((i) => i.id === selected);
  const kind =
    tab === "Satuan" ? "Satuan" : tab === "Pemasok" ? "Pemasok" : "Bahan";
  function changeTab(t: Tab) {
    setTab(t);
    setQuery("");
    setPage(1);
    setSelected(null);
    setMode("detail");
    setError("");
    setNotice("");
  }
  function edit(r?: RecordData) {
    setEditing(r?.id ?? null);
    setSelected(r?.id ?? null);
    setForm({
      ...blank,
      name: r?.name ?? "",
      category: r && "category" in r ? r.category : "Bahan Baku",
      unit: r && "unit" in r ? r.unit : (state.units[0]?.symbol ?? ""),
      minimum: r && "minimum" in r ? String(r.minimum) : "",
      supplier:
        r && "supplier" in r ? r.supplier : "",
      symbol: r && "symbol" in r ? r.symbol : "",
      phone: r && "phone" in r ? r.phone : "",
      address: r && "address" in r ? r.address : "",
    });
    setMode("form");
    setError("");
    setNotice("");
  }
  function field(k: keyof Form, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending || tab === "Satuan") return;
    setPending(true); setError(""); setNotice("");
    try {
      const result = await saveMasterAction(tab === "Pemasok"
        ? { kind: "pemasok", id: editing ?? undefined, name: form.name, phone: form.phone, address: form.address }
        : { kind: "barang", id: editing ?? undefined, name: form.name, category: form.category, unit: form.unit, minimum: form.minimum });
      if (!result.ok) { setError(result.message); return; }
      setData(result.data); setSelected(result.id ?? null); setMode("detail"); setNotice(result.message);
      if (!editing) { setQuery(form.name.trim()); setPage(1); }
    } catch { setError("Data gagal disimpan. Silakan coba kembali."); }
    finally { setPending(false); }
  }
  async function remove() {
    if (!item || pending || tab === "Satuan") return;
    setPending(true); setError(""); setNotice("");
    try {
      const result = await deleteMasterAction(tab === "Pemasok" ? "pemasok" : "barang", item.id);
      if (!result.ok) { setError(result.message); return; }
      setData(result.data); setSelected(null); setMode("detail"); setNotice(result.message);
    } catch { setError("Data gagal dihapus. Silakan coba kembali."); }
    finally { setPending(false); }
  }
  const input = (label: string, k: keyof Form, placeholder?: string) => (
    <label>
      {label}
      <input
        disabled={pending}
        maxLength={k === "name" ? 50 : k === "phone" ? 20 : k === "address" ? 255 : undefined}
        aria-invalid={
          !!error &&
          ((k === "name" && !form.name.trim()) ||
            (k === "minimum" &&
              (form.minimum === "" ||
                !Number.isFinite(Number(form.minimum)) ||
                Number(form.minimum) < 0)))
        }
        value={form[k]}
        placeholder={placeholder}
        onChange={(e) => field(k, e.target.value)}
      />
    </label>
  );
  return (
    <>
      <Intro
        title="Kelola Data Persediaan"
        subtitle="Pilih kategori, lalu tambah, ubah, hapus, atau cari data."
      />
      <div className="o-columns">
        <section>
          <div
            role="tablist"
            aria-label="Kategori Master Data"
            className="o-tabs o-master-tabs"
          >
            {(
              ["Bahan Baku", "Satuan", "Pemasok", "Batas Minimum"] as Tab[]
            ).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => changeTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="o-master-toolbar">
            <SearchBox
              value={query}
              onChange={(s) => {
                setQuery(s);
                setPage(1);
              }}
              placeholder={
                tab === "Bahan Baku"
                  ? "Cari data bahan baku..."
                  : tab === "Satuan"
                    ? "Cari data satuan..."
                    : tab === "Pemasok"
                      ? "Cari data pemasok..."
                      : "Cari data batas minimum..."
              }
            />
            <button className="o-primary" disabled={pending || tab === "Satuan"} onClick={() => edit()}>
              <Plus size={17} /> Tambah Data
            </button>
          </div>
          {tab === "Satuan" && <p>Satuan berasal dari barang. Kelola satuan melalui formulir barang, bukan tabel terpisah.</p>}
          {notice && <Notice>{notice}</Notice>}
          <div className="o-table-wrap">
            <table>
              <thead>
                <tr>
                  {(tab === "Satuan"
                    ? ["Nama Satuan", "Singkatan", "Dipakai oleh", "Aksi"]
                    : tab === "Pemasok"
                      ? ["Nama Pemasok", "Kontak", "Bahan Dipasok", "Aksi"]
                      : tab === "Batas Minimum"
                        ? ["Bahan", "Stok", "Batas Min.", "Status", "Aksi"]
                        : [
                            "Nama Bahan",
                            "Kategori",
                            "Stok",
                            "Batas Min.",
                            "Aksi",
                          ]
                  ).map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    className={selected === r.id ? "o-selected" : ""}
                  >
                    <td>
                      <button
                        className="o-row-button"
                        onClick={() => {
                          setSelected(r.id);
                          setMode("detail");
                          setError("");
                        }}
                      >
                        {r.name}
                      </button>
                    </td>
                    {"symbol" in r ? (
                      <>
                        <td>{r.symbol}</td>
                        <td>
                          {
                            state.ingredients.filter((i) => i.unit === r.symbol)
                              .length
                          }{" "}
                          bahan
                        </td>
                      </>
                    ) : "phone" in r ? (
                      <>
                        <td>{r.phone}</td>
                        <td>{r.goods}</td>
                      </>
                    ) : tab === "Batas Minimum" ? (
                      <>
                        <td>
                          {r.stock} {r.unit}
                        </td>
                        <td>
                          {r.minimum} {r.unit}
                        </td>
                        <td>
                          <Badge>{stockStatus(r)}</Badge>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{r.category}</td>
                        <td>
                          {r.stock} {r.unit}
                        </td>
                        <td>
                          {r.minimum} {r.unit}
                        </td>
                      </>
                    )}
                    <td>
                      <div className="o-row-actions">
                        <button disabled={pending || tab === "Satuan"} onClick={() => edit(r)}>Ubah</button>
                        <button disabled={pending || tab === "Satuan"}
                          onClick={() => {
                            setSelected(r.id);
                            setMode("delete");
                            setError("");
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!shown.length && (
              <Empty
                title="Data tidak ditemukan"
                description="Coba kata kunci lain atau tambahkan data baru."
              />
            )}
          </div>
          <Pager
            page={currentPage}
            total={filtered.length}
            onChange={setPage}
          />
        </section>
        <aside className="o-panel" aria-label="Panel data master">
          {mode === "form" ? (
            <form className="o-master-form" onSubmit={save} noValidate>
              <h3>Tambah / Ubah Data {kind}</h3>
              {input(`Nama ${kind}`, "name")}
              {tab === "Satuan" ? (
                input("Simbol", "symbol")
              ) : tab === "Pemasok" ? (
                <>
                  {input("Telepon", "phone")}
                  {input("Alamat", "address")}
                </>
              ) : (
                <>
                  <label>
                    Kategori
                    <select disabled={pending}
                      value={form.category}
                      onChange={(e) => field("category", e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <div className="o-form-row">
                    <label>
                      Satuan
                      <input disabled={pending} maxLength={10} list="master-units" value={form.unit} onChange={e => field("unit",e.target.value)}/><datalist id="master-units">{state.units.map(u => <option key={u.id} value={u.symbol}/>)}</datalist>
                    </label>
                    {input("Batas Minimum", "minimum")}
                  </div>
                  <label>
                    Pemasok
                    <input readOnly value={form.supplier || "Mengikuti riwayat penerimaan"}/><small>Pemasok mengikuti riwayat penerimaan, bukan atribut master barang.</small>
                  </label>
                </>
              )}
              {error && (
                <div className="o-error" role="alert">
                  {error}
                </div>
              )}
              <div className="o-panel-actions">
                <button
                  type="button"
                  className="o-outline"
                  onClick={() => {
                    setMode("detail");
                    setError("");
                  }}
                >
                  Batal
                </button>
                <button className="o-primary" type="submit" disabled={pending}>
                  {pending ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          ) : mode === "delete" && item ? (
            <div className="o-delete-state">
              <span className="o-delete-icon">
                <X size={28} />
              </span>
              <h3>Hapus data ini?</h3>
              <p>
                Data “{item.name}” akan dihapus dari daftar. Tindakan ini tidak
                dapat dibatalkan.
              </p>
              {error && (
                <div className="o-error" role="alert">
                  {error}
                </div>
              )}
              <div className="o-dialog-actions">
                <button
                  className="o-outline"
                  onClick={() => {
                    setMode("detail");
                    setError("");
                  }}
                >
                  Tidak
                </button>
                <button className="o-primary" onClick={remove} disabled={pending}>
                  {pending ? "Menghapus..." : "Ya, Hapus"}
                </button>
              </div>
            </div>
          ) : item ? (
            <>
              <h3>Hasil Rincian Data</h3>
              <dl className="o-details">
                {Object.entries(
                  "stock" in item
                    ? {
                        "Nama Bahan": item.name,
                        Kategori: item.category,
                        Satuan: item.unit,
                        Stok: `${item.stock} ${item.unit}`,
                        "Batas Minimum": `${item.minimum} ${item.unit}`,
                        Pemasok: item.supplier,
                      }
                    : "symbol" in item
                      ? {
                          "Nama Satuan": item.name,
                          Simbol: item.symbol,
                          "Dipakai pada": `${state.ingredients.filter((i) => i.unit === item.symbol).length} bahan`,
                        }
                      : {
                          "Nama Pemasok": item.name,
                          Telepon: item.phone,
                          Alamat: item.address || "Belum diisi",
                          "Bahan Dipasok": item.goods,
                        },
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="o-panel-actions">
                <button disabled={pending || tab === "Satuan"} className="o-outline" onClick={() => edit(item)}>
                  Ubah
                </button>
                <button disabled={pending || tab === "Satuan"} className="o-primary" onClick={() => setMode("delete")}>
                  Hapus
                </button>
              </div>
            </>
          ) : (
            <>
              <Empty
                className="o-panel-empty"
                title="Pilih data"
                description="Klik baris untuk melihat rincian, atau tambah data baru."
              />
              <button className="o-primary o-panel-add" disabled={pending || tab === "Satuan"} onClick={() => edit()}>
                <Plus size={16} /> Tambah Data
              </button>
            </>
          )}
          {mode==="detail"&&item&&"category" in item&&item.category==="Produk Hasil"&&state.pricing?.enabled&&<OwnerPriceForm key={item.id} id={item.id} price={state.pricing.prices[item.id]??null}/>}
        </aside>
      </div>
    </>
  );
}

export default function MasterDataClient({ initialData }: { initialData: MasterSnapshot }) {
  const params = useSearchParams();
  return <MasterDataClientBody key={params.toString()} initialData={initialData} />;
}

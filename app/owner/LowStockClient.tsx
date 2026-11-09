"use client";
import Link from "next/link";
import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import type { MasterItem } from "../../lib/owner-master-types";
import { matches } from "../../lib/owner-master-types";
import { Badge, Empty, Intro, Pager, SearchBox } from "./OwnerUI";
function stockStatus(i: MasterItem) {
  return i.stock > i.minimum ? "Normal" : i.stock <= i.minimum * 0.375 ? "Kritis" : "Menipis";
}
export default function LowStockClient({ initialData }: { initialData: MasterItem[] }) {
  const [filter, setFilter] = useState("Semua"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1);
  const low = initialData.filter((i) => i.stock <= i.minimum);
  const critical = low.filter((i) => stockStatus(i) === "Kritis").length;
  const filtered = low.filter(
    (i) =>
      (filter === "Semua" || stockStatus(i) === filter) &&
      matches([i.name, i.category, i.supplier].join(" "), query),
  );
  const near = initialData
    .filter((i) => i.minimum > 0)
    .sort((a, b) => a.stock / a.minimum - b.stock / b.minimum)
    .slice(0, 4)
    .sort((a, b) => initialData.indexOf(a) - initialData.indexOf(b));
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 8)),
  );
  return (
    <>
      <Intro
        title="Peringatan Stok Menipis"
        subtitle="Bahan dengan stok ≤ batas minimum."
      />
      {!low.length ? (
        <>
          <Empty
            title="Tidak ada stok menipis"
            description="Semua bahan masih di atas batas minimum."
          />
          <section className="o-near-stock">
            <h3>Bahan Paling Mendekati Batas Minimum</h3>
            <div className="o-table-wrap">
              <table>
                <thead>
                  <tr>
                    {["Bahan", "Stok", "Minimum", "Selisih", "Status"].map(
                      (h) => (
                        <th key={h}>{h}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {near.map((i) => (
                    <tr key={i.id}>
                      <td>{i.name}</td>
                      <td>
                        {i.stock} {i.unit}
                      </td>
                      <td>
                        {i.minimum} {i.unit}
                      </td>
                      <td>
                        +{i.stock - i.minimum} {i.unit}
                      </td>
                      <td>
                        <Badge>Aman</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="o-warning">
            <TriangleAlert size={19} />
            <strong>
              {low.length} bahan telah mencapai batas minimum.
            </strong>{" "}
            Segera lakukan pembelian.
          </div>
          <div className="o-low-toolbar">
            <div className="o-tabs">
              {[
                ["Semua", low.length],
                ["Kritis", critical],
                ["Menipis", low.length - critical],
              ].map(([label, count]) => (
                <button
                  key={label}
                  aria-pressed={filter === label}
                  onClick={() => {
                    setFilter(String(label));
                    setPage(1);
                  }}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            <SearchBox
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder="Cari bahan atau pemasok..."
            />
          </div>
          <div className="o-table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    "Bahan",
                    "Kategori",
                    "Stok",
                    "Minimum",
                    "Kurang",
                    "Pemasok",
                    "Status",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice((currentPage - 1) * 8, currentPage * 8)
                  .map((i) => (
                    <tr key={i.id}>
                      <td>
                        <Link
                          href={`/owner/master-data?pilih=${i.id}&cari=${encodeURIComponent(i.name)}`}
                        >
                          <strong>{i.name}</strong>
                        </Link>
                      </td>
                      <td>{i.category}</td>
                      <td>
                        {i.stock} {i.unit}
                      </td>
                      <td>
                        {i.minimum} {i.unit}
                      </td>
                      <td className="o-negative">
                        {i.minimum - i.stock} {i.unit}
                      </td>
                      <td>{i.supplier}</td>
                      <td>
                        <Badge>{stockStatus(i)}</Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!filtered.length && (
              <Empty
                title="Bahan tidak ditemukan"
                description="Coba kata kunci atau filter status lain."
              />
            )}
          </div>
          <Pager
            page={currentPage}
            total={filtered.length}
            onChange={setPage}
            noun="bahan"
          />
        </>
      )}
    </>
  );
}

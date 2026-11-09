"use client";
import { NotificationList } from "../KasirShell";
import { useKasir } from "../KasirState";
import { Intro } from "../KasirUI";
export default function Page() {
  const { setRead } = useKasir();
  return (
    <>
      <Intro title="Notifikasi" subtitle="Peringatan stok produk terbaru." />
      <section className="k-all-notifications">
        <div className="k-notifications-title">
          <h2>Semua notifikasi</h2>
          <button onClick={() => setRead(true)}>Tandai dibaca</button>
        </div>
        <NotificationList />
      </section>
    </>
  );
}

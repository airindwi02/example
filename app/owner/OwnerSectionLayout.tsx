"use client";
import LogoutLink from "../_auth/LogoutLink";
import Link from "next/link";
import { useApprovalsEnabled } from "../_auth/AuthMode";
function ApprovalNavigation() {
  const enabled = useApprovalsEnabled();
  return enabled ? <Link href="/owner/persetujuan">Persetujuan Akun</Link> : null;
}
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Database,
  ShoppingBasket,
  ChartColumn,
  TriangleAlert,
  Download,
  Upload,
  Store,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { useOwner } from "./OwnerState";
import { Dialog } from "./OwnerUI";
const navigation = [
  { title: "Dashboard", href: "/owner", Icon: LayoutDashboard },
  { title: "Master Data", href: "/owner/master-data", Icon: Database },
  { title: "Pesanan Barang", href: "/owner/pesanan", Icon: ShoppingBasket },
  { title: "Laporan", href: "/owner/laporan", Icon: ChartColumn },
  { title: "Stok Menipis", href: "/owner/stok-menipis", Icon: TriangleAlert },
  { title: "Riwayat Masuk", href: "/owner/riwayat-masuk", Icon: Download },
  { title: "Riwayat Keluar", href: "/owner/riwayat-keluar", Icon: Upload },
];
export default function OwnerSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname(),
    router = useRouter();
  const { ingredients, recent, setRecent, read, setRead } = useOwner();
  const [query, setQuery] = useState("");
  const [clock, setClock] = useState<Date | null>(null);
  const [notifications, setNotifications] = useState(false),
    [logout, setLogout] = useState(false),
    [menu, setMenu] = useState(false);
  useEffect(() => {
    const updateClock = () => setClock(new Date());
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotifications(false);
        setMenu(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const lowNotifications = ingredients
    .filter((item) => item.stock <= item.minimum)
    .slice(0, 10)
    .map((item) => ({
      title: item.name + (item.stock <= 0 ? " habis" : " mencapai batas minimum"),
      text: `Stok ${item.stock} ${item.unit}; minimum ${item.minimum} ${item.unit}`,
      time: "Stok saat ini",
      tone: "red",
      q: item.name,
      id: item.id,
    }));
  const notificationCount = lowNotifications.length;
  const closeLogout = useCallback(() => setLogout(false), []);
  const current = navigation.find((i) => i.href === pathname) ?? {
    title: pathname.includes("pencarian") ? "Pencarian" : pathname.includes("pesanan") ? "Pesanan Barang" : "Tentang Alana",
    Icon: pathname.includes("pencarian") ? Search : pathname.includes("pesanan") ? ShoppingBasket : Store,
  };
  const Icon = current.Icon;
  return (
    <div className="o-app">
      <aside
        className={`o-sidebar ${menu ? "o-open" : ""}`}
        aria-label="Navigasi Owner"
      >
        <Link
          className="o-brand"
          href="/owner"
          onClick={() => {
            setMenu(false);
            setNotifications(false);
          }}
        >
          <Image
            unoptimized
            src="/owner/logo.png"
            width={44}
            height={44}
            alt="Logo Alana Pâtisserie"
          />
          <span>
            <strong>Alana</strong>
            <small>PÂTISSERIE</small>
          </span>
        </Link>
        <nav>
          {navigation.map(({ title, href, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => {
                setMenu(false);
                setNotifications(false);
              }}
              aria-current={pathname === href ? "page" : undefined}
              className={pathname === href ? "o-active" : ""}
            >
              <Icon size={19} />
              {title}
            </Link>
          ))}
        </nav>
        <div className="o-sidebar-bottom">
          <ApprovalNavigation />
          <Link
            href="/owner/tentang-alana"
            className={pathname.includes("tentang-alana") ? "o-active" : ""}
            onClick={() => {
              setMenu(false);
              setNotifications(false);
            }}
          >
            <Store size={19} />
            Tentang Alana
          </Link>
          <div className="o-profile">
            <span className="o-avatar">O</span>
            <span>
              <strong>Owner</strong>
              <small>Pemilik</small>
            </span>
            <button
              aria-label="Keluar"
              onClick={() => {
                setMenu(false);
                setLogout(true);
              }}
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="o-menu-shade"
          aria-label="Tutup navigasi"
          onClick={() => {
            setMenu(false);
            setNotifications(false);
          }}
        />
      )}
      <div className="o-workspace">
        <header className="o-header">
          <button
            className="o-mobile-menu"
            aria-label="Buka navigasi"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={23} />
          </button>
          <div className="o-page-title">
            <Icon size={24} />
            <h1>{current.title}</h1>
          </div>
          <form
            className="o-global-search"
            onSubmit={(e) => {
              e.preventDefault();
              if (!query.trim()) return;
              setRecent(
                [
                  query.trim(),
                  ...recent.filter((i) => i !== query.trim()),
                ].slice(0, 5),
              );
              setNotifications(false);
              router.push(
                `/owner/pencarian?q=${encodeURIComponent(query.trim())}`,
              );
            }}
          >
            <Search size={17} />
            <input
              aria-label="Pencarian global"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari barang, transaksi..."
            />
            {query && (
              <button
                type="button"
                aria-label="Bersihkan pencarian global"
                onClick={() => setQuery("")}
              >
                <X size={17} />
              </button>
            )}
          </form>
          <button
            className={`o-bell ${notifications ? "o-bell-active" : ""}`}
            aria-label="Notifikasi"
            aria-expanded={notifications}
            onClick={() => setNotifications(!notifications)}
          >
            <Bell size={20} />
            {!read && <span>{notificationCount}</span>}
          </button>
          <div className="o-clock">
            <strong>{clock ? new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(clock) : ""}</strong>
            <small>{clock ? new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(clock) + " WIB" : ""}</small>
          </div>
        </header>
        <main className="o-main">{children}</main>
      </div>
      {notifications && (
        <>
          <button
            aria-label="Tutup notifikasi"
            className="o-notification-shade"
            onClick={() => setNotifications(false)}
          />
          <section className="o-notifications" aria-label="Daftar notifikasi">
            <div className="o-notifications-title">
              <h2>
                Notifikasi{" "}
                <span>{read ? "0 baru" : `${notificationCount} baru`}</span>
              </h2>
              <button onClick={() => setRead(true)}>Tandai dibaca</button>
            </div>
            {lowNotifications.map((n) => (
              <Link
                key={n.id}
                className="o-notification"
                href={`/owner/master-data?cari=${encodeURIComponent(n.q)}&pilih=${n.id}`}
                onClick={() => {
                  setNotifications(false);
                  setRead(true);
                }}
              >
                <span className={`o-dot o-dot-${read ? "read" : n.tone}`} />
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.text}</p>
                </div>
                <small>{n.time}</small>
              </Link>
            ))}
            {!lowNotifications.length && <p className="o-notification-empty">Tidak ada barang yang mencapai batas minimum.</p>}
            <Link
              className="o-notifications-all"
              href="/owner/stok-menipis"
              onClick={() => setNotifications(false)}
            >
              Lihat semua peringatan
            </Link>
          </section>
        </>
      )}
      {logout && (
        <Dialog title="Konfirmasi keluar" onClose={closeLogout}>
          <span className="o-logout-icon">
            <LogOut size={30} />
          </span>
          <h2>Yakin ingin keluar?</h2>
          <p>Anda akan keluar dari akun Owner dan kembali ke halaman login.</p>
          <div className="o-dialog-actions">
            <button className="o-outline" onClick={closeLogout}>
              Batal
            </button>
            <LogoutLink className="o-primary">
              Ya, keluar
            </LogoutLink>
          </div>
        </Dialog>
      )}
    </div>
  );
}

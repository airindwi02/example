"use client";
import LogoutLink from "../_auth/LogoutLink";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  ReceiptText,
  Store,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { useKasir } from "./KasirState";
import { Dialog } from "./KasirUI";
const nav = [
  { title: "Dashboard", href: "/kasir", Icon: LayoutDashboard },
  { title: "Produk Terjual", href: "/kasir/produk-terjual", Icon: ShoppingBag },
  {
    title: "Riwayat Penjualan",
    href: "/kasir/riwayat-penjualan",
    Icon: ReceiptText,
  },
];
function SearchForm({ initial }: { initial: string }) {
  const [query, setQuery] = useState(initial);
  const { setRecent } = useKasir();
  const router = useRouter();
  return (
    <form
      className="k-global-search"
      onSubmit={(e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setRecent((r) =>
          [query.trim(), ...r.filter((i) => i !== query.trim())].slice(0, 5),
        );
        router.push(`/kasir/pencarian?q=${encodeURIComponent(query.trim())}`);
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
  );
}
function HeaderSearch() {
  const params = useSearchParams();
  return (
    <SearchForm key={params.get("q") ?? ""} initial={params.get("q") ?? ""} />
  );
}
export function NotificationList({
  onChoose = () => {},
}: {
  onChoose?: () => void;
}) {
  const { state, read, setRead } = useKasir();
  const low = state.products
    .filter((p) => p.stock <= p.minimum)
    .sort((a, b) => a.stock - b.stock);
  return (
    <>
      {low.map((p) => (
        <Link
          key={p.id}
          className="k-notification"
          href={`/kasir/produk-terjual?cari=${encodeURIComponent(p.name)}`}
          onClick={() => {
            onChoose();
            setRead(true);
          }}
        >
          <span className={`k-dot ${read ? "k-dot-read" : "k-dot-amber"}`} />
          <div>
            <strong>{p.name} stok rendah</strong>
            <p>Sisa {p.stock} {p.unit}</p>
          </div>
          <small>Data terkini</small>
        </Link>
      ))}
      {!low.length && (
        <p className="k-table-empty">Tidak ada notifikasi stok rendah.</p>
      )}
    </>
  );
}
export default function KasirShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, read, setRead } = useKasir();
  const [menu, setMenu] = useState(false),
    [notifications, setNotifications] = useState(false),
    [logout, setLogout] = useState(false);
  const closeLogout = useCallback(() => setLogout(false), []);
  const current = nav.find((n) => n.href === pathname) ?? {
    title: pathname.includes("pencarian")
      ? "Pencarian"
      : pathname.includes("notifikasi")
        ? "Notifikasi"
        : "Tentang Alana",
    Icon: pathname.includes("pencarian")
      ? Search
      : pathname.includes("notifikasi")
        ? Bell
        : Store,
  };
  const Icon = current.Icon;
  const low = state.products.filter((p) => p.stock <= p.minimum);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        setNotifications(false);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const closeNavigation = () => {
    setMenu(false);
    setNotifications(false);
  };
  return (
    <div className="k-app">
      <aside
        className={`k-sidebar ${menu ? "k-open" : ""}`}
        aria-label="Navigasi Kasir"
      >
        <Link className="k-brand" href="/kasir" onClick={closeNavigation}>
          <Image unoptimized
            src="/kasir/logo.png"
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
          {nav.map(({ title, href, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={closeNavigation}
              aria-current={pathname === href ? "page" : undefined}
              className={pathname === href ? "k-active" : ""}
            >
              <Icon size={19} />
              {title}
            </Link>
          ))}
        </nav>
        <div className="k-sidebar-bottom">
          <Link
            href="/kasir/tentang-alana"
            className={pathname.includes("tentang-alana") ? "k-active" : ""}
            onClick={closeNavigation}
          >
            <Store size={19} />
            Tentang Alana
          </Link>
          <div className="k-profile">
            <span className="k-avatar">K</span>
            <span>
              <strong>{state.actor}</strong>
              <small>Kasir</small>
            </span>
            <button
              aria-label="Keluar"
              onClick={() => {
                closeNavigation();
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
          className="k-menu-shade"
          aria-label="Tutup navigasi"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="k-workspace">
        <header className="k-header">
          <button
            className="k-mobile-menu"
            aria-label="Buka navigasi"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={23} />
          </button>
          <div className="k-page-title">
            <Icon size={24} />
            <h1>{current.title}</h1>
          </div>
          <Suspense fallback={<div className="k-global-search" />}>
            <HeaderSearch />
          </Suspense>
          <button
            className={`k-bell ${notifications ? "k-bell-active" : ""}`}
            aria-label="Notifikasi"
            aria-expanded={notifications}
            onClick={() => setNotifications(!notifications)}
          >
            <Bell size={20} />
            {!read && !!low.length && <span>{low.length}</span>}
          </button>
          <div className="k-clock">
            <strong>{state.today}</strong>
            <small>Asia/Jakarta</small>
          </div>
        </header>
        <main className="k-main">{children}</main>
      </div>
      {notifications && (
        <>
          <button
            className="k-notification-shade"
            aria-label="Tutup notifikasi"
            onClick={() => setNotifications(false)}
          />
          <section className="k-notifications" aria-label="Daftar notifikasi">
            <div className="k-notifications-title">
              <h2>
                Notifikasi <span>{read ? 0 : low.length} baru</span>
              </h2>
              <button onClick={() => setRead(true)}>Tandai dibaca</button>
            </div>
            <NotificationList onChoose={() => setNotifications(false)} />
            <Link
              href="/kasir/notifikasi"
              className="k-notifications-all"
              onClick={() => setNotifications(false)}
            >
              Lihat semua notifikasi
            </Link>
          </section>
        </>
      )}
      {logout && (
        <Dialog title="Konfirmasi keluar" onClose={closeLogout}>
          <span className="k-logout-icon">
            <LogOut size={28} />
          </span>
          <h2>Yakin ingin keluar?</h2>
          <p>
            Anda akan keluar dari akun Kasir
            <br />
            dan kembali ke halaman login.
          </p>
          <div className="k-dialog-actions">
            <button className="k-outline" onClick={closeLogout}>
              Batal
            </button>
            <LogoutLink className="k-primary">
              Ya, keluar
            </LogoutLink>
          </div>
        </Dialog>
      )}
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import "./_auth/auth.css";
export default function Page() {
  return (
    <main className="a-splash" lang="id">
      <Link
        className="a-splash-link"
        href="/login"
        aria-label="Lanjut ke halaman login"
      >
        <div className="a-splash-art">
          <Image
            unoptimized
            className="a-splash-wheat a-splash-wheat-left"
            src="/auth/wheat-left.png"
            width={65}
            height={187}
            alt=""
          />
          <Image
            unoptimized
            className="a-splash-logo"
            src="/auth/logo.png"
            width={296}
            height={296}
            alt="Logo Alana Pâtisserie"
            priority
          />
          <Image
            unoptimized
            className="a-splash-wheat a-splash-wheat-right"
            src="/auth/wheat-right.png"
            width={65}
            height={187}
            alt=""
          />
        </div>
        <h1>Alana</h1>
        <p className="a-splash-label">PATISSERIE</p>
        <p className="a-splash-description">
          Sistem Informasi Persediaan Bahan Baku, Kue, Roti, dan Minuman
        </p>
        <span className="a-splash-line" aria-hidden="true" />
      </Link>
    </main>
  );
}

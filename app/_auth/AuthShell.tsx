import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
export default function AuthShell({
  children,
  register = false,
  error = false,
}: {
  children: ReactNode;
  register?: boolean;
  error?: boolean;
}) {
  return (
    <main
      lang="id"
      className={`a-auth ${register ? "a-register" : ""} ${error ? "a-login-error" : ""}`}
    >
      <section className="a-brand-panel" aria-label="Alana Pâtisserie">
        <Image
          unoptimized
          className="a-brand-art-top"
          src={`/auth/${register ? "register" : "login"}-top-art.png`}
          width={register ? 400 : 378}
          height={register ? 370 : 365}
          alt=""
          priority
        />
        <Image
          unoptimized
          className="a-brand-art-bottom"
          src={`/auth/${register ? "register" : "login"}-bottom-art.png`}
          width={720}
          height={240}
          alt=""
        />
        <div className="a-brand-copy">
          <Link
            className="a-brand-logo"
            href="/"
            aria-label="Halaman pembuka Alana"
          >
            <Image
              unoptimized
              src="/auth/logo.png"
              width={126}
              height={126}
              alt="Logo Alana Pâtisserie"
              priority
            />
          </Link>
          <h2>Alana Patisserie</h2>
          <p>Sistem Informasi Persediaan Bahan Baku, Kue, Roti, dan Minuman</p>
        </div>
      </section>
      <section
        className="a-form-panel"
        aria-label={register ? "Pendaftaran demo" : "Login demo"}
      >
        {children}
      </section>
    </main>
  );
}

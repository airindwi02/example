"use client";
import Link from "next/link";
import { useState } from "react";
import { logoutAction } from "./actions";
import { useDatabaseAuth } from "./AuthMode";
export default function LogoutLink({ className, children }: { className: string; children: React.ReactNode }) {
  const enabled = useDatabaseAuth();
  const [pending, setPending] = useState(false);
  if (!enabled) return <Link className={className} href="/login">{children}</Link>;
  return <button className={className} disabled={pending} onClick={async () => { setPending(true); try { await logoutAction(); } finally { setPending(false); } }}>{pending ? "Keluar…" : children}</button>;
}

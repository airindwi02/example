import { Suspense } from "react";
import { approvalsEnabled } from "../../../lib/auth-config";
import { authenticatedAccount } from "../../../lib/auth";
import { pendingAccounts } from "../../../lib/auth-repository";

export const instant = false;
import ApprovalForm from "./ApprovalForm";
import "./approval.css";
async function Requests() {
  if (!approvalsEnabled()) return <p>Persetujuan akun belum diaktifkan. Menunggu persetujuan perubahan schema dan penyiapan akun Owner.</p>;
  const actor = await authenticatedAccount();
  if (!actor || actor.peran !== "Owner") return <p>Akses ditolak.</p>;
  const pending = await pendingAccounts();
  return <>{pending.length === 0 && <p>Tidak ada pendaftaran menunggu persetujuan.</p>}{pending.map(a => <section key={a.id_pengguna} className="approval-card"><h2>{a.nama_pengguna}</h2><p>{a.username} · {a.peran}</p><p>{a.nomor_hp} · {a.email || "Email tidak diisi"}</p><ApprovalForm id={a.id_pengguna} role={a.peran}/></section>)}</>;
}
export default function Page() { return <main className="approval-page"><h1>Persetujuan Akun</h1><Suspense fallback={<p>Memuat pendaftaran…</p>}><Requests/></Suspense></main>; }

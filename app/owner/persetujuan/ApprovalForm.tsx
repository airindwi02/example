"use client";
import { useState } from "react";
import { approvalAction } from "../../_auth/actions";
import { useRouter } from "next/navigation";
export default function ApprovalForm({ id, role }: { id: string; role: string }) {
  const [pending, setPending] = useState(false), [message, setMessage] = useState("");
  const router = useRouter();
  return <form onSubmit={async e => { e.preventDefault(); if (pending) return; const form = e.currentTarget; const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; const data = new FormData(form); data.set("decision", submitter?.value ?? ""); setPending(true); try { const result = await approvalAction(data); setMessage(result.message); if (result.ok) router.refresh(); } catch { setMessage("Permintaan tidak dapat diproses."); } finally { form.reset(); setPending(false); } }}>
    <input type="hidden" name="id" value={id}/>
    <label>Role yang disahkan <select name="role" defaultValue={role}>{(["Baker", "Barista"].includes(role) ? ["Baker", "Barista"] : [role]).map(r => <option key={r}>{r}</option>)}</select></label>
    <label>Password Owner untuk verifikasi <input name="ownerPassword" type="password" autoComplete="current-password" required maxLength={128}/></label>
    {role === "Owner" && <p>Persetujuan ini memberikan hak Owner. Pastikan identitas pemohon sudah diverifikasi.</p>}
    <button name="decision" type="submit" disabled={pending} value="ACTIVE">Setujui</button>
    <button name="decision" type="submit" disabled={pending} value="REJECTED">Tolak</button>
    <p role="status">{message}</p>
  </form>;
}

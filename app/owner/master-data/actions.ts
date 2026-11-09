"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";
import { requireMasterOwner } from "../../../lib/owner-master";
import { deleteMaster, saveMaster, MasterError } from "../../../lib/owner-master-service";
import type { MasterResult } from "../../../lib/owner-master-types";
function message(error: unknown) {
  if (error instanceof MasterError) return error.message;
  const code = (error as { code?: string })?.code;
  if (code === "P2003") return "Data masih digunakan oleh data lain dan tidak dapat dihapus.";
  if (code === "P2025") return "Data sudah berubah atau tidak ditemukan. Muat ulang halaman.";
  if (code === "P2002") return "ID data bentrok. Silakan coba simpan kembali.";
  return "Permintaan gagal. Periksa sesi Owner atau coba kembali nanti.";
}
export async function saveMasterAction(input: unknown): Promise<MasterResult> {
  try { const actor = await requireMasterOwner(); const result = await saveMaster(prisma,actor,input); revalidatePath("/owner/master-data"); return { ok:true, ...result, message:"Data master berhasil disimpan ke database." }; }
  catch(error) { return { ok:false, message:message(error) }; }
}
export async function deleteMasterAction(kind: unknown, id: unknown): Promise<MasterResult> {
  try { const actor = await requireMasterOwner(); const data = await deleteMaster(prisma,actor,kind,id); revalidatePath("/owner/master-data"); return { ok:true,data,message:"Data master berhasil dihapus." }; }
  catch(error) { return { ok:false,message:message(error) }; }
}

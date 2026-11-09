"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";
import { requireMasterOwner } from "../../../lib/owner-master";
import { cancelOrder, createOrder, OrderError } from "../../../lib/order-service";
import type { OrderCommand, OrderResult, OrderSnapshot } from "../../../lib/order-types";

function failure(error: unknown) {
  if (error instanceof OrderError) return error.message;
  const code = (error as { code?: string })?.code;
  if (code === "P2002") return "ID pesanan bentrok. Muat ulang lalu coba kembali.";
  if (code === "P2003") return "Pemasok atau barang sudah tidak tersedia. Muat ulang data.";
  if (code === "P2025") return "Pesanan sudah berubah atau tidak ditemukan. Muat ulang data.";
  return "Pesanan gagal diproses. Periksa sesi Owner atau coba kembali nanti.";
}
export async function createOrderAction(input: OrderCommand): Promise<OrderResult> {
  try {
    const actor = await requireMasterOwner();
    const result = await createOrder(prisma, actor, input);
    revalidatePath("/owner/pesanan"); revalidatePath("/daily-worker", "layout");
    return { ok: true, ...result, message: result.replayed ? "Pesanan ini sudah tersimpan sebelumnya." : "Pesanan berhasil disimpan." };
  } catch (error) { return { ok: false, message: failure(error) }; }
}
export async function cancelOrderAction(id: string): Promise<{ ok: true; data: OrderSnapshot; message: string } | { ok: false; message: string }> {
  try {
    const actor = await requireMasterOwner(); const data = await cancelOrder(prisma, actor, id);
    revalidatePath("/owner/pesanan"); revalidatePath("/daily-worker", "layout");
    return { ok: true, data, message: "Pesanan berhasil dibatalkan." };
  } catch (error) { return { ok: false, message: failure(error) }; }
}

import { Suspense } from "react";
import { requireMasterOwner } from "../../../lib/owner-master";
import { prisma } from "../../../lib/prisma";
import { readOrders } from "../../../lib/order-service";
import OrdersClient from "./OrdersClient";

async function Orders() {
  let data: Awaited<ReturnType<typeof readOrders>> | null = null;
  try {
    await requireMasterOwner();
    data = await readOrders(prisma);
  } catch {
    return <div className="o-error" role="alert">Daftar pesanan belum dapat dimuat. Pastikan sesi Owner aktif dan database tersedia, lalu muat ulang.</div>;
  }
  return <OrdersClient initialData={data} />;
}
export default function Page() { return <Suspense fallback={<p>Memuat pesanan...</p>}><Orders /></Suspense>; }

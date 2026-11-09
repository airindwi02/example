import { Suspense } from "react";
import SearchClient from "../SearchClient";
import { searchOwnerData } from "../../../lib/owner-operations";
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  let data: Awaited<ReturnType<typeof searchOwnerData>> | null = null;
  try {
    data = await searchOwnerData(query);
  } catch { /* Show a safe error state below. */ }
  if (!data) return <p className="o-error" role="alert">Pencarian Owner tidak dapat dimuat. Pastikan sesi Owner aktif dan database dapat diakses.</p>;
  return <Suspense><SearchClient data={data} /></Suspense>;
}

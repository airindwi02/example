import { Suspense } from "react";
import DashboardGate from "../_auth/DashboardGate";
import type { ReactNode } from "react";
import { KasirProvider } from "./KasirState";
import KasirShell from "./KasirShell";
import "./kasir.css";
import { loadKasir } from "../../lib/kasir-data";
import type { KasirSnapshot } from "./data";
async function Data({children}:{children:ReactNode}){let data:KasirSnapshot|null=null;try{data=await loadKasir();}catch{}if(!data)return <p role="alert">Data Kasir belum dapat dimuat. Periksa sesi dan muat ulang.</p>;return <KasirProvider initialData={data}><KasirShell>{children}</KasirShell></KasirProvider>;}
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p>Memuat...</p>}><DashboardGate path="/kasir">
    <Data>{children}</Data>
    </DashboardGate></Suspense>
  );
}

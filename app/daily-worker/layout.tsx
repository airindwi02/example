import { Suspense } from "react";
import DashboardGate from "../_auth/DashboardGate";
import WorkerShell from "./WorkerShell";
import "./worker.css";
import { loadWorker } from "../../lib/worker-data";
import type { WorkerSnapshot } from "../../lib/worker-types";
async function Data({children}:{children:React.ReactNode}){
 let data:WorkerSnapshot|null=null;
 try{data=await loadWorker();}catch{/* No dummy fallback or database details. */}
 if(!data)return <p role="alert">Data belum dapat dimuat. Masuk sebagai Daily Worker aktif dan muat ulang.</p>;
 return <WorkerShell initialData={data}>{children}</WorkerShell>;
}
export default function WorkerLayout({children}:{children:React.ReactNode}){return <Suspense fallback={<p>Memuat...</p>}><DashboardGate path="/daily-worker"><Data>{children}</Data></DashboardGate></Suspense>;}

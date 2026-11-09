import { Suspense } from "react";
import DashboardGate from "../_auth/DashboardGate";
import BakerClient from "./BakerClient";
import "./baker.css";
import { loadBaker } from "../../lib/baker-data";
import type { BakerSnapshot } from "../../lib/baker-types";
async function Data({children}:{children:React.ReactNode}){
 let data:BakerSnapshot|null=null;
 try{data=await loadBaker();}catch{/* Never substitute dummy operational data. */}
 if(!data)return <p role="alert">Data Baker/Barista belum dapat dimuat. Periksa sesi dan muat ulang.</p>;
 return <BakerClient initialData={data}>{children}</BakerClient>;
}
export default function BakerLayout({ children }: { children: React.ReactNode }) {
 return <Suspense fallback={<p>Memuat...</p>}><DashboardGate path="/baker"><Data>{children}</Data></DashboardGate></Suspense>;
}

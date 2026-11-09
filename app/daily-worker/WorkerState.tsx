"use client";
import { createContext, useContext, useState } from "react";
import { saveWorkerAction } from "./actions";
import type { WorkerCommand, WorkerResult, WorkerSnapshot } from "../../lib/worker-types";
const Context=createContext<{state:WorkerSnapshot;pending:boolean;save:(command:WorkerCommand)=>Promise<WorkerResult>}|null>(null);
export function WorkerProvider({children,initialData}:{children:React.ReactNode;initialData:WorkerSnapshot}){
 const [state,setState]=useState(initialData),[pending,setPending]=useState(false);
 async function save(command:WorkerCommand):Promise<WorkerResult>{if(pending)return{ok:false,message:"Penyimpanan masih berlangsung."};setPending(true);try{const result=await saveWorkerAction(command);if(result.ok)setState(result.data);return result;}catch{return{ok:false,message:"Koneksi terputus. Muat ulang untuk memastikan hasil sebelum mencoba lagi."};}finally{setPending(false);}}
 return <Context.Provider value={{state,pending,save}}>{children}</Context.Provider>;
}
export function useWorker(){const value=useContext(Context);if(!value)throw new Error("Daily Worker provider missing");return value;}
export const newToken=()=>crypto.randomUUID().replaceAll("-","").slice(0,15);

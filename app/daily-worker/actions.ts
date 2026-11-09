"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { requireWorker } from "../../lib/worker-data";
import { saveWorker, WorkerError } from "../../lib/worker-service";
import type { WorkerCommand, WorkerResult } from "../../lib/worker-types";
export async function saveWorkerAction(input: WorkerCommand): Promise<WorkerResult> {
  try {const actor=await requireWorker();const result=await saveWorker(prisma,actor,input);revalidatePath("/daily-worker","layout");revalidatePath("/owner/master-data");revalidatePath("/owner/pesanan");return{ok:true,...result};}
  catch(error){return{ok:false,message:error instanceof WorkerError?error.message:"Data gagal disimpan. Periksa sesi dan muat ulang sebelum mencoba kembali."};}
}

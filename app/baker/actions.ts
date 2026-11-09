"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { requireBaker } from "../../lib/baker-data";
import { BakerError, saveBaker } from "../../lib/baker-service";
import type { BakerCommand, BakerResult } from "../../lib/baker-types";
export async function saveBakerAction(input: BakerCommand): Promise<BakerResult>{
 try{const actor=await requireBaker();const result=await saveBaker(prisma,actor,input);revalidatePath("/baker","layout");revalidatePath("/daily-worker","layout");revalidatePath("/owner","layout");revalidatePath("/kasir","layout");return {ok:true,...result};}
 catch(error){return {ok:false,message:error instanceof BakerError?error.message:"Pemakaian gagal disimpan. Muat ulang untuk memastikan hasil sebelum mencoba lagi."};}
}

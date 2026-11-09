"use server";
import { requireKasir } from "../../lib/kasir-data";
import { payCash,PaymentError } from "../../lib/payment-service";
import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
export async function checkoutKasirAction(input:unknown){
 try{const user=await requireKasir();const result=await payCash(prisma,user,input);revalidatePath("/kasir","layout");revalidatePath("/owner/master-data");revalidatePath("/daily-worker","layout");revalidatePath("/baker","layout");return {ok:true as const,...result};}
 catch(e){return {ok:false as const,uncertain:!(e instanceof PaymentError),message:e instanceof PaymentError?e.message:"Pembayaran tidak dapat diproses. Periksa riwayat sebelum mengulang permintaan yang sama."};}
}

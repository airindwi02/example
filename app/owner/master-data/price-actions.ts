"use server";
import { revalidatePath } from "next/cache";
import { requireMasterOwner } from "../../../lib/owner-master";
import { prisma } from "../../../lib/prisma";
import { setPrice,PaymentError } from "../../../lib/payment-service";
export async function setPriceAction(id:string,price:string){try{const user=await requireMasterOwner();const value=await setPrice(prisma,user,id,price);revalidatePath("/owner/master-data");revalidatePath("/kasir","layout");return {ok:true as const,price:value};}catch(e){return {ok:false as const,message:e instanceof PaymentError?e.message:"Harga gagal disimpan."};}}

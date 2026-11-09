import "server-only";
import { authenticatedAccount } from "./auth";
import { prisma } from "./prisma";
import { KasirError,readKasir } from "./kasir-service";
export async function requireKasir(){const user=await authenticatedAccount();if(!user||user.peran!=="Kasir")throw new KasirError("Masuk sebagai Kasir aktif.");return user;}
export async function loadKasir(){const user=await requireKasir();return readKasir(prisma,user.nama_pengguna);}

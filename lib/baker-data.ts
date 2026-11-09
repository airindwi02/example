import "server-only";
import { authenticatedAccount } from "./auth";
import { prisma } from "./prisma";
import { readBaker, BakerError } from "./baker-service";
export async function requireBaker(){const user=await authenticatedAccount();if(!user||!["Baker","Barista"].includes(user.peran))throw new BakerError("Masuk sebagai Baker atau Barista aktif.");return user;}
export async function loadBaker(){await requireBaker();return readBaker(prisma);}

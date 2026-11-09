import "server-only";
import { authenticatedAccount } from "./auth";
import { prisma } from "./prisma";
import { readWorker, WorkerError } from "./worker-service";
export async function requireWorker() { const user=await authenticatedAccount();if(!user||user.peran!=="Daily Worker")throw new WorkerError("Masuk sebagai Daily Worker aktif.");return user; }
export async function loadWorker(){await requireWorker();return readWorker(prisma);}

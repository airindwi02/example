import "server-only";
import { prisma } from "./prisma";
import { authenticatedAccount } from "./auth";
import { MasterError, readMaster } from "./owner-master-service";
export async function requireMasterOwner() {
  const actor = await authenticatedAccount();
  if (!actor || actor.peran !== "Owner") throw new MasterError("Masuk sebagai Owner aktif untuk mengelola master data.");
  return actor;
}
export async function loadMasterData() { await requireMasterOwner(); return readMaster(prisma); }

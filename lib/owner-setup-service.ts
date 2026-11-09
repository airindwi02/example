import { randomBytes } from "node:crypto";
import type { PrismaClient } from "../app/generated/prisma/client";
import { ownerBaseline, reserveOwnerInvite, verifyOwnerInvite, type OwnerTrust } from "./owner-invite-core";

export async function registerFirstOwner(client: PrismaClient, trust: OwnerTrust, database: string, token: string, input: { username: string; name: string; phone: string; email: string | null; hash: string }, afterReservation?: () => void) {
  verifyOwnerInvite(token, trust, database, input.username);
  if (!input.hash.startsWith("$argon2id$")) throw new Error("Invalid password encoding.");
  return client.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1484312401, 197864781)`;
    const claim = verifyOwnerInvite(token, trust, database, input.username);
    const owners = await tx.pengguna.findMany({ where: { peran: "Owner" }, orderBy: { id_pengguna: "asc" }, select: { id_pengguna: true, nama_pengguna: true, username: true, password_hash: true, peran: true, status_akun: true } });
    if (owners.length !== 1 || owners[0].status_akun !== "PENDING" || owners[0].password_hash.startsWith("$argon2") || ownerBaseline(owners) !== claim.owners || await tx.pengguna.findUnique({ where: { username: input.username }, select: { id_pengguna: true } })) throw new Error("Bootstrap baseline changed.");
    reserveOwnerInvite(trust, claim);
    afterReservation?.(); // Dependency-injected crash simulation; not exposed by any action.
    await tx.pengguna.create({ data: { id_pengguna: randomBytes(5).toString("hex"), nama_pengguna: input.name, username: input.username, nomor_hp: input.phone, email: input.email, password_hash: input.hash, peran: "Owner", status_akun: "ACTIVE" } });
  }, { maxWait: 10000, timeout: 15000 });
}

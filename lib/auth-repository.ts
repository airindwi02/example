import "server-only";
import { prisma } from "./prisma";
import type { AccountStatus, DatabaseRole } from "./auth-policy";
import { isRole } from "./auth-policy";
import { localStaffSignupConfigured } from "./auth-config";

// Prepared SQL references approved future columns without changing the active Prisma schema.
// Every entry point checks readiness before calling this repository.
export type Account = {
  id_pengguna: string; nama_pengguna: string; username: string; password_hash: string;
  peran: string; status_akun: AccountStatus; nomor_hp: string | null; email: string | null;
};
export async function assertAuthSchema() {
  const columns = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pengguna'`;
  const available = new Set(columns.map(c => c.column_name));
  if (!["nomor_hp", "email", "status_akun", "diputuskan_oleh", "diputuskan_pada"].every(c => available.has(c))) {
    throw new Error("Authentication schema has not been approved or applied.");
  }
}
export async function findAccount(username: string) {
  const rows = await prisma.$queryRaw<Account[]>`SELECT id_pengguna, nama_pengguna, username, password_hash, peran, status_akun, nomor_hp, email FROM public.pengguna WHERE username = ${username} LIMIT 1`;
  return rows[0] ?? null;
}
export async function accountById(id: string) {
  const rows = await prisma.$queryRaw<Account[]>`SELECT id_pengguna, nama_pengguna, username, password_hash, peran, status_akun, nomor_hp, email FROM public.pengguna WHERE id_pengguna = ${id} LIMIT 1`;
  return rows[0] ?? null;
}
export async function createPending(input: { id: string; name: string; username: string; hash: string; role: DatabaseRole; phone: string; email: string | null }) {
  await prisma.$executeRaw`INSERT INTO public.pengguna (id_pengguna, nama_pengguna, username, password_hash, peran, nomor_hp, email, status_akun) VALUES (${input.id}, ${input.name}, ${input.username}, ${input.hash}, ${input.role}, ${input.phone}, ${input.email}, 'PENDING')`;
}
export async function createLocalStaffActive(input: { id: string; name: string; username: string; hash: string; role: DatabaseRole; phone: string; email: string | null }) {
  if (!localStaffSignupConfigured() || !isRole(input.role) || input.role === "Owner") throw new Error("Local staff registration is unavailable.");
  await prisma.pengguna.create({ data: { id_pengguna: input.id, nama_pengguna: input.name, username: input.username, password_hash: input.hash, peran: input.role, nomor_hp: input.phone, email: input.email, status_akun: "ACTIVE" } });
}
export async function requestAdditionalOwner(input: { id: string; name: string; username: string; hash: string; phone: string; email: string | null }) {
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1484312401, 197864781)`;
    if (!await tx.pengguna.findFirst({ where: { peran: "Owner", status_akun: "ACTIVE" }, select: { id_pengguna: true } })) throw new Error("Active Owner authorization required.");
    await tx.pengguna.create({ data: { id_pengguna: input.id, nama_pengguna: input.name, username: input.username, password_hash: input.hash, nomor_hp: input.phone, email: input.email, peran: "Owner", status_akun: "PENDING" } });
  });
}
export async function pendingAccounts() {
  return prisma.$queryRaw<Pick<Account, "id_pengguna" | "nama_pengguna" | "username" | "peran" | "nomor_hp" | "email">[]>`SELECT id_pengguna, nama_pengguna, username, peran, nomor_hp, email FROM public.pengguna WHERE status_akun = 'PENDING' ORDER BY username LIMIT 100`;
}
export async function decideAccount(actorId: string, actorHash: string, targetId: string, status: "ACTIVE" | "REJECTED", role: DatabaseRole) {
  return prisma.$transaction(async tx => {
    const actors = await tx.$queryRaw<Account[]>`SELECT id_pengguna, peran, status_akun, password_hash FROM public.pengguna WHERE id_pengguna = ${actorId} FOR UPDATE`;
    if (actorId === targetId || actors[0]?.peran !== "Owner" || actors[0]?.status_akun !== "ACTIVE" || actors[0]?.password_hash !== actorHash) throw new Error("Not authorized.");
    const targets = await tx.$queryRaw<Account[]>`SELECT id_pengguna, peran, status_akun FROM public.pengguna WHERE id_pengguna = ${targetId} FOR UPDATE`;
    const target = targets[0];
    if (!target || target.status_akun !== "PENDING" || !(target.peran === role || (["Baker", "Barista"].includes(target.peran) && ["Baker", "Barista"].includes(role)))) throw new Error("Invalid decision.");
    const changed = await tx.$executeRaw`UPDATE public.pengguna SET status_akun = ${status}, peran = ${role}, diputuskan_oleh = ${actorId}, diputuskan_pada = CURRENT_TIMESTAMP WHERE id_pengguna = ${targetId} AND status_akun = 'PENDING'`;
    if (changed !== 1) throw new Error("Decision conflict.");
  });
}

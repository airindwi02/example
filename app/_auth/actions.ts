"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireReady, authenticatedAccount } from "../../lib/auth";
import { allowAttempt } from "../../lib/auth-rate-limit";
import { createPending, createLocalStaffActive, requestAdditionalOwner, decideAccount, findAccount } from "../../lib/auth-repository";
import { dashboards, isRole, matchesRole, requestedRole, validateSignup, type SignupInput } from "../../lib/auth-policy";
import { hashPassword, verifyPassword } from "../../lib/password";
import { createSession, deleteSession } from "../../lib/session";
import { signupEnabled, approvalsEnabled, localStaffSignupConfigured, ownerSetupConfigured, ownerRequestsConfigured } from "../../lib/auth-config";
import { localStaffSignupRequest } from "../../lib/auth-local";

export type AuthResult = { ok: boolean; message: string; errors?: Record<string, string>; href?: string };
const failed = (): AuthResult => ({ ok: false, message: "Permintaan tidak dapat diproses. Periksa data atau coba lagi nanti." });
function field(data: FormData, name: string, max = 255) {
  const value = data.get(name);
  if (typeof value !== "string" || value.length > max) throw new Error("Invalid input.");
  return value;
}
export async function loginAction(data: FormData): Promise<AuthResult> {
  try {
    await requireReady();
    const username = field(data, "username", 20).trim(), password = field(data, "password", 128), selected = field(data, "role", 20);
    if (!await allowAttempt("login", username)) return failed();
    const account = username ? await findAccount(username) : null;
    const valid = account ? await verifyPassword(account.password_hash, password) : (await hashPassword(password || randomBytes(32).toString("hex")), false);
    if (!valid || !account || account.status_akun !== "ACTIVE" || !isRole(account.peran) || !matchesRole(account.peran, selected)) {
      return { ok: false, message: "Username atau password salah. Silakan coba lagi." };
    }
    await createSession(account.id_pengguna, account.password_hash);
    return { ok: true, message: "Login berhasil.", href: dashboards[account.peran] };
  } catch { return failed(); }
}
export async function signupAction(data: FormData): Promise<AuthResult> {
  try {
    if (!signupEnabled()) return failed();
    if (process.env.ALANA_LOCAL_STAFF_SIGNUP === "enabled" && !localStaffSignupConfigured()) return failed();
    await requireReady();
    const input: SignupInput = { fullName: field(data, "fullName", 50).trim(), username: field(data, "username", 20).trim(), phone: field(data, "phone", 32), email: field(data, "email", 254).trim(), password: field(data, "password", 128), confirmPassword: field(data, "confirmPassword", 128), role: field(data, "role", 20) };
    if (!await allowAttempt("signup", input.username)) return failed();
    const errors = validateSignup(input);
    if (Object.keys(errors).length) return { ok: false, message: "Periksa kembali data pendaftaran.", errors };
    const role = requestedRole(input.role)!;
    if (role === "Owner") {
      const token = field(data, "ownerSetupCode", 4096).trim();
      if (token ? !ownerSetupConfigured() : !ownerRequestsConfigured()) return failed();
      if (await findAccount(input.username)) return failed();
      const owner = { id: randomBytes(5).toString("hex"), name: input.fullName, username: input.username, phone: input.phone.replace(/[\s-]/g, ""), email: input.email || null, hash: await hashPassword(input.password) };
      if (token) {
        const { createInvitedOwner } = await import("../../lib/owner-setup");
        await createInvitedOwner(token, owner);
        return { ok: true, message: "Pendaftaran Owner berhasil. Silakan masuk.", href: "/login?registered=active&role=owner" };
      }
      await requestAdditionalOwner(owner);
      return { ok: true, message: "Permintaan Owner menunggu persetujuan Owner aktif.", href: "/login?registered=pending&role=owner" };
    }
    const local = localStaffSignupConfigured();
    if (local && !await localStaffSignupRequest()) return { ok: false, message: "Pendaftaran lokal hanya tersedia untuk staf melalui localhost." };
    if (await findAccount(input.username)) return failed();
    const encoded = await hashPassword(input.password);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const create = local ? createLocalStaffActive : createPending;
        await create({ id: randomBytes(5).toString("hex"), name: input.fullName, username: input.username, phone: input.phone.replace(/[\s-]/g, ""), email: input.email || null, hash: encoded, role });
        return local ? { ok: true, message: "Pendaftaran berhasil. Silakan masuk menggunakan akun Anda.", href: "/login?registered=active" } : { ok: true, message: "Pendaftaran diterima. Tunggu persetujuan Owner sebelum masuk.", href: "/login?registered=pending" };
      } catch (error) {
        // Retry only a unique conflict. Username conflicts receive the same generic response.
        const code = error as { code?: string; meta?: { code?: string } };
        if (!(code.code === "P2002" || code.meta?.code === "23505") || await findAccount(input.username)) return failed();
      }
    }
    return failed();
  } catch { return failed(); }
}
export async function approvalAction(data: FormData): Promise<AuthResult> {
  try {
    if (!approvalsEnabled()) return failed();
    const actor = await authenticatedAccount();
    if (!actor || actor.peran !== "Owner") return failed();
    if (!await allowAttempt("approval", actor.id_pengguna)) return failed();
    const id = field(data, "id", 10), role = field(data, "role", 20), decision = field(data, "decision", 10);
    // Reauthentication is mandatory for all decisions, including requests for Owner access.
    if (!isRole(role) || !["ACTIVE", "REJECTED"].includes(decision) || id === actor.id_pengguna || !await verifyPassword(actor.password_hash, field(data, "ownerPassword", 128))) return failed();
    await decideAccount(actor.id_pengguna, actor.password_hash, id, decision as "ACTIVE" | "REJECTED", role);
    revalidatePath("/owner/persetujuan");
    return { ok: true, message: "Keputusan berhasil disimpan." };
  } catch { return failed(); }
}
export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export const dashboards = {
  Owner: "/owner",
  "Daily Worker": "/daily-worker",
  Kasir: "/kasir",
  Baker: "/baker",
  Barista: "/baker",
} as const;
export type DatabaseRole = keyof typeof dashboards;
export type AccountStatus = "PENDING" | "ACTIVE" | "REJECTED";
export function isRole(value: unknown): value is DatabaseRole {
  return typeof value === "string" && Object.hasOwn(dashboards, value);
}
export function requestedRole(value: unknown): DatabaseRole | null {
  const mapping: Record<string, DatabaseRole> = { owner: "Owner", "daily-worker": "Daily Worker", kasir: "Kasir", baker: "Baker", barista: "Barista" };
  return typeof value === "string" && Object.hasOwn(mapping, value) ? mapping[value] : null;
}
export function matchesRole(role: DatabaseRole, selected: unknown) {
  return requestedRole(selected) === role || (selected === "baker" && role === "Barista");
}
export function canEnter(account: { peran: string; status_akun: string }, dashboard: string) {
  return account.status_akun === "ACTIVE" && isRole(account.peran) && dashboards[account.peran] === dashboard;
}
export type SignupInput = { fullName: string; username: string; phone: string; email: string; password: string; confirmPassword: string; role: string };
export function validateSignup(input: SignupInput) {
  const errors: Record<string, string> = {};
  if (!input.fullName.trim() || input.fullName.trim().length > 50) errors.fullName = "Nama lengkap wajib diisi, maksimal 50 karakter.";
  if (!/^[A-Za-z0-9_.-]{3,20}$/.test(input.username)) errors.username = "Username harus 3–20 karakter: huruf, angka, titik, garis bawah atau tanda minus.";
  if (!/^(?:08\d{8,11}|\+?628\d{8,11})$/.test(input.phone.replace(/[\s-]/g, ""))) errors.phone = "Masukkan nomor HP yang valid.";
  if (input.email.length > 254 || (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))) errors.email = "Masukkan email yang valid.";
  if (input.password.length < 8 || input.password.length > 128) errors.password = "Password harus 8–128 karakter.";
  if (input.password !== input.confirmPassword) errors.confirmPassword = "Konfirmasi password harus sama.";
  if (!requestedRole(input.role)) errors.role = "Pilih peran yang valid.";
  return errors;
}

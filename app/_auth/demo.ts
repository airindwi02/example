import { Crown, Package, Banknote, ChefHat } from "lucide-react";
export const roles = [
  {
    id: "owner",
    label: "Owner",
    subtitle: "Pemilik usaha",
    href: "/owner",
    username: "usr05",
    Icon: Crown,
  },
  {
    id: "daily-worker",
    label: "Daily Worker",
    subtitle: "Staf harian",
    href: "/daily-worker",
    username: "usr01",
    Icon: Package,
  },
  {
    id: "kasir",
    label: "Kasir",
    subtitle: "Penjualan",
    href: "/kasir",
    username: "usr04",
    Icon: Banknote,
  },
  {
    id: "baker",
    label: "Baker/Barista",
    subtitle: "Produksi",
    href: "/baker",
    username: "usr02",
    Icon: ChefHat,
  },
] as const;
export type RoleId = (typeof roles)[number]["id"];
export function resolveRole(value: string | null): RoleId {
  return (
    roles.find((r) => r.id === value)?.id ??
    (value === "daily" ? "daily-worker" : "owner")
  );
}
// Public frontend demo only. This is NOT a production credential or a database password.
export const DEMO_ONLY_PASSWORD = "AlanaDemo!2026";
export function validDemoLogin(
  role: RoleId,
  username: string,
  password: string,
) {
  const selected = roles.find((r) => r.id === role);
  const name = username.trim().toLowerCase();
  return (
    !!selected &&
    (name === selected.username || (role === "baker" && name === "usr03")) &&
    password === DEMO_ONLY_PASSWORD
  );
}
export type Registration = {
  fullName: string;
  username: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};
export type FieldErrors = Partial<Record<keyof Registration | "role", string>>;
export const emptyRegistration: Registration = {
  fullName: "",
  username: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};
export function validateRegistration(
  form: Registration,
  role: RoleId,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!roles.some((r) => r.id === role)) errors.role = "Pilih peran Anda.";
  if (!form.fullName.trim()) errors.fullName = "Nama lengkap wajib diisi.";
  else if (form.fullName.trim().length > 50)
    errors.fullName = "Nama lengkap maksimal 50 karakter.";
  if (!form.username.trim()) errors.username = "Username wajib diisi.";
  else if (form.username.trim().length > 20)
    errors.username = "Username maksimal 20 karakter.";
  if (!/^(?:08\d{8,11}|\+?628\d{8,11})$/.test(form.phone.replace(/[\s-]/g, "")))
    errors.phone = "Masukkan nomor HP valid, misalnya 081234567890.";
  if (
    form.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  )
    errors.email = "Format email tidak valid.";
  if (form.password.length < 8)
    errors.password = "Password minimal 8 karakter.";
  if (!form.confirmPassword || form.confirmPassword !== form.password)
    errors.confirmPassword = "Konfirmasi password harus sama.";
  return errors;
}

export type InitialIdentity = { id_pengguna: string; nama_pengguna: string; username: string; password_hash: string; peran: string };
export function strongBootstrapPassword(value: string, username: string) {
  if (value.length < 12 || value.length > 128 || new Set(value).size < 6 || value.toLowerCase().includes(username.toLowerCase()) || /^(password|kata.?sandi|alana|admin|owner|qwerty|12345)/i.test(value)) return false;
  const categories = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9\s]/].filter(pattern => pattern.test(value)).length;
  return categories >= 3 || (value.length >= 20 && new Set(value.trim().split(/\s+/)).size >= 4);
}
export function selectBootstrapAccounts(rows: InitialIdentity[], expected: string[][], mode: string) {
  if (!["--owner-only", "--staff-only"].includes(mode) || expected.length !== 5 || rows.length !== 5 || new Set(rows.map(r => r.id_pengguna)).size !== 5) throw new Error("Invalid bootstrap scope.");
  if (rows.some(r => !expected.some(e => e[0] === r.id_pengguna && e[1] === r.nama_pengguna && e[2] === r.username && e[4] === r.peran))) throw new Error("Initial identity changed.");
  const owners = rows.filter(r => r.peran === "Owner");
  if (owners.length !== 1) throw new Error("Expected one initial Owner.");
  const selected = rows.filter(r => mode === "--owner-only" ? r.peran === "Owner" : r.peran !== "Owner");
  if (selected.some(r => r.password_hash.startsWith("$argon2") || !expected.some(e => e[0] === r.id_pengguna && e[3] === r.password_hash))) throw new Error("Selected password is no longer the seed value.");
  return selected;
}

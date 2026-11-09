import "dotenv/config";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import { selectBootstrapAccounts, strongBootstrapPassword } from "../lib/bootstrap-policy";

async function hidden(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Interactive terminal required.");
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => { process.stdin.off("keypress", handler); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n"); };
    const handler = (text: string, key: { name?: string; ctrl?: boolean }) => {
      if (key?.ctrl && key.name === "c") { cleanup(); reject(new Error("Cancelled.")); }
      else if (key?.name === "return") { cleanup(); resolve(value); }
      else if (key?.name === "backspace") value = Array.from(value).slice(0, -1).join("");
      else if (text && !key?.ctrl && !/[\x00-\x1f\x7f]/.test(text) && value.length < 128) value += text;
    };
    process.stdin.on("keypress", handler);
  });
}
async function main() {
  // This script is deliberately never called by install, build, startup, or authentication.
  if (process.env.ALANA_ALLOW_INITIAL_PASSWORD_WRITE !== "approved" || !process.stdin.isTTY) throw new Error("Separate write approval and an interactive terminal are required.");
  const mode = process.argv[2];
  if (process.argv.length !== 3 || !["--owner-only", "--staff-only"].includes(mode)) throw new Error("Choose one explicitly approved bootstrap scope.");
  const confirmationPhrase = mode === "--owner-only" ? "SET OWNER PASSWORD" : "SET STAFF PASSWORDS";
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const confirmed = await rl.question(`Setelah izin terpisah diberikan, ketik ${confirmationPhrase} untuk melanjutkan: `);
  rl.close();
  if (confirmed !== confirmationPhrase) throw new Error("Cancelled.");
  const reference = readFileSync(new URL("../database.sql", import.meta.url), "utf8");
  const block = reference.match(/INSERT INTO public\.pengguna\s*\([^;]*?VALUES([\s\S]*?);/i)?.[1] ?? "";
  const expected = [...block.matchAll(/\(([^()]*)\)/g)].map(m => [...m[1].matchAll(/'((?:''|[^'])*)'/g)].map(v => v[1].replaceAll("''", "'")));
  if (expected.length !== 5 || expected.some(e => e.length !== 5)) throw new Error("Initial account reference is invalid.");
  const rows = await prisma.pengguna.findMany({ orderBy: { id_pengguna: "asc" } });
  const selected = selectBootstrapAccounts(rows, expected, mode);
  if (rows.some(row => row.status_akun !== "PENDING") || [process.env.ALANA_DATABASE_AUTH, process.env.ALANA_SIGNUP, process.env.ALANA_APPROVALS].includes("enabled")) throw new Error("Bootstrap state or authentication flags changed.");
  const fingerprints = new Set<string>();
  const prepared: { id: string; hash: string; previous: string }[] = [];
  for (const row of selected) {
    let password = await hidden(`Password awal ${row.peran}: `);
    let confirmation = await hidden("Konfirmasi password: ");
    const fingerprint = createHash("sha256").update(password).digest("hex");
    if (password !== confirmation || !strongBootstrapPassword(password, row.username) || fingerprints.has(fingerprint)) throw new Error("Password validation failed.");
    for (const existing of rows) if (await verifyPassword(existing.password_hash, password)) throw new Error("Password must differ from an already initialized account.");
    fingerprints.add(fingerprint);
    const encoded = await hashPassword(password);
    if (!encoded.startsWith("$argon2id$") || !await verifyPassword(encoded, password)) throw new Error("Password hashing verification failed.");
    prepared.push({ id: row.id_pengguna, hash: encoded, previous: row.password_hash });
    password = ""; confirmation = "";
  }
  await prisma.$transaction(async tx => {
    for (const entry of prepared) {
      const before = rows.find(r => r.id_pengguna === entry.id)!;
      const result = await tx.pengguna.updateMany({ where: { id_pengguna: entry.id, username: before.username, nama_pengguna: before.nama_pengguna, peran: before.peran, password_hash: entry.previous, status_akun: "PENDING" }, data: { password_hash: entry.hash } });
      if (result.count !== 1) throw new Error("Concurrent account change; transaction rolled back.");
    }
    const after = await tx.pengguna.findMany({ orderBy: { id_pengguna: "asc" } });
    const expectedAfter = rows.map(row => ({ ...row, password_hash: prepared.find(entry => entry.id === row.id_pengguna)?.hash ?? row.password_hash }));
    if (JSON.stringify(after) !== JSON.stringify(expectedAfter)) throw new Error("Account verification failed; transaction rolled back.");
  });
  console.log("Password untuk lingkup yang disetujui berhasil ditetapkan. Identitas, role, dan status tidak diubah.");
}
main().catch(() => { console.error("Penetapan password dibatalkan atau gagal. Detail sensitif tidak dicatat."); process.exitCode = 1; }).finally(() => prisma.$disconnect());

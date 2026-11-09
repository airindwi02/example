import type { Material } from "../app/baker/data";
export type BakerBatch = { id: string; itemId: string; received: string; expiry: string; condition: string; available: number };
export type BakerHistory = { id: string; date: string; productId: string; product: string; quantity: number; unit: string; status: string; reason: string | null; actor: string; used: { itemId: string; name: string; batchId: string; quantity: number; unit: string }[] };
export type BakerSnapshot = { today: string; materials: Material[]; products: Material[]; batches: BakerBatch[]; history: BakerHistory[] };
export type BakerCommand = { token: string; productId: string; output: string; status: "Selesai" | "Gagal"; reason: string; lines: { itemId: string; batchId: string; unit: string; amount: string }[] };
export type BakerOutcome = { data: BakerSnapshot; replayed: boolean; changes: { id: string; name: string; before: number; used: number; after: number; unit: string }[] };
export type BakerResult = ({ ok: true } & BakerOutcome) | { ok: false; message: string };

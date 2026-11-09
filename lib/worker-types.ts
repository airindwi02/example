import type { Barang, Batch, Penerimaan, Pemeriksaan, Movement, Activity } from "../app/daily-worker/data";
export type WorkerSnapshot = { today: string; items: Barang[]; batches: Batch[]; receipts: Penerimaan[]; checks: Pemeriksaan[]; adjustments: Pemeriksaan[]; movements: Movement[]; activities: Activity[]; suppliers: { id: string; name: string }[]; orders: { id: string; supplierId: string; status: string; items: { id: string; remaining: number }[] }[] };
export type WorkerCommand = { type: "receive" | "check" | "adjust"; id: string; token: string; unit: string; expectedStock: string; amount?: string; actual?: string; date?: string; supplierId?: string; orderId?: string; sent?: string; expiry?: string; condition?: string; reason?: string; note?: string; batch?: string };
export type WorkerOutcome = { data: WorkerSnapshot; before: number | null; after: number; replayed: boolean };
export type WorkerResult = ({ ok: true } & WorkerOutcome) | { ok: false; message: string };

export type MasterItem = { id: string; name: string; category: string; unit: string; stock: number; minimum: number; supplier: string };
export type MasterSupplier = { id: string; name: string; phone: string; address: string; goods: string };
export type MasterUnit = { id: string; name: string; symbol: string };
export type MasterSnapshot = { ingredients: MasterItem[]; suppliers: MasterSupplier[]; units: MasterUnit[]; categories: string[]; pricing?: {enabled:boolean;prices:Record<string,string|null>} };
export type MasterInput = { kind: "barang" | "pemasok"; id?: string; name: string; category?: string; unit?: string; minimum?: string; phone?: string; address?: string };
export type MasterResult = { ok: true; data: MasterSnapshot; id?: string; message: string } | { ok: false; message: string };
export function matches(value: string, query: string) { return value.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID")); }
export function stockStatus(item: Pick<MasterItem, "stock" | "minimum">) { return item.stock <= 0 ? "Habis" : item.stock <= item.minimum ? "Menipis" : "Aman"; }

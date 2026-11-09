export type Material = { id: string; name: string; category: string; stock: number; unit: string; minimum: number; received: string; supplier: string; expiry: string };
export const condition = (m: Material) => m.stock <= 0 ? "Habis" : m.stock >= m.minimum ? "Aman" : m.stock <= m.minimum / 3 ? "Kritis" : "Menipis";
// Presentation assets only; never a source of products, stock, prices or recipes.
export function productImage(name: string) {
 const n=name.toLowerCase();
 return n.includes("croissant")?"croissant":/latte|kopi|coffee/.test(n)?"latte":n.includes("brownie")?"brownies":n.includes("velvet")?"red-velvet":null;
}

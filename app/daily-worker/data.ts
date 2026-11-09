/** Serializable database view models; ui metadata is derived from real records. */
export type Barang = {
  id_barang: string;
  nama_barang: string;
  satuan: string;
  jenis_barang: string;
  stok_minimum: number;
  stok_saat_ini: number;
  ui: { kategori: string; pemasok: string; terakhir_masuk: string; terakhir_periksa: string; perlu_cek: boolean };
};
export type Penerimaan = {
  id_penerimaan: string; id_barang: string; tanggal_terima: string;
  jumlah_diterima: number; nama_pemasok: string; recordedBy?: string;
};
export type Batch = { id_detail_masuk: string; id_barang: string; jumlah_diterima: number; tanggal_kedaluwarsa: string };
export type Pemeriksaan = {
  id_pemeriksaan: string; id_barang: string; tanggal: string;
  stok_sistem: number; stok_fisik: number; kondisi_fisik: string; tindak_lanjut: string;
  catatan: string; recordedBy?: string;
};
export type Movement = { id_barang: string; tanggal: string; jenis: string; jumlah: number };
export type Activity = { id: string; waktu: string; aktivitas: string; href: string; oleh?: string };
export function todayDate(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=(key:string)=>p.find(x=>x.type===key)!.value;return v('year')+'-'+v('month')+'-'+v('day');}
export const PAGE_SIZE=9;
export const displayDate=(date:string)=>{if(!date)return "Belum ada";const [y,m,d]=date.split("-");return d+"/"+m+"/"+y;};
export const shortDate=(date:string)=>displayDate(date).slice(0,5);
export const round=(n:number)=>Math.round(n*100)/100;
export const signed=(n:number)=>(n>0?"+":"")+n;
export const daysUntil=(date:string)=>date?Math.round((Date.parse(date)-Date.parse(todayDate()))/86400000):Infinity;
export const stockStatus=(b:Barang)=>b.stok_saat_ini>=b.stok_minimum?"Aman":b.stok_saat_ini<=b.stok_minimum/3?"Kritis":"Menipis";
export function parseQuantity(value:string,allowZero=false):number|null {
 if(!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim()))return null;
 const n=Number(value.trim().replace(",","."));
 return Number.isFinite(n)&&n<=99999999.99&&(allowZero?n>=0:n>0)?n:null;
}
export function parseDate(value:string):string|null {
 const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
 if(!match)return null;
 const [,d,m,y]=match;const parsed=new Date(Date.UTC(Number(y),Number(m)-1,Number(d)));
 return Number(y)>=2000&&Number(y)<=2100&&parsed.getUTCDate()===Number(d)&&parsed.getUTCMonth()===Number(m)-1?y+"-"+m+"-"+d:null;
}
export type KasirProduct={id:string;name:string;category:string;price:number|null;stock:number;minimum:number;image:string;unit:string};
export type SaleLine={id_barang:string;jumlah_dipesan:number;stok_tersedia:number;jumlah_terjual:number;harga:number;total:string;name:string;unit:string};
export type SaleRecord={id_transaksi:string;id_pengguna:string;tanggal:string;status_transaksi:string;time:string;details:SaleLine[];method:string;received:number|string|null;change?:string|null;fee?:string|null;paidTotal?:string|null;actor:string;reason:string|null;total:string};
export type KasirSnapshot={today:string;products:KasirProduct[];sales:SaleRecord[];actor:string;paymentsEnabled?:boolean};
export const currency=(n:number|string|null)=>{if(n===null)return "Belum tersedia";const value=typeof n==="number"?n.toFixed(2):n;const m=/^(-?)(\d+)(?:\.(\d+))?$/.exec(value);if(!m)return "Tidak valid";const fraction=(m[3]??"").replace(/0+$/,"");return "Rp"+m[1]+BigInt(m[2]).toLocaleString("id-ID")+(fraction?","+fraction:"");};
export const saleTotal=(s:SaleRecord)=>s.paidTotal??s.total;
export const saleCount=(s:SaleRecord)=>Math.round(s.details.reduce((n,l)=>n+l.jumlah_terjual,0)*100)/100;
export const shortDate = (date: string) => {
  const [y, m, d] = date.split("-");
  return `${Number(d)} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][Number(m) - 1]} ${y}`;
};
export const matches = (text: string, q: string) =>
  text.toLocaleLowerCase("id").includes(q.trim().toLocaleLowerCase("id"));
export const productFor=(id:string,products:KasirProduct[])=>products.find(p=>p.id===id)??{id,name:id,category:"",price:null,stock:0,minimum:0,image:"",unit:""};
export const parseReceived=(raw:string)=>/^\d+$/.test(raw)&&Number.isSafeInteger(Number(raw))?Number(raw):null;
export const CHECKOUT_BLOCKED="Pembayaran belum tersedia: harga jual resmi dan penyimpanan data pembayaran belum ditetapkan. Tidak ada transaksi atau stok yang diubah.";

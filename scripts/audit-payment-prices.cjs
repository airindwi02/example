/* eslint-disable @typescript-eslint/no-require-imports -- Read-only audit against the configured PostgreSQL source. */
const path=require('node:path');
const root=path.resolve(__dirname,'..');
require('@next/env').loadEnvConfig(root);
if(!process.env.DATABASE_URL)throw new Error('Database audit unavailable; configuration was not disclosed.');
const {prisma}=require('../lib/prisma.ts');
async function main(){
 const report=await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SET TRANSACTION READ ONLY`;
  const identity=await tx.$queryRaw`SELECT current_database() AS database_name,current_schema() AS schema_name`;
  const columns=await tx.$queryRaw`SELECT table_name,column_name,data_type,is_nullable,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public' AND ((table_name='barang' AND column_name='harga_jual') OR (table_name='transaksi' AND column_name IN ('metode_pembayaran','total_bayar','pajak_layanan','uang_diterima','kembalian','waktu_bayar','kunci_idempotensi'))) ORDER BY table_name,column_name`;
  const products=await tx.$queryRaw`SELECT id_barang,nama_barang,jenis_barang,satuan FROM public.barang ORDER BY jenis_barang,id_barang`;
  const history=await tx.$queryRaw`SELECT b.id_barang,b.nama_barang,b.jenis_barang,t.id_transaksi,t.tanggal::text AS tanggal,d.jumlah_terjual::text AS jumlah_terjual,d.harga::text AS harga FROM public.detail_transaksi d JOIN public.transaksi t ON t.id_transaksi=d.id_transaksi JOIN public.barang b ON b.id_barang=d.id_barang WHERE t.status_transaksi='Berhasil' AND b.jenis_barang='Produk Hasil' ORDER BY b.id_barang,t.tanggal DESC,t.id_transaksi DESC`;
  const statusCounts=await tx.$queryRaw`SELECT status_transaksi,count(*)::int AS jumlah FROM public.transaksi GROUP BY status_transaksi ORDER BY status_transaksi`;
  const byProduct=new Map();
  for(const row of history){const records=byProduct.get(row.id_barang)??[];records.push({...row,harga:String(row.harga),jumlah_terjual:String(row.jumlah_terjual)});byProduct.set(row.id_barang,records);}
  const audit=products.map(product=>{
   const records=byProduct.get(product.id_barang)??[];
   const valid=records.filter(row=>Number.isFinite(Number(row.harga))&&Number(row.harga)>0&&Number.isFinite(Number(row.jumlah_terjual))&&Number(row.jumlah_terjual)>0);
   const latestDate=valid[0]?.tanggal??null;
   const latestDay=latestDate?valid.filter(row=>row.tanggal===latestDate):[];
   const latestPrices=[...new Set(latestDay.map(row=>row.harga))];
   const candidate=product.jenis_barang==='Produk Hasil'&&latestPrices.length===1?latestPrices[0]:null;
   return {id:product.id_barang,nama:product.nama_barang,kategori:product.jenis_barang,satuan:product.satuan,riwayatBerhasil:records.map(row=>({idTransaksi:row.id_transaksi,tanggal:row.tanggal,jumlahTerjual:row.jumlah_terjual,hargaSatuan:row.harga,validHarga:Number(row.harga)>0&&Number(row.jumlah_terjual)>0})),tanggalBerhasilTerakhir:latestDate,hargaPadaTanggalTerakhir:latestPrices,kandidatHargaAwal:candidate,statusValidasi:product.jenis_barang!=='Produk Hasil'?'BUKAN PRODUK HASIL':!records.length?'BELUM ADA HARGA':!valid.length?'TIDAK ADA HARGA SATUAN VALID':latestPrices.length>1?'AMBIGU: BEBERAPA HARGA PADA TANGGAL TERAKHIR':candidate?'KANDIDAT TERVERIFIKASI DARI TRANSAKSI BERHASIL':'BELUM ADA HARGA'};
  });
  return {database:identity[0]?.database_name??null,schema:identity[0]?.schema_name??null,kolomPembayaran:columns.map(row=>({...row,numeric_precision:row.numeric_precision===null?null:Number(row.numeric_precision),numeric_scale:row.numeric_scale===null?null:Number(row.numeric_scale)})),jumlahBarang:products.length,statusTransaksi:statusCounts,produk:audit,semuaRiwayatHargaBerhasilProduk:history.length,sourceAuditReadOnly:true,noCredentialsReturned:true};
 },{maxWait:10000,timeout:30000});
 if(process.argv.includes('--catalog'))console.log(JSON.stringify({database:report.database,schema:report.schema,jumlahBarang:report.jumlahBarang,produk:report.produk.map(({id,nama,kategori,satuan,statusValidasi,kandidatHargaAwal})=>({id,nama,kategori,satuan,statusValidasi,kandidatHargaAwal}))}));else console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(JSON.stringify({audit:'FAILED',code:error.code??null,error:error.name,detailsWithheld:true}));process.exitCode=1;}).finally(async()=>{await prisma.$disconnect();});

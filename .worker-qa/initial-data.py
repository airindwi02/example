from pathlib import Path
p=Path("app/daily-worker/data.ts")
s=p.read_text()
s=s.replace('export const initialChecks:Pemeriksaan[]', 'export const initialChecks:Pemeriksaan[]')
s=s.replace('export const initialChecks:Pemeriksaan[]', 'export const initialChecks:Pemeriksaan[]')
s=s.replace('id_penerimaan:"RC-04",id_barang:"BHN-06",tanggal_terima:"2026-10-21",jumlah_diterima:5,nama_pemasok:"UD Mitra Tani"},','id_penerimaan:"RC-04",id_barang:"BHN-06",tanggal_terima:"2026-10-21",jumlah_diterima:5,nama_pemasok:"UD Mitra Tani"},\n  {id_penerimaan:"RC-05",id_barang:"BHN-03",tanggal_terima:DEMO_DATE,jumlah_diterima:10,nama_pemasok:"CV Sumber Rasa"},')
p.write_text(s,encoding="utf-8")
p=Path("app/daily-worker/WorkerState.tsx");s=p.read_text();s=s.replace('crypto.randomUUID()','crypto.randomUUID().replaceAll("-","").slice(0,15)');p.write_text(s,encoding="utf-8")
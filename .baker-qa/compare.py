from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
pairs=[
("Baker Dashboard","dashboard"),
("Baker Cari Stok Bahan","stock"),
("Baker Barang Tidak Ditemukan","stock-empty"),
("Baker Jumlah Kondisi Stok","stock-detail"),
("Baker Pemakaian Pilih Produk","production-select"),
("Baker Pemakaian Bahan Kurang","production-shortage"),
("Baker Pemakaian Isi Hasil Produksi","production-form"),
("Baker Pemakaian Data Tidak Valid","production-invalid"),
("Baker Pemakaian Konfirmasi Stok Terbaru","production-success"),
("Baker Tentang Alana","about"),
("Baker Pencarian","search"),
("Baker Notifikasi Dropdown","notifications"),
("Baker Dashboard-1","logout")]
for reference,render in pairs:
 a=Image.open(Path(".design-reference/baker")/(reference+".png")).convert("RGB")
 b=Image.open(Path(".baker-qa")/(render+".png")).convert("RGB")
 out=Image.new("RGB",(2880,max(a.height,b.height)+30),"#ffffff")
 out.paste(a,(0,30));out.paste(b,(1440,30))
 draw=ImageDraw.Draw(out);draw.text((20,8),"REFERENCE",fill="black");draw.text((1460,8),"IMPLEMENTATION",fill="black")
 out.save(Path(".baker-qa")/("compare-"+render+".jpg"))

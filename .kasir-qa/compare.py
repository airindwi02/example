from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path(__file__).resolve().parent;source=root.parent/'.design-reference/kasir/normalized'
pairs=[('Kasir Dashboard','01-dashboard'),('Kasir Dashboard-1','02-logout'),('Kasir Produk Terjual Pilih Produk','03-products-empty'),('Kasir Produk Terjual Input Jumlah','04-products-cart'),('Kasir Produk Terjual Stok Tidak Mencukupi','05-stock-warning'),('Kasir Produk Terjual Pastikan Data Penjual','06-confirm-sale'),('Kasir Produk Terjual Berhasil Stok Berkurang','07-sale-success'),('Kasir Riwayat Penjualan','08-history'),('Kasir Tentang Alana','09-about'),('Kasir Notifikasi','10-notifications'),('Kasir Pencarian','11-search')]
(root/'pairs.json').write_text(json.dumps(pairs,indent=2),encoding='utf8')
for g in range(0,11,3):
 subset=pairs[g:g+3];canvas=Image.new('RGB',(1440,len(subset)*475),'#dedede');d=ImageDraw.Draw(canvas)
 for j,(ref,name) in enumerate(subset):
  d.text((10,j*475+5),'SOURCE: '+ref,fill='black');d.text((730,j*475+5),'IMPLEMENTATION: '+name,fill='black')
  for x,path in [(0,source/(ref+'.png')),(720,root/(name+'.png'))]:canvas.paste(Image.open(path).convert('RGB').resize((720,450)),(x,j*475+25))
 canvas.save(root/f'comparison-{g//3+1}.png')
for index,label,box in [(3,'cart',(1000,160,1400,836)),(5,'confirm',(1000,160,1400,836)),(6,'success',(1000,160,1400,836)),(0,'products',(272,350,1400,463)),(9,'notifications',(1000,96,1408,350))]:
 ref,name=pairs[index];a=Image.open(source/(ref+'.png')).crop(box);b=Image.open(root/(name+'.png')).crop(box);c=Image.new('RGB',(a.width*2,a.height));c.paste(a,(0,0));c.paste(b,(a.width,0));c.save(root/f'focus-{label}.png')

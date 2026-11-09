from pathlib import Path
from PIL import Image, ImageDraw
import json
root=Path(__file__).resolve().parent
source=root.parent/'.design-reference'/'owner'
pairs=json.loads((root/'pairs.json').read_text(encoding='utf8'))
for group in range(0,26,3):
 subset=pairs[group:group+3]
 canvas=Image.new('RGB',(1440,len(subset)*475),'#dedede');draw=ImageDraw.Draw(canvas)
 for j,(ref,name) in enumerate(subset):
  draw.text((10,j*475+5),'SOURCE: '+ref,fill='black');draw.text((730,j*475+5),'IMPLEMENTATION: '+name,fill='black')
  for x,path in [(0,source/(ref+'.png')),(720,root/(name+'.png'))]:canvas.paste(Image.open(path).convert('RGB').resize((720,450)),(x,j*475+25))
 canvas.save(root/f'comparison-{group//3+1}.png')
for ref,name,box,label in [('Owner  Master Form Tambah Ubah','07-master-edit',(1000,200,1400,805),'form'),('Owner Laporan Ekspor Konfirmasi','16-report-export-confirm',(990,85,1400,360),'export'),('Owner Dashboard','01-dashboard',(240,0,1440,85),'header')]:
 a=Image.open(source/(ref+'.png')).crop(box);b=Image.open(root/(name+'.png')).crop(box)
 canvas=Image.new('RGB',(a.width*2,a.height));canvas.paste(a,(0,0));canvas.paste(b,(a.width,0));canvas.save(root/f'focus-{label}.png')

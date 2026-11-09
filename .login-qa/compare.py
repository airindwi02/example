from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path(__file__).resolve().parent;source=root.parent/'.design-reference/login'
pairs=[('Login','01-splash'),('Login Awal','02-login'),('Pasword Salah','03-login-error'),('Buat Akun','04-register')]
(root/'pairs.json').write_text(json.dumps(pairs,indent=2),encoding='utf8')
for g in range(0,4,2):
 canvas=Image.new('RGB',(1440,950),'#dedede');d=ImageDraw.Draw(canvas)
 for j,(ref,name) in enumerate(pairs[g:g+2]):
  d.text((10,j*475+5),'SOURCE: '+ref,fill='black');d.text((730,j*475+5),'IMPLEMENTATION: '+name,fill='black')
  for x,path in [(0,source/(ref+'.png')),(720,root/(name+'.png'))]:canvas.paste(Image.open(path).convert('RGB').resize((720,450)),(x,j*475+25))
 canvas.save(root/f'comparison-{g//2+1}.png')
for index,label,box in [(0,'splash-type',(550,435,890,630)),(1,'login-form',(800,90,1320,810)),(2,'error',(820,385,1300,650)),(3,'register-form',(800,90,1336,874))]:
 ref,name=pairs[index];a=Image.open(source/(ref+'.png')).crop(box);b=Image.open(root/(name+'.png')).crop(box);c=Image.new('RGB',(a.width*2,a.height));c.paste(a,(0,0));c.paste(b,(a.width,0));c.save(root/f'focus-{label}.png')

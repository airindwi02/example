from pathlib import Path
from PIL import Image,ImageDraw
import json
for capture in json.loads(Path(".worker-qa/captures.json").read_text(encoding="utf-8"))["captures"]:
 name=capture["name"]
 a=Image.open(Path(".worker-qa")/("reference-"+capture["source"]+".png")).convert("RGB")
 b=Image.open(Path(".worker-qa")/(name+".png")).convert("RGB")
 out=Image.new("RGB",(2880,max(a.height,b.height)+28),"white")
 out.paste(a,(0,28));out.paste(b,(1440,28))
 draw=ImageDraw.Draw(out);draw.text((16,7),"REFERENCE (2880x1800 normalized 0.5x)",fill="black");draw.text((1456,7),"BROWSER (1440x900 CSS px; DPR 1)",fill="black")
 out.save(Path(".worker-qa")/("compare-"+name+".jpg"),quality=90)
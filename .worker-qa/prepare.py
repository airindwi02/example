from pathlib import Path
from PIL import Image
import hashlib,json
root=Path(".")
tracked=[p for base in ["app","prisma"] for p in Path(base).rglob("*") if p.is_file()]
tracked += [Path("database.sql"),Path("package.json"),Path("package-lock.json"),Path("AGENTS.md"),Path("next.config.ts")]
Path(".worker-qa/baseline-hashes.json").write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in tracked},indent=2))
assets=Path("public/daily-worker");assets.mkdir(parents=True,exist_ok=True)
source=Image.open(".design-reference/daily-worker/Worker Dashboard.png")
source.crop((52,52,138,140)).save(assets/"logo.png")
source.crop((2176,208,2816,376)).save(assets/"banner.png")
source=Image.open(".design-reference/daily-worker/Worker Tentang Alana.png")
source.crop((1872,224,2816,576)).save(assets/"about.png")
for p in Path(".design-reference/daily-worker").glob("*.png"):
 im=Image.open(p);im.resize((1440,900),Image.Resampling.LANCZOS).save(Path(".worker-qa")/("reference-"+p.name))

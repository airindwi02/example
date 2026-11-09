from pathlib import Path
p=Path("app/daily-worker/data.ts");s=p.read_text(encoding="utf-8").replace("Â·","·");p.write_text(s,encoding="utf-8")
p=Path("app/daily-worker/ui.tsx");s=p.read_text(encoding="utf-8").replace('id={id} aria-describedby','id={id} aria-label={label} aria-describedby');p.write_text(s,encoding="utf-8")
p=Path("app/daily-worker/ReceivingPage.tsx");s=p.read_text(encoding="utf-8").replace('<select id="receipt-item"','<select aria-label="Nama Bahan" id="receipt-item"');p.write_text(s,encoding="utf-8")
p=Path(".worker-qa/stage1.cjs");s=p.read_text(encoding="utf-8").replace("page.getByLabel('Nama Bahan',{exact:true})","page.getByRole('combobox',{name:'Nama Bahan',exact:true})");p.write_text(s,encoding="utf-8")
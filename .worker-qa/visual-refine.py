from pathlib import Path
p=Path("app/daily-worker/ReceivingPage.tsx");s=p.read_text(encoding="utf-8").replace('state.receipts.slice(0,4)','state.receipts.slice(0,attempted||saved?3:4)');p.write_text(s,encoding="utf-8")
p=Path("app/daily-worker/InspectionPage.tsx");s=p.read_text(encoding="utf-8").replace('Isian perlu diperbaiki: stok aktual harus angka tidak negatif.','{actual.trim().startsWith("-")?"Isian perlu diperbaiki: stok aktual tidak boleh negatif.":"Isian perlu diperbaiki: stok aktual harus angka."}');p.write_text(s,encoding="utf-8")
p=Path("app/daily-worker/ExpiryPage.tsx");s=p.read_text(encoding="utf-8")
s=s.replace('{empty?<>{success&&<Message tone="green">{success}</Message>}<EmptyPanel','{empty?<><EmptyPanel')
s=s.replace('</div></section></>:<>','</div></section>{success&&<div className="w-expiry-final-message"><Message tone="green">{success}</Message></div>}</>:<>')
s=s.replace('<Message>Pilih baris, lalu catat penyesuaian di panel kanan tanpa pindah halaman.</Message>','<Message>{selected?"Pilih baris, lalu catat penyesuaian.":"Pilih baris, lalu catat penyesuaian di panel kanan tanpa pindah halaman."}</Message>')
p.write_text(s,encoding="utf-8")
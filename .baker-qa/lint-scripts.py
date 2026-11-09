from pathlib import Path
for name in ["inspect.cjs","test.cjs"]:
 p=Path(".baker-qa")/name;s=p.read_text(encoding="utf-8-sig");p.write_text("/* eslint-disable @typescript-eslint/no-require-imports -- Node-only browser verification. */\n"+s,encoding="utf-8")

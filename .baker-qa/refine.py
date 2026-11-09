from pathlib import Path
p=Path("app/baker/BakerClient.tsx");s=p.read_text(encoding="utf-8")
s=s.replace('className="b-table-wrap"><table><thead><tr><th>Waktu','className={"b-table-wrap "+(detailed?"b-detailed-history":"")}><table><thead><tr><th>Waktu',1)
s=s.replace('<div className="b-categories">','{!(term&&rows.length===0)&&<div className="b-categories">',1)
s=s.replace('{c}</button>)}</div>','{c}</button>)}</div>}',1)
s=s.replace('aria-label={"Pemakaian "+r.material.name}','aria-describedby={attempted?"production-error":undefined} aria-label={"Pemakaian "+r.material.name}')
s=s.replace('className="b-error" role="alert"','id="production-error" className="b-error" role="alert"')
p.write_text(s,encoding="utf-8")
p=Path("app/baker/baker.css");s=p.read_text(encoding="utf-8-sig")
s += """
.baker-app{--b-bg:#faf6f1;--b-sidebar:#4a2e20;background:var(--b-bg)}
.b-brand{margin-bottom:16px}
.b-global-search:focus-within{border-color:#925b35;background:white;box-shadow:0 0 0 1px #925b3530}
.b-global-search input:focus-visible{outline:none}
.b-notifications .b-notification-heading+.b-all-notifications{border-top:0}
.b-bell.selected{border-color:#cc372c!important;background:#f8e5df!important}
.baker-app td{height:48px;padding-top:10px;padding-bottom:10px}
.b-production-panel td{height:40px;padding-top:3px;padding-bottom:3px}
.b-detailed-history table{table-layout:fixed;min-width:600px}
.b-detailed-history th:first-child{width:14%}
.b-detailed-history th:nth-child(2){width:36%}
.b-detailed-history th:nth-child(3){width:19%}
.b-detailed-history th:nth-child(4){width:31%}
.b-detailed-history td{overflow:hidden;text-overflow:ellipsis}
.b-empty-panel{padding-bottom:58px}
.b-dialog{transform:translate(39px,12px)}
.b-dialog-actions .b-outline{color:#705844;border-color:#dfd0c0}
.b-about{margin-right:-8px}
@media(max-width:700px){.b-dialog{transform:none}.b-about{margin-right:0}.b-sidebar{transition:none}.b-empty-panel{padding-bottom:24px}}
@media(prefers-reduced-motion:reduce){.b-sidebar,.b-product{transition:none}}
"""
p.write_text(s,encoding="utf-8")
p=Path(".baker-qa/test.cjs");s=p.read_text(encoding="utf-8-sig")
s=s.replace("fullPage:true","fullPage:true,animations:'disabled'")
s=s.replace("await capture('logout');","await capture('logout');")
p.write_text(s,encoding="utf-8")

from pathlib import Path
p=Path("app/daily-worker/WorkerShell.tsx");s=p.read_text(encoding="utf-8")
s=s.replace('usePathname, useRouter','usePathname, useRouter, useSearchParams')
s=s.replace('type SearchState={query:string;setQuery:React.Dispatch<React.SetStateAction<string>>;recent:', 'type SearchState={recent:')
s=s.replace('const [query,setQuery]=useState(""),[recent,setRecent]=useState(', 'const [recent,setRecent]=useState(')
s=s.replace('setQuery(value);setRecent(', 'setRecent(')
s=s.replace('value={{query,setQuery,recent,setRecent,search}}','value={{recent,setRecent,search}}')
start=s.index('   <form className="w-global-search"')
end=s.index('</form>',start)+len('</form>')
s=s[:start]+'   <Suspense fallback={<div className="w-global-search"/>}><GlobalSearch/></Suspense>'+s[end:]
insert=s.index('function LogoutDialog(')
search_component="""function GlobalSearch(){
 const params=useSearchParams();const initial=params.get("q")??"";
 return <SearchField key={initial} initial={initial}/>;
}
function SearchField({initial}:{initial:string}){
 const [query,setQuery]=useState(initial);const {search}=useWorkerSearch();
 return <form className="w-global-search" onSubmit={e=>{e.preventDefault();search(query);}}><button type="submit" aria-label="Cari global"><Search size={18}/></button><input aria-label="Pencarian global" value={query} placeholder="Cari barang, transaksi..." onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="Hapus pencarian global" onClick={()=>setQuery("")}><X size={19}/></button>}</form>;
}
"""
s=s[:insert]+search_component+s[insert:]
p.write_text(s,encoding="utf-8")
p=Path("app/daily-worker/ExpiryPage.tsx");s=p.read_text(encoding="utf-8").replace('b.id_barang===selected&&daysUntil(b.tanggal_kedaluwarsa)<=7','b.id_barang===selected');p.write_text(s,encoding="utf-8")
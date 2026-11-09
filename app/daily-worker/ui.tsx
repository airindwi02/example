"use client";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { displayDate, PAGE_SIZE, stockStatus, type Barang } from "./data";
import { useWorker } from "./WorkerState";

export function Status({children,tone}:{children:React.ReactNode;tone?:"red"|"amber"|"green"|"blue"}){
 const label=String(children);
 return <span className={"w-badge "+(tone??(/Kritis|Kadaluwarsa/.test(label)?"red":/Aman|Sudah|Sesuai/.test(label)?"green":"amber"))}>{children}</span>;
}
export function Message({children,tone="blue",id}:{children:React.ReactNode;tone?:"red"|"green"|"blue"|"cream";id?:string}){
 return <div id={id} className={"w-message "+tone} role={tone==="red"?"alert":"status"}>{children}</div>;
}
export function Intro({title,children}:{title:string;children:React.ReactNode}){
 return <div className="w-intro"><h2>{title}</h2><p>{children}</p></div>;
}
export function EmptyPanel({title="Pilih barang",children,className=""}:{title?:string;children:React.ReactNode;className?:string}){
 return <div className={"w-panel w-empty "+className}><span className="w-empty-icon"><X size={17}/></span><h3>{title}</h3><p>{children}</p></div>;
}
export function Details({rows}:{rows:[string,React.ReactNode][]}){
 return <dl className="w-details">{rows.map(([label,value],index)=><div key={label+"-"+index}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
export function QuantityInput({id,label,value,onChange,unit,invalid=false,readOnly=false,description}:{id:string;label:string;value:string;onChange?:(value:string)=>void;unit?:string;invalid?:boolean;readOnly?:boolean;description?:string}){
 return <label className="w-field" htmlFor={id}><span>{label}</span><span className={"w-input-unit "+(invalid?"invalid ":"")+(readOnly?"readonly":"")}><input id={id} aria-label={label} aria-describedby={description} inputMode="decimal" type="text" value={value} onChange={e=>onChange?.(e.target.value)} aria-invalid={invalid} readOnly={readOnly}/>{unit&&<span>{unit}</span>}</span></label>;
}
export function ReasonChoices({label="Alasan Penyesuaian",options,value,onChange,disabled=false}:{label?:string;options:string[];value:string;onChange:(v:string)=>void;disabled?:boolean}){
 return <fieldset className="w-reasons" disabled={disabled}><legend>{label}</legend><div>{options.map(o=><label key={o} className={value===o?"selected":""}><input type="radio" name={label} checked={value===o} onChange={()=>onChange(o)}/>{o}</label>)}</div></fieldset>;
}
export function ItemList({selected,onSelect,kind="stock"}:{selected:string;onSelect:(item:Barang)=>void;kind?:"stock"|"check"|"adjust"}){
 const {state}=useWorker();
 const [search,setSearch]=useState("");
 const [page,setPage]=useState(()=>Math.max(0,Math.floor(state.items.findIndex(b=>b.id_barang===selected)/PAGE_SIZE)));
 const filtered=state.items.filter(b=>b.nama_barang.toLocaleLowerCase("id-ID").includes(search.trim().toLocaleLowerCase("id-ID")));
 const lastPage=Math.max(0,Math.ceil(filtered.length/PAGE_SIZE)-1);
 const currentPage=Math.min(page,lastPage);
 const shown=filtered.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);
 return <><label className="w-list-search"><Search size={21}/><input aria-label="Cari barang" placeholder="Cari barang..." value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/>{search&&<button type="button" aria-label="Hapus pencarian barang" onClick={()=>{setSearch("");setPage(0);}}><X size={16}/></button>}</label>
 <div className={"w-table-wrap w-item-table "+(kind==="stock"?"w-stock-table":"w-count-table")}><table><thead><tr><th>Barang</th><th>{kind==="stock"?"Kategori":kind==="check"?"Stok Tercatat":"Stok Sistem"}</th><th>{kind==="stock"?"Stok":"Terakhir"}</th><th>Status</th></tr></thead><tbody>{shown.map(b=><tr key={b.id_barang} className={selected===b.id_barang?"selected":""} onClick={()=>onSelect(b)}><td><button type="button" className="w-row-button" onClick={()=>onSelect(b)}>{b.nama_barang}</button></td><td>{kind==="stock"?b.ui.kategori:b.stok_saat_ini+" "+b.satuan}</td><td>{kind==="stock"?b.stok_saat_ini+" "+b.satuan:displayDate(b.ui.terakhir_periksa)}</td><td>{kind==="stock"?<Status>{stockStatus(b)}</Status>:<Status tone={b.ui.perlu_cek?"amber":"green"}>{b.ui.perlu_cek?"Perlu cek":"Sudah"}</Status>}</td></tr>)}</tbody></table>{!shown.length&&<p className="w-no-results" role="status">Barang tidak ditemukan. Coba nama barang lain.</p>}</div>
 <div className="w-pagination"><span>Menampilkan {filtered.length?currentPage*PAGE_SIZE+1:0}–{Math.min((currentPage+1)*PAGE_SIZE,filtered.length)} dari {filtered.length} barang</span><div><button className="w-outline" disabled={currentPage===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>‹ Sebelumnya</button><button className="w-outline" disabled={currentPage===lastPage||!filtered.length} onClick={()=>setPage(p=>Math.min(lastPage,p+1))}>Berikutnya ›</button></div></div>
 </>;
}
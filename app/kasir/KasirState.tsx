"use client";
import {createContext,useContext,useState,type ReactNode} from "react";
import {CHECKOUT_BLOCKED,type KasirSnapshot} from "./data";
import {quantityChange} from "../../lib/kasir-cart";
export {cartTotals} from "../../lib/kasir-cart";
function useStore(initialData:KasirSnapshot){
 const [paid,setPaid]=useState<{id:string;total:string;change:string}|null>(null);
 const [cartState,setCart]=useState({cart:{} as Record<string,number>,errors:{} as Record<string,string>});
 const state={...initialData,...cartState};
 function dispatch(action:{type:string;id?:string;quantity?:number}){if(action.type==="quantity"&&action.id)setCart(s=>{const updated=quantityChange({...initialData,...s},action.id!,action.quantity!);return {cart:updated.cart,errors:updated.errors};});else if(action.type==="remove"&&action.id)setCart(s=>{const cart={...s.cart},errors={...s.errors};delete cart[action.id!];delete errors[action.id!];return {cart,errors};});else if(action.type==="new")setCart({cart:{},errors:{}});else if(action.type==="save"||action.type==="review")setCart(s=>({...s,errors:{...s.errors,payment:CHECKOUT_BLOCKED}}));}
 const [recent,setRecent]=useState<string[]>([]),[read,setRead]=useState(false),[search,setSearch]=useState("");
 return {state,dispatch,paid,setPaid,recent,setRecent,read,setRead,search,setSearch};
}
const Context=createContext<ReturnType<typeof useStore>|null>(null);
export function KasirProvider({children,initialData}:{children:ReactNode;initialData:KasirSnapshot}){const value=useStore(initialData);return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useKasir(){const value=useContext(Context);if(!value)throw new Error("KasirProvider required");return value;}

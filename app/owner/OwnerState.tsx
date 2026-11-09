"use client";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { MasterItem } from "../../lib/owner-master-types";
type State = {
  ingredients: MasterItem[];
  recent: string[];
  setRecent: Dispatch<SetStateAction<string[]>>;
  read: boolean;
  setRead: Dispatch<SetStateAction<boolean>>;
};
const Context = createContext<State | null>(null);
export function OwnerProvider({ children, items }: { children: ReactNode; items: MasterItem[] }) {
  const [recent, setRecent] = useState<string[]>([]);
  const [read, setRead] = useState(false);
  return (
    <Context.Provider
      value={{
        ingredients: items,
        recent,
        setRecent,
        read,
        setRead,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useOwner() {
  const c = useContext(Context);
  if (!c) throw new Error("OwnerProvider is required");
  return c;
}

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const MetaContext = createContext(null);

export function MetaProvider({ children }) {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    api.meta().then(setMeta).catch(() => setMeta({ categories: [], ptypes: [], rewards: [], filters: {} }));
  }, []);

  if (!meta) return null;
  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>;
}

export function useMeta() {
  const ctx = useContext(MetaContext);
  if (!ctx) throw new Error("useMeta must be used within MetaProvider");
  return ctx;
}

export const catOf = (categories, id) => categories.find(c => c.id === id) || categories[0] || { label: id, icon: "layers" };
export const ptypeOf = (ptypes, id) => ptypes.find(p => p.id === id) || ptypes[0] || { label: id, icon: "list" };

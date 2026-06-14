import { createContext, useContext, useEffect, useState } from "react";
import { vapi } from "../vapi/client";

const VMetaContext = createContext(null);

export function VMetaProvider({ children }) {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    vapi.meta().then(setMeta).catch(() => setMeta({ vtypes: {}, typeOrder: [], levels: [], badges: [], expertise: [], notifCats: [], helpArticles: [], rewardBands: [], timeBands: [], sorts: [] }));
  }, []);

  if (!meta) return null;
  return <VMetaContext.Provider value={meta}>{children}</VMetaContext.Provider>;
}

export function useVMeta() {
  const ctx = useContext(VMetaContext);
  if (!ctx) throw new Error("useVMeta must be used within VMetaProvider");
  return ctx;
}

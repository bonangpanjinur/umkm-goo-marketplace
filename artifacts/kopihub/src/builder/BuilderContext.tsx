import { createContext, useContext, type ReactNode } from "react";
import type { BuilderContext as Ctx } from "./types";

const C = createContext<Ctx>({ slug: "" });

export function BuilderProvider({ value, children }: { value: Ctx; children: ReactNode }) {
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useBuilderCtx() {
  return useContext(C);
}

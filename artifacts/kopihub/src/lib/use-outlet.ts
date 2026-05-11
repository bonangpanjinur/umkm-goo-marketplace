// Compatibility shim. Prefer useOutletContext from "@/lib/outlet-context".
import { useOutletContext } from "@/lib/outlet-context";

export function useCurrentOutlet() {
  const { current, outlets, setCurrent, loading } = useOutletContext();
  return { outlet: current, outlets, setOutlet: setCurrent, loading };
}

const COMPARE_KEY = "kh_compare_list";

export function getCompareList(): string[] {
  try { return JSON.parse(localStorage.getItem(COMPARE_KEY) ?? "[]"); } catch { return []; }
}

export function addToCompare(productId: string): "added" | "duplicate" | "full" {
  const list = getCompareList();
  if (list.includes(productId)) return "duplicate";
  if (list.length >= 4) return "full";
  list.push(productId);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  return "added";
}

export function removeFromCompare(productId: string) {
  const list = getCompareList().filter(id => id !== productId);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
}

export function clearCompare() {
  localStorage.setItem(COMPARE_KEY, "[]");
}

export function isInCompare(productId: string): boolean {
  return getCompareList().includes(productId);
}

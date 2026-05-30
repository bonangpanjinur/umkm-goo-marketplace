export type CategoryStyle = {
  gradient: string;
  shadow: string;
  emoji: string;
};

const SLUG_MAP: Record<string, CategoryStyle> = {
  "food-beverage":        { gradient: "from-orange-400 to-red-500",     shadow: "shadow-orange-200",   emoji: "🍔" },
  "fashion-pakaian":      { gradient: "from-pink-400 to-rose-600",      shadow: "shadow-pink-200",     emoji: "👗" },
  "produk-digital":       { gradient: "from-violet-500 to-purple-700",  shadow: "shadow-violet-200",   emoji: "💻" },
  "kecantikan-perawatan": { gradient: "from-pink-300 to-fuchsia-500",   shadow: "shadow-pink-200",     emoji: "💄" },
  "elektronik-gadget":    { gradient: "from-cyan-400 to-blue-600",      shadow: "shadow-cyan-200",     emoji: "📱" },
  "kerajinan-tangan":     { gradient: "from-amber-400 to-orange-600",   shadow: "shadow-amber-200",    emoji: "🎨" },
  "buku-edukasi":         { gradient: "from-emerald-400 to-teal-600",   shadow: "shadow-emerald-200",  emoji: "📚" },
  "rumah-dekorasi":       { gradient: "from-teal-400 to-green-600",     shadow: "shadow-teal-200",     emoji: "🏠" },
  "makanan-kemasan":      { gradient: "from-yellow-400 to-orange-500",  shadow: "shadow-yellow-200",   emoji: "🍱" },
  "tanaman-pertanian":    { gradient: "from-green-400 to-emerald-700",  shadow: "shadow-green-200",    emoji: "🌱" },
  "seni-koleksi":         { gradient: "from-purple-400 to-indigo-600",  shadow: "shadow-purple-200",   emoji: "🎭" },
  "jasa-layanan":         { gradient: "from-blue-400 to-indigo-600",    shadow: "shadow-blue-200",     emoji: "⚡" },
  "anak-anak-mainan":     { gradient: "from-yellow-300 to-amber-500",   shadow: "shadow-yellow-200",   emoji: "🧸" },
  "olahraga-outdoor":     { gradient: "from-lime-400 to-green-600",     shadow: "shadow-lime-200",     emoji: "🏃" },
  "hewan-peliharaan":     { gradient: "from-amber-300 to-orange-500",   shadow: "shadow-amber-200",    emoji: "🐾" },
  "lainnya":              { gradient: "from-slate-400 to-gray-600",     shadow: "shadow-slate-200",    emoji: "✨" },
};

const FALLBACK_GRADIENTS: CategoryStyle[] = [
  { gradient: "from-rose-400 to-pink-600",     shadow: "shadow-rose-200",   emoji: "🛍️" },
  { gradient: "from-sky-400 to-blue-600",      shadow: "shadow-sky-200",    emoji: "🏪" },
  { gradient: "from-violet-400 to-purple-600", shadow: "shadow-violet-200", emoji: "🎯" },
  { gradient: "from-emerald-400 to-teal-600",  shadow: "shadow-emerald-200",emoji: "🌟" },
  { gradient: "from-orange-400 to-amber-600",  shadow: "shadow-orange-200", emoji: "💡" },
  { gradient: "from-fuchsia-400 to-pink-600",  shadow: "shadow-fuchsia-200",emoji: "🎪" },
];

let _fallbackIdx = 0;
const _slugCache: Record<string, CategoryStyle> = {};

export function getCategoryStyle(slug: string): CategoryStyle {
  if (SLUG_MAP[slug]) return SLUG_MAP[slug];
  if (!_slugCache[slug]) {
    _slugCache[slug] = FALLBACK_GRADIENTS[_fallbackIdx++ % FALLBACK_GRADIENTS.length];
  }
  return _slugCache[slug];
}

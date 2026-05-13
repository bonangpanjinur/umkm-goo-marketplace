// Reusable image upload validation utility.
// Used by portfolio, product, review, custom-order, before/after dialogs.

export type ImageValidationOptions = {
  maxSizeMB?: number;          // default 5MB
  acceptedFormats?: string[];  // default jpg, png, webp
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: { w: number; h: number; tolerance?: number }; // optional fixed AR
};

export type ImageValidationResult =
  | { ok: true; file: File; width: number; height: number; previewUrl: string }
  | { ok: false; error: string };

const DEFAULT_FORMATS = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function validateImageUpload(
  file: File,
  opts: ImageValidationOptions = {},
): Promise<ImageValidationResult> {
  const {
    maxSizeMB = 5,
    acceptedFormats = DEFAULT_FORMATS,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    aspectRatio,
  } = opts;

  if (!acceptedFormats.includes(file.type)) {
    return {
      ok: false,
      error: `Format tidak didukung. Gunakan ${acceptedFormats
        .map((f) => f.split("/")[1].toUpperCase())
        .join(", ")}.`,
    };
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return {
      ok: false,
      error: `Ukuran file ${sizeMB.toFixed(1)} MB melebihi batas ${maxSizeMB} MB.`,
    };
  }

  // Check dimensions
  const previewUrl = URL.createObjectURL(file);
  const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = previewUrl;
  });

  if (!dims) {
    URL.revokeObjectURL(previewUrl);
    return { ok: false, error: "File tidak bisa dibaca sebagai gambar." };
  }

  if (minWidth && dims.w < minWidth) {
    URL.revokeObjectURL(previewUrl);
    return { ok: false, error: `Lebar minimal ${minWidth}px (foto kamu ${dims.w}px).` };
  }
  if (minHeight && dims.h < minHeight) {
    URL.revokeObjectURL(previewUrl);
    return { ok: false, error: `Tinggi minimal ${minHeight}px (foto kamu ${dims.h}px).` };
  }
  if (maxWidth && dims.w > maxWidth) {
    URL.revokeObjectURL(previewUrl);
    return { ok: false, error: `Lebar maksimal ${maxWidth}px (foto kamu ${dims.w}px).` };
  }
  if (maxHeight && dims.h > maxHeight) {
    URL.revokeObjectURL(previewUrl);
    return { ok: false, error: `Tinggi maksimal ${maxHeight}px (foto kamu ${dims.h}px).` };
  }

  if (aspectRatio) {
    const target = aspectRatio.w / aspectRatio.h;
    const actual = dims.w / dims.h;
    const tol = aspectRatio.tolerance ?? 0.1;
    if (Math.abs(actual - target) / target > tol) {
      URL.revokeObjectURL(previewUrl);
      return {
        ok: false,
        error: `Rasio foto ${dims.w}:${dims.h} tidak sesuai (perlu ~${aspectRatio.w}:${aspectRatio.h}).`,
      };
    }
  }

  return { ok: true, file, width: dims.w, height: dims.h, previewUrl };
}

// Helper to deeplink to courier tracking sites
export const COURIER_TRACK_URL: Record<string, (resi: string) => string> = {
  jne:      (r) => `https://www.jne.co.id/id/tracking/trace/${r}`,
  jnt:      (r) => `https://www.jet.co.id/track/${r}`,
  "j&t":    (r) => `https://www.jet.co.id/track/${r}`,
  sicepat:  (r) => `https://www.sicepat.com/checkAwb?awb=${r}`,
  anteraja: (r) => `https://www.anteraja.id/tracking/${r}`,
  pos:      (r) => `https://www.posindonesia.co.id/id/tracking/${r}`,
  ninja:    (r) => `https://www.ninjaxpress.co/id-id/tracking?id=${r}`,
  gojek:    (r) => `https://gosend.id/track?awb=${r}`,
  grab:     (r) => `https://www.grab.com/id/express-tracking/?id=${r}`,
};

export function getCourierTrackUrl(courier: string | null | undefined, resi: string | null | undefined): string | null {
  if (!courier || !resi) return null;
  const key = courier.toLowerCase().trim().replace(/\s+/g, "");
  for (const k of Object.keys(COURIER_TRACK_URL)) {
    if (key.includes(k)) return COURIER_TRACK_URL[k](resi);
  }
  // Fallback: cek-resi.com universal
  return `https://cekresi.com/?noresi=${encodeURIComponent(resi)}`;
}

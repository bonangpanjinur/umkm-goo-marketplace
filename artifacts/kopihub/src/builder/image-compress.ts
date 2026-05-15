// Client-side image validation + downscale + compression for builder uploads.
// Keeps stored assets light (max ~1600px, target ~85% JPEG quality).

export type CompressOpts = {
  maxDimension?: number; // longest side
  quality?: number; // 0..1
  maxBytes?: number; // hard cap before upload
};

const DEFAULTS: Required<CompressOpts> = {
  maxDimension: 1600,
  quality: 0.85,
  maxBytes: 5 * 1024 * 1024,
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function validateAndCompressImage(
  file: File,
  opts: CompressOpts = {},
): Promise<File> {
  const { maxDimension, quality, maxBytes } = { ...DEFAULTS, ...opts };

  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar");
  }
  if (!ACCEPTED.includes(file.type)) {
    throw new Error("Format gambar tidak didukung (gunakan JPG, PNG, WEBP, atau GIF)");
  }
  if (file.size > maxBytes) {
    throw new Error(`Ukuran maksimal ${(maxBytes / 1024 / 1024).toFixed(0)} MB`);
  }
  // GIFs (animations) — pass through, do not compress
  if (file.type === "image/gif") return file;

  const bitmap = await loadBitmap(file);
  const { width, height } = bitmap;
  const longest = Math.max(width, height);
  const scale = longest > maxDimension ? maxDimension / longest : 1;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  // If already small and reasonably sized, skip recompression for PNG with transparency
  if (scale === 1 && file.size < 400 * 1024) {
    bitmap.close?.();
    return file;
  }

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(targetW, targetH)
      : Object.assign(document.createElement("canvas"), { width: targetW, height: targetH });
  const ctx = (canvas as HTMLCanvasElement).getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung kompresi gambar");
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close?.();

  // Encode as JPEG for photos, WEBP if available; preserve PNG only if alpha matters (we flatten to JPEG bg white)
  const outType = "image/jpeg";
  let blob: Blob;
  if ("convertToBlob" in canvas) {
    blob = await (canvas as OffscreenCanvas).convertToBlob({ type: outType, quality });
  } else {
    blob = await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Gagal mengompres gambar"))),
        outType,
        quality,
      );
    });
  }

  // If compression somehow grew the file, keep the original
  if (blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: outType, lastModified: Date.now() });
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // fallthrough
    }
  }
  // Fallback via HTMLImageElement
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Tidak dapat membaca gambar"));
      i.src = url;
    });
    return (await createImageBitmap(img)) as ImageBitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}

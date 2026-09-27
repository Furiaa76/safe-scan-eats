/** Ridimensiona una foto e la converte in JPEG data URL (per invio leggero). */
export async function fileToDataUrl(file: File, max = 1280, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const FRONT_KEY = "safefood-front-photo";

export function saveFrontPhoto(dataUrl: string | null) {
  try {
    if (dataUrl) sessionStorage.setItem(FRONT_KEY, dataUrl);
    else sessionStorage.removeItem(FRONT_KEY);
  } catch {}
}

export function loadFrontPhoto(): string | null {
  try {
    return sessionStorage.getItem(FRONT_KEY);
  } catch {
    return null;
  }
}
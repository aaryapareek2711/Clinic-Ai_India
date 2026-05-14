/** Upper bound for `avatar_url` PATCH bodies (must stay under backend `AVATAR_URL_MAX_LENGTH`). */
export const MAX_AVATAR_DATA_URL_CHARS = 1_000_000

/**
 * Downscale and re-encode as JPEG so the result fits in `maxLength` characters (data URL).
 * Used when the user picks a local file; the API stores `avatar_url` as a string (often a data URL).
 */
export async function imageFileToJpegDataUrl(
  file: File,
  maxLength: number = MAX_AVATAR_DATA_URL_CHARS,
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    let maxEdge = 512
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')

    const w0 = bitmap.width
    const h0 = bitmap.height
    if (!w0 || !h0) throw new Error('Invalid image dimensions')

    const draw = (w: number, h: number, q: number) => {
      canvas.width = w
      canvas.height = h
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(bitmap, 0, 0, w, h)
      return canvas.toDataURL('image/jpeg', q)
    }

    while (maxEdge >= 48) {
      const scale = Math.min(1, maxEdge / Math.max(w0, h0))
      const w = Math.max(1, Math.round(w0 * scale))
      const h = Math.max(1, Math.round(h0 * scale))
      let q = 0.88
      while (q >= 0.32) {
        const dataUrl = draw(w, h, q)
        if (dataUrl.length <= maxLength) return dataUrl
        q -= 0.07
      }
      maxEdge = Math.floor(maxEdge * 0.72)
    }
    throw new Error('Image could not be compressed enough; try a smaller file.')
  } finally {
    bitmap.close()
  }
}

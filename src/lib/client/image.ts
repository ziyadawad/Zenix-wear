/** Downscales phone photos in the browser so uploads stay under the server's body limit. */
export async function compressImage(file: File, maxSide = 2000, quality = 0.86): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
    return blob && blob.size < file.size * 1.1 ? new File([blob], 'upload.webp', { type: 'image/webp' }) : file;
  } catch {
    return file; // HEIC or an unsupported format: the server decides whether to accept it
  }
}

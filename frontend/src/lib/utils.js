import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function stripHtmlAndEntities(html) {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let text = doc.body.textContent || "";
    // Fallback to strip any stubborn tags
    return text.replace(/<[^>]*>?/gm, '').trim();
  } catch (e) {
    return html.replace(/<[^>]*>?/gm, '').trim();
  }
}

export const compressToWebP = (file, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));
    
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1920;
        
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Canvas to Blob failed'));
          }
          const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          const newFile = new File([blob], newFileName, {
            type: 'image/webp',
            lastModified: Date.now()
          });
          resolve(newFile);
        }, 'image/webp', quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

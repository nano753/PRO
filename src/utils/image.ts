/**
 * Client-side image optimization for local IndexedDB storage
 * Scales down large photos to standard logo dimensions (max 400x400)
 * keeping storage footprint minimal (~20-50KB) and load speeds instantaneous.
 */

export function compressImageToBase64(
  file: File,
  maxDimension = 400,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original read result if canvas context is unavailable
          resolve(event.target?.result as string);
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as PNG if it has transparency or as JPEG with high quality
        const isPng = file.type === 'image/png';
        const dataUrl = isPng
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', quality);

        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Erro ao carregar a imagem. Tente outro formato como PNG ou JPG.'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Falha na leitura do arquivo de imagem.'));
    };

    reader.readAsDataURL(file);
  });
}

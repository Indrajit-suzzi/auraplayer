export const getColor = (img: HTMLImageElement): Promise<{ hex: () => string } | null> => {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      canvas.width = 1;
      canvas.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      
      const toHex = (c: number) => c.toString(16).padStart(2, '0');
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      
      resolve({
        hex: () => hex
      });
    } catch (e) {
      console.error("Color extraction error", e);
      resolve(null);
    }
  });
};

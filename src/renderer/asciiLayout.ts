export interface AsciiGrid {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  cells: AsciiCell[];
  currentTargetIndex: number; 
  targetIndices: number[]; 
}

export interface AsciiCell {
  x: number;
  y: number;
  char: string;
  isActive: boolean; 
  isTarget: boolean; 
  isBackground: boolean; 
}

export async function loadImageMask(url: string, cols: number, rows: number): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cols;
      canvas.height = rows;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject('No 2d context');
      
      ctx.drawImage(img, 0, 0, cols, rows);
      const imgData = ctx.getImageData(0, 0, cols, rows).data;
      const mask = new Float32Array(cols * rows);
      
      for (let i = 0; i < cols * rows; i++) {
        const r = imgData[i * 4];
        const g = imgData[i * 4 + 1];
        const b = imgData[i * 4 + 2];
        const a = imgData[i * 4 + 3];
        
        // If image is transparent, a=0. 
        // If background is white and shape is black, darker means more solid
        // Let's make it simple: if alpha is high, and it's dark, it's solid.
        // OR if alpha is high and it's any color, treat as solid (more robust for transparent pngs)
        let solidness = 0;
        if (a > 128) {
          const brightness = (r + g + b) / (3 * 255);
          solidness = 1 - brightness; // black = 1, white = 0
          
          // If the image is purely a colored shape on transparent bg, brightness might be high.
          // Let's just use alpha if it's a silhouette png.
          if (solidness < 0.2) solidness = a / 255; 
        }
        
        mask[i] = solidness;
      }
      resolve(mask);
    };
    img.onerror = () => {
      console.warn("Image load failed. Falling back to block shape.");
      // Fallback mask: a simple rectangle in the center
      const mask = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (x > cols/4 && x < cols*3/4 && y > rows/4 && y < rows*3/4) {
            mask[y * cols + x] = 1;
          }
        }
      }
      resolve(mask);
    };
    img.src = url;
  });
}

const BG_CHARS = '.:-=+*#%@';

export function createAsciiGrid(
  mask: Float32Array, 
  cols: number, 
  rows: number, 
  width: number, 
  height: number,
  targetWord: string
): AsciiGrid {
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const cells: AsciiCell[] = [];
  const validIndices: number[] = [];
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const val = mask[idx];
      
      if (val > 0.2) {
        cells.push({
          x: x * cellWidth,
          y: y * cellHeight,
          char: BG_CHARS[Math.floor(Math.random() * BG_CHARS.length)],
          isActive: true,
          isTarget: false,
          isBackground: true
        });
        validIndices.push(cells.length - 1);
      } else {
        cells.push({
          x: x * cellWidth,
          y: y * cellHeight,
          char: ' ',
          isActive: false,
          isTarget: false,
          isBackground: true
        });
      }
    }
  }

  const targetIndices: number[] = [];
  const shuffledValid = [...validIndices].sort((a, b) => {
    const ca = cells[a];
    const cb = cells[b];
    return (ca.y * 1000 + ca.x) - (cb.y * 1000 + cb.x);
  });
  
  if (shuffledValid.length >= targetWord.length) {
    const step = Math.floor(shuffledValid.length / targetWord.length);
    for (let i = 0; i < targetWord.length; i++) {
      const cellIdx = shuffledValid[i * step + Math.floor(step/2)];
      targetIndices.push(cellIdx);
      cells[cellIdx].char = targetWord[i];
      cells[cellIdx].isBackground = false;
    }
    if (targetIndices.length > 0) {
      cells[targetIndices[0]].isTarget = true;
    }
  }
  
  return {
    cols,
    rows,
    cellWidth,
    cellHeight,
    cells,
    currentTargetIndex: 0,
    targetIndices
  };
}

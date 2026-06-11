import { createElement, icons } from 'lucide';

const MASK_RESOLUTION = 800;

let offCanvas: HTMLCanvasElement;
let offCtx: CanvasRenderingContext2D;

export const shapePixelCache: Record<string, any> = {};

export function initMorpher() {
  if (typeof document !== 'undefined' && !offCanvas) {
    offCanvas = document.createElement('canvas');
    offCanvas.width = MASK_RESOLUTION;
    offCanvas.height = MASK_RESOLUTION;
    offCtx = offCanvas.getContext('2d', { willReadFrequently: true })!;
  }
}

const loadQueue: Record<string, (() => void)[]> = {};

export function loadShapePixels(iconName: string, callback?: () => void) {
  initMorpher();
  
  if (shapePixelCache[iconName] && shapePixelCache[iconName] !== 'loading') {
    if (callback) callback();
    return;
  }
  
  if (shapePixelCache[iconName] === 'loading') {
    if (callback) {
      if (!loadQueue[iconName]) loadQueue[iconName] = [];
      loadQueue[iconName].push(callback);
    }
    return;
  }
  
  // Math shapes
  if (['Square', 'square', 'Circle', 'circle', 'Triangle', 'triangle'].includes(iconName)) {
      shapePixelCache[iconName] = 'math';
      if (callback) callback();
      return;
  }
  
  // Image URL loading
  if (iconName.startsWith('http') || iconName.startsWith('/') || iconName.startsWith('./') || iconName.startsWith('data:')) {
    shapePixelCache[iconName] = 'loading';
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    if (callback) {
      if (!loadQueue[iconName]) loadQueue[iconName] = [];
      loadQueue[iconName].push(callback);
    }
    
    img.onload = () => {
      if (!offCtx) return;
      offCtx.clearRect(0, 0, MASK_RESOLUTION, MASK_RESOLUTION);
      
      // Keep aspect ratio
      const scale = Math.min(MASK_RESOLUTION / img.width, MASK_RESOLUTION / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (MASK_RESOLUTION - w) / 2;
      const y = (MASK_RESOLUTION - h) / 2;
      
      offCtx.drawImage(img, x, y, w, h);
      
      const imgData = offCtx.getImageData(0, 0, MASK_RESOLUTION, MASK_RESOLUTION).data;
      const bounds: any[] = [];
      
      for (let py = 0; py < MASK_RESOLUTION; py++) {
        const rowSegments = [];
        let inSegment = false;
        let firstX = 0;
        for (let px = 0; px < MASK_RESOLUTION; px++) {
          const idx = (py * MASK_RESOLUTION + px) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const alpha = imgData[idx + 3];
          // Treat near-white or transparent pixels as background
          if (alpha > 20 && (r < 240 || g < 240 || b < 240)) { // threshold
            if (!inSegment) {
              inSegment = true;
              firstX = px;
            }
          } else {
            if (inSegment) {
              inSegment = false;
              rowSegments.push({
                w: (px - 1) - firstX + 1,
                xOffset: ((px - 1) + firstX) / 2 - MASK_RESOLUTION / 2
              });
            }
          }
        }
        if (inSegment) {
          rowSegments.push({
            w: (MASK_RESOLUTION - 1) - firstX + 1,
            xOffset: ((MASK_RESOLUTION - 1) + firstX) / 2 - MASK_RESOLUTION / 2
          });
        }
        bounds[py] = rowSegments;
      }
      
      shapePixelCache[iconName] = bounds;
      if (loadQueue[iconName]) {
        loadQueue[iconName].forEach(cb => cb());
        delete loadQueue[iconName];
      }
    };
    
    img.onerror = () => {
      shapePixelCache[iconName] = null;
      if (loadQueue[iconName]) {
        loadQueue[iconName].forEach(cb => cb());
        delete loadQueue[iconName];
      }
    };
    
    img.src = iconName;
    return;
  }
  
  shapePixelCache[iconName] = 'loading';
  
  const iconData = (icons as any)[iconName];
  if (!iconData) {
    shapePixelCache[iconName] = null;
    if (callback) callback();
    if (loadQueue[iconName]) {
      loadQueue[iconName].forEach(cb => cb());
      delete loadQueue[iconName];
    }
    return;
  }
  
  if (callback) {
    if (!loadQueue[iconName]) loadQueue[iconName] = [];
    loadQueue[iconName].push(callback);
  }
  
  const rawSvg = createElement(iconData);
  rawSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  rawSvg.setAttribute('width', MASK_RESOLUTION.toString());
  rawSvg.setAttribute('height', MASK_RESOLUTION.toString());
  
  const children = rawSvg.querySelectorAll ? rawSvg.querySelectorAll('*') : [];
  children.forEach((child: any) => {
    child.setAttribute('fill', 'black');
    child.setAttribute('stroke', 'black');
    child.setAttribute('stroke-width', '2');
    child.setAttribute('stroke-linecap', 'round');
    child.setAttribute('stroke-linejoin', 'round');
  });

  const svgString = new XMLSerializer().serializeToString(rawSvg);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const img = new Image();
  img.onload = () => {
    if (!offCtx) {
      console.warn("offCtx is not initialized!");
      return;
    }
    offCtx.clearRect(0, 0, MASK_RESOLUTION, MASK_RESOLUTION);
    offCtx.drawImage(img, 0, 0, MASK_RESOLUTION, MASK_RESOLUTION);
    
    const imgData = offCtx.getImageData(0, 0, MASK_RESOLUTION, MASK_RESOLUTION).data;
    const bounds: any[] = [];
    
    for (let y = 0; y < MASK_RESOLUTION; y++) {
      const rowSegments = [];
      let inSegment = false;
      let firstX = 0;
      for (let x = 0; x < MASK_RESOLUTION; x++) {
        const idx = (y * MASK_RESOLUTION + x) * 4;
        const alpha = imgData[idx + 3];
        if (alpha > 10) {
          if (!inSegment) {
            inSegment = true;
            firstX = x;
          }
        } else {
          if (inSegment) {
            inSegment = false;
            rowSegments.push({
              w: (x - 1) - firstX + 1,
              xOffset: ((x - 1) + firstX) / 2 - MASK_RESOLUTION / 2
            });
          }
        }
      }
      if (inSegment) {
        rowSegments.push({
          w: (MASK_RESOLUTION - 1) - firstX + 1,
          xOffset: ((MASK_RESOLUTION - 1) + firstX) / 2 - MASK_RESOLUTION / 2
        });
      }
      bounds[y] = rowSegments;
    }
    
    shapePixelCache[iconName] = bounds;
    URL.revokeObjectURL(url);
    if (loadQueue[iconName]) {
      loadQueue[iconName].forEach(cb => cb());
      delete loadQueue[iconName];
    }
  };
  img.src = url;
}

export function getShapeParams(shape: string, y: number, maxShapeSize: number): {w: number, offsetX: number}[] {
  if (shape === 'Square' || shape === 'square') {
    if (y < 0 || y > maxShapeSize) return [];
    return [{ w: maxShapeSize, offsetX: 0 }];
  } else if (shape === 'Circle' || shape === 'circle') {
    const r = maxShapeSize / 2;
    if (y < 0 || y > 2 * r) return [];
    const distFromCenter = Math.abs(r - y);
    const halfWidth = Math.sqrt(Math.max(0, r * r - distFromCenter * distFromCenter));
    return [{ w: Math.max(1, 2 * halfWidth), offsetX: 0 }];
  } else if (shape === 'Triangle' || shape === 'triangle') {
    const h = (Math.sqrt(3) / 2) * maxShapeSize;
    if (y < 0 || y > h) return [];
    return [{ w: Math.max(1, (y / h) * maxShapeSize), offsetX: 0 }];
  }

  const defaultParams: any[] = [];
  
  if (shapePixelCache[shape] && shapePixelCache[shape] !== 'loading' && shapePixelCache[shape] !== 'math') {
    const boundsRows = shapePixelCache[shape];
    const maskY = Math.max(0, Math.min(MASK_RESOLUTION - 1, Math.round((y / maxShapeSize) * (MASK_RESOLUTION - 1))));
    const segments = boundsRows[maskY];
    if (segments && segments.length > 0) {
      return segments.map((row: any) => ({
        w: (row.w / MASK_RESOLUTION) * maxShapeSize,
        offsetX: (row.xOffset / MASK_RESOLUTION) * maxShapeSize
      }));
    }
  }
  return defaultParams;
}

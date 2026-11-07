import { getMonsterSvg } from '../data/monsterSvgs';

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

// ---------------------------------------------------------------------------
// Core SVG → pixel-bounds converter
// Parses an SVG string and rasterises it into the shared offscreen canvas,
// then samples the alpha channel to produce row-segment bounds data.
// This is called SYNCHRONOUSLY for static-imported SVGs and asynchronously
// (after fetch) for any future runtime-fetched SVGs.
// ---------------------------------------------------------------------------
function processSvgText(iconName: string, svgText: string): void {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`SVG parse error for "${iconName}": ${parseError.textContent}`);
    }

    const rawSvg = doc.querySelector('svg');
    if (!rawSvg) throw new Error(`No <svg> element found for "${iconName}"`);
    if (!offCtx)  throw new Error('offCtx not initialised');

    // --- viewBox -------------------------------------------------------
    const viewBoxStr  = rawSvg.getAttribute('viewBox') || '0 0 24 24';
    const vbParts     = viewBoxStr.trim().split(/[\s,]+/).map(Number);
    const minX  = isNaN(vbParts[0]) ? 0  : vbParts[0];
    const minY  = isNaN(vbParts[1]) ? 0  : vbParts[1];
    const vbW   = (isNaN(vbParts[2]) || vbParts[2] === 0) ? 24 : vbParts[2];
    const vbH   = (isNaN(vbParts[3]) || vbParts[3] === 0) ? 24 : vbParts[3];

    const scaleX = MASK_RESOLUTION / vbW;
    const scaleY = MASK_RESOLUTION / vbH;

    // --- rasterise -----------------------------------------------------
    // Use a fresh context state each time.
    offCtx.setTransform(1, 0, 0, 1, 0, 0); // reset any leftover transform
    offCtx.clearRect(0, 0, MASK_RESOLUTION, MASK_RESOLUTION);
    offCtx.save();
    offCtx.scale(scaleX, scaleY);
    offCtx.translate(-minX, -minY);

    const elements = rawSvg.querySelectorAll('*');
    elements.forEach((el: Element) => {
      const tag = el.tagName.toLowerCase().replace(/^svg:/, '');
      if (tag === 'g' || tag === 'svg' || tag === 'defs' || tag === 'title' || tag === 'desc') return;

      // Skip solid background rectangles / paths
      if (tag === 'path') {
        const d      = el.getAttribute('d') || '';
        const dClean = d.replace(/\s+/g, '').toLowerCase();
        if (
          dClean.startsWith('m00h512v512') ||
          dClean.startsWith('m00h24v24')   ||
          dClean === 'm00h512v512h0z'       ||
          dClean === 'm00h24v24h0z'
        ) return;
      }
      if (tag === 'rect') {
        const x = parseFloat(el.getAttribute('x') || '0');
        const y = parseFloat(el.getAttribute('y') || '0');
        if (x === 0 && y === 0) {
          const fill = el.getAttribute('fill');
          if (fill && fill !== 'none') return; // background fill rect
        }
      }

      offCtx.fillStyle   = 'black';
      offCtx.strokeStyle = 'black';
      offCtx.lineWidth   = parseFloat(el.getAttribute('stroke-width') || '2');
      offCtx.lineCap     = (el.getAttribute('stroke-linecap')  || 'round') as CanvasLineCap;
      offCtx.lineJoin    = (el.getAttribute('stroke-linejoin') || 'round') as CanvasLineJoin;

      switch (tag) {
        case 'path': {
          const d = el.getAttribute('d');
          if (d) {
            const p = new Path2D(d);
            offCtx.fill(p);
            offCtx.stroke(p);
          }
          break;
        }
        case 'circle': {
          const cx = parseFloat(el.getAttribute('cx') || '0');
          const cy = parseFloat(el.getAttribute('cy') || '0');
          const r  = parseFloat(el.getAttribute('r')  || '0');
          offCtx.beginPath();
          offCtx.arc(cx, cy, r, 0, Math.PI * 2);
          offCtx.fill();
          offCtx.stroke();
          break;
        }
        case 'ellipse': {
          const cx = parseFloat(el.getAttribute('cx') || '0');
          const cy = parseFloat(el.getAttribute('cy') || '0');
          const rx = parseFloat(el.getAttribute('rx') || '0');
          const ry = parseFloat(el.getAttribute('ry') || '0');
          offCtx.beginPath();
          offCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          offCtx.fill();
          offCtx.stroke();
          break;
        }
        case 'rect': {
          const x  = parseFloat(el.getAttribute('x') || '0');
          const y  = parseFloat(el.getAttribute('y') || '0');
          const w  = parseFloat(el.getAttribute('width')  || '0');
          const h  = parseFloat(el.getAttribute('height') || '0');
          const rx = parseFloat(el.getAttribute('rx') || '0');
          const ry = parseFloat(el.getAttribute('ry') || '0');
          offCtx.beginPath();
          if (rx > 0 || ry > 0) offCtx.roundRect(x, y, w, h, [rx, ry]);
          else                   offCtx.rect(x, y, w, h);
          offCtx.fill();
          offCtx.stroke();
          break;
        }
        case 'line': {
          const x1 = parseFloat(el.getAttribute('x1') || '0');
          const y1 = parseFloat(el.getAttribute('y1') || '0');
          const x2 = parseFloat(el.getAttribute('x2') || '0');
          const y2 = parseFloat(el.getAttribute('y2') || '0');
          offCtx.beginPath();
          offCtx.moveTo(x1, y1);
          offCtx.lineTo(x2, y2);
          offCtx.stroke();
          break;
        }
        case 'polygon': {
          const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
          if (pts.length >= 2) {
            offCtx.beginPath();
            offCtx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length - 1; i += 2) offCtx.lineTo(pts[i], pts[i + 1]);
            offCtx.closePath();
            offCtx.fill();
            offCtx.stroke();
          }
          break;
        }
        case 'polyline': {
          const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
          if (pts.length >= 2) {
            offCtx.beginPath();
            offCtx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length - 1; i += 2) offCtx.lineTo(pts[i], pts[i + 1]);
            offCtx.stroke();
          }
          break;
        }
      }
    });

    offCtx.restore();

    // --- sample alpha channel -----------------------------------------
    offCtx.setTransform(1, 0, 0, 1, 0, 0); // ensure identity before read
    const imgData = offCtx.getImageData(0, 0, MASK_RESOLUTION, MASK_RESOLUTION).data;
    const bounds: { w: number; xOffset: number }[][] = [];

    for (let row = 0; row < MASK_RESOLUTION; row++) {
      const segs: { w: number; xOffset: number }[] = [];
      let inSeg = false;
      let firstX = 0;
      for (let col = 0; col < MASK_RESOLUTION; col++) {
        const alpha = imgData[(row * MASK_RESOLUTION + col) * 4 + 3];
        if (alpha > 10) {
          if (!inSeg) { inSeg = true; firstX = col; }
        } else {
          if (inSeg) {
            inSeg = false;
            const lastX = col - 1;
            segs.push({ w: lastX - firstX + 1, xOffset: (firstX + lastX) / 2 - MASK_RESOLUTION / 2 });
          }
        }
      }
      if (inSeg) {
        const lastX = MASK_RESOLUTION - 1;
        segs.push({ w: lastX - firstX + 1, xOffset: (firstX + lastX) / 2 - MASK_RESOLUTION / 2 });
      }
      bounds[row] = segs;
    }

    shapePixelCache[iconName] = bounds;
  } catch (err) {
    console.error(`[shapeMorpher] Failed to process SVG for "${iconName}":`, err);
    shapePixelCache[iconName] = null;
  }

  // Fire queued callbacks
  if (loadQueue[iconName]) {
    loadQueue[iconName].forEach(cb => cb());
    delete loadQueue[iconName];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function loadShapePixels(iconName: string, callback?: () => void) {
  initMorpher();

  // Already done
  if (shapePixelCache[iconName] && shapePixelCache[iconName] !== 'loading') {
    if (callback) callback();
    return;
  }

  // Another caller is already loading this shape → queue callback
  if (shapePixelCache[iconName] === 'loading') {
    if (callback) {
      if (!loadQueue[iconName]) loadQueue[iconName] = [];
      loadQueue[iconName].push(callback);
    }
    return;
  }

  // --- Math shapes (no pixel data needed) --------------------------------
  if (['Square', 'square', 'Circle', 'circle', 'Triangle', 'triangle'].includes(iconName)) {
    shapePixelCache[iconName] = 'math';
    if (callback) callback();
    return;
  }

  // --- Image file (PNG / JPG / etc.) -------------------------------------
  const isImageUrl =
    iconName.endsWith('.png')  || iconName.endsWith('.jpg')  ||
    iconName.endsWith('.jpeg') || iconName.endsWith('.webp') ||
    iconName.endsWith('.gif')  || iconName.startsWith('data:image/');

  if (isImageUrl) {
    shapePixelCache[iconName] = 'loading';
    if (callback) {
      if (!loadQueue[iconName]) loadQueue[iconName] = [];
      loadQueue[iconName].push(callback);
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      if (!offCtx) return;
      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.clearRect(0, 0, MASK_RESOLUTION, MASK_RESOLUTION);

      const scale = Math.min(MASK_RESOLUTION / img.width, MASK_RESOLUTION / img.height);
      const w = img.width  * scale;
      const h = img.height * scale;
      offCtx.drawImage(img, (MASK_RESOLUTION - w) / 2, (MASK_RESOLUTION - h) / 2, w, h);

      const imgData = offCtx.getImageData(0, 0, MASK_RESOLUTION, MASK_RESOLUTION).data;
      const bounds: { w: number; xOffset: number }[][] = [];

      for (let py = 0; py < MASK_RESOLUTION; py++) {
        const segs: { w: number; xOffset: number }[] = [];
        let inSeg = false;
        let firstX = 0;
        for (let px = 0; px < MASK_RESOLUTION; px++) {
          const idx   = (py * MASK_RESOLUTION + px) * 4;
          const r     = imgData[idx];
          const g     = imgData[idx + 1];
          const b     = imgData[idx + 2];
          const alpha = imgData[idx + 3];
          if (alpha > 20 && (r < 240 || g < 240 || b < 240)) {
            if (!inSeg) { inSeg = true; firstX = px; }
          } else if (inSeg) {
            inSeg = false;
            const lastX = px - 1;
            segs.push({ w: lastX - firstX + 1, xOffset: (firstX + lastX) / 2 - MASK_RESOLUTION / 2 });
          }
        }
        if (inSeg) {
          const lastX = MASK_RESOLUTION - 1;
          segs.push({ w: lastX - firstX + 1, xOffset: (firstX + lastX) / 2 - MASK_RESOLUTION / 2 });
        }
        bounds[py] = segs;
      }

      shapePixelCache[iconName] = bounds;
      if (loadQueue[iconName]) {
        loadQueue[iconName].forEach(cb => cb());
        delete loadQueue[iconName];
      }
    };

    img.onerror = () => {
      console.warn(`[shapeMorpher] Failed to load image: ${iconName}`);
      shapePixelCache[iconName] = null;
      if (loadQueue[iconName]) {
        loadQueue[iconName].forEach(cb => cb());
        delete loadQueue[iconName];
      }
    };

    // Try a few path variants for image files
    img.src = iconName.startsWith('/') ? iconName : '/' + iconName;
    return;
  }

  // --- SVG monster shape — try static bundle first ----------------------
  shapePixelCache[iconName] = 'loading';
  if (callback) {
    if (!loadQueue[iconName]) loadQueue[iconName] = [];
    loadQueue[iconName].push(callback);
  }

  const staticSvg = getMonsterSvg(iconName);
  if (staticSvg) {
    // Synchronous: SVG text is already in the bundle.
    processSvgText(iconName, staticSvg);
    return;
  }

  // --- Fallback: runtime fetch (for unknown / future shapes) ------------
  console.warn(`[shapeMorpher] "${iconName}" not in static bundle — attempting fetch…`);

  let sanitized = iconName;
  if (sanitized.includes('/')) sanitized = sanitized.substring(sanitized.lastIndexOf('/') + 1);
  if (sanitized.endsWith('.svg')) sanitized = sanitized.slice(0, -4);

  const pathsToTry = [
    `/monsters/${sanitized}.svg`,
    `/monsters/${sanitized.toLowerCase()}.svg`,
    `monsters/${sanitized}.svg`,
    `monsters/${sanitized.toLowerCase()}.svg`,
  ];

  (async () => {
    let svgText: string | null = null;
    for (const p of pathsToTry) {
      try {
        const res = await fetch(p);
        if (res.ok) { svgText = await res.text(); break; }
      } catch { /* try next */ }
    }

    if (!svgText) {
      console.warn(`[shapeMorpher] Could not fetch SVG for "${iconName}"`);
      shapePixelCache[iconName] = null;
      if (loadQueue[iconName]) {
        loadQueue[iconName].forEach(cb => cb());
        delete loadQueue[iconName];
      }
      return;
    }

    processSvgText(iconName, svgText);
  })();
}

// ---------------------------------------------------------------------------
// Shape parameter sampling (used by shapeBaker)
// ---------------------------------------------------------------------------
export function getShapeParams(
  shape: string,
  y: number,
  maxShapeSize: number,
): { w: number; offsetX: number }[] {
  // Math shapes
  if (shape === 'Square' || shape === 'square') {
    if (y < 0 || y > maxShapeSize) return [];
    return [{ w: maxShapeSize, offsetX: 0 }];
  }
  if (shape === 'Circle' || shape === 'circle') {
    const r = maxShapeSize / 2;
    if (y < 0 || y > 2 * r) return [];
    const d = Math.abs(r - y);
    const half = Math.sqrt(Math.max(0, r * r - d * d));
    return [{ w: Math.max(1, 2 * half), offsetX: 0 }];
  }
  if (shape === 'Triangle' || shape === 'triangle') {
    const h = (Math.sqrt(3) / 2) * maxShapeSize;
    if (y < 0 || y > h) return [];
    return [{ w: Math.max(1, (y / h) * maxShapeSize), offsetX: 0 }];
  }

  // Pixel-cache shapes
  const cache = shapePixelCache[shape];
  if (cache && cache !== 'loading' && cache !== 'math' && Array.isArray(cache)) {
    const maskY    = Math.max(0, Math.min(MASK_RESOLUTION - 1, Math.round((y / maxShapeSize) * (MASK_RESOLUTION - 1))));
    const segments = cache[maskY];
    if (segments && segments.length > 0) {
      return segments.map((seg: { w: number; xOffset: number }) => ({
        w:       (seg.w       / MASK_RESOLUTION) * maxShapeSize,
        offsetX: (seg.xOffset / MASK_RESOLUTION) * maxShapeSize,
      }));
    }
  }
  return [];
}

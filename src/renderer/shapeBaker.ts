import { getShapeParams } from './shapeMorpher';
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext';

export interface ShapeCell {
  id: number;
  x: number;
  y: number;
  char: string;
  isActive: boolean;
  isTarget: boolean;
  isSpace: boolean;
}

export function bakeShapeLayout(
  shape: string, 
  sourceText: string, 
  maxShapeSize: number, 
  fontSize: number
): { cells: ShapeCell[], totalTargetChars: number } {
  const font = `900 ${fontSize}px "Fira Code", monospace`;
  
  const prepared = prepareWithSegments(sourceText, font);
  
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let currentY = 0;
  
  const cells: ShapeCell[] = [];
  let cellId = 0;
  
  // We need to measure character width. Since we don't have canvas context, we can approximate 
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.font = font;
  const charWidth = tempCtx.measureText('a').width;

  while (currentY <= maxShapeSize && cursor.graphemeIndex < sourceText.length) {
    const targetParams = getShapeParams(shape, currentY, maxShapeSize);
    
    for (let i = 0; i < targetParams.length; i++) {
      const targS = targetParams[i];
      if (targS.w <= 5) continue;
      
      const line = layoutNextLine(prepared, cursor, targS.w);
      if (!line) break;
      
      // Center-align text within the shape's segment boundary for a more beautiful, balanced look
      const textWidth = line.text.length * charWidth;
      const xStart = targS.offsetX - (targS.w / 2) + Math.max(0, (targS.w - textWidth) / 2);
      
      let currentX = xStart;
      let isFirstCharOnLine = true;
      for (const char of line.text) {
        if (isFirstCharOnLine && char === ' ') {
          // Skip leading spaces to avoid ragged left edges
          continue;
        }
        isFirstCharOnLine = false;
        
        cells.push({
          id: cellId++,
          x: currentX,
          y: currentY,
          char: char,
          isActive: true,
          isTarget: false,
          isSpace: char === ' '
        });
        currentX += charWidth;
      }
      
      cursor = line.end;
      if (cursor.graphemeIndex >= sourceText.length) break;
    }
    currentY += Math.floor(fontSize * 1.5);
  }
  
  return { cells, totalTargetChars: cells.length };
}

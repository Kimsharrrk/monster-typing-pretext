import { getShapeParams } from './shapeMorpher';

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
  fontSize: number,
  strict: boolean = true
): { cells: ShapeCell[], totalTargetChars: number } {
  const font = `900 ${fontSize}px "Fira Code", monospace`;
  
  let currentY = 0;
  
  const cells: ShapeCell[] = [];
  let cellId = 0;
  
  // We need to measure character width. Since we don't have canvas context, we can approximate 
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.font = font;
  const charWidth = tempCtx.measureText('a').width;

  // Split sourceText into words, keeping trailing spaces
  // e.g. "hero brave " -> ["hero ", "brave "]
  const words = sourceText.match(/\S+\s*/g) || [sourceText];
  let wordIdx = 0;

  while (currentY <= maxShapeSize && wordIdx < words.length) {
    const targetParams = getShapeParams(shape, currentY, maxShapeSize);
    
    for (let i = 0; i < targetParams.length; i++) {
      const targS = targetParams[i];
      if (targS.w <= charWidth) continue; // Skip tiny segments
      
      let segmentRemainingWidth = targS.w;
      let segmentText = '';
      
      // Try to fit as many words as possible into this segment
      while (wordIdx < words.length) {
        const nextWord = words[wordIdx];
        const nextWordWidth = nextWord.length * charWidth;
        
        if (segmentRemainingWidth >= nextWordWidth) {
           segmentText += nextWord;
           segmentRemainingWidth -= nextWordWidth;
           wordIdx++;
        } else if (segmentText.length === 0 && nextWordWidth > targS.w) {
           // The word is larger than this entire segment.
           const maxChars = Math.floor(targS.w / charWidth);
           const requiredChars = strict ? 3 : 1;
           if (maxChars >= requiredChars) {
             const fitPart = nextWord.substring(0, maxChars);
             const overflowPart = nextWord.substring(maxChars);
             segmentText += fitPart;
             words[wordIdx] = overflowPart; // Keep the rest for the next segment
             break;
           } else {
             // We break here and try the next segment or line!
             break;
           }
        } else {
           // Word doesn't fit in the remaining space of this segment, move to next segment/line
           break;
        }
      }
      
      if (segmentText.length > 0) {
        // Center-align text within the shape's segment boundary for a more balanced look.
        // We trim trailing spaces from the measurement so the visible letters are centered.
        const trimmedText = segmentText.trimEnd();
        const textWidth = trimmedText.length * charWidth;
        const xStart = targS.offsetX - (targS.w / 2) + Math.max(0, (targS.w - textWidth) / 2);
        
        let currentX = xStart;
        for (const char of segmentText) {
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
      }
      
      if (wordIdx >= words.length) break;
    }
    currentY += Math.floor(fontSize * 1.5);
  }
  
  return { cells, totalTargetChars: cells.length };
}

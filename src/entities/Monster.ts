import { initMorpher, loadShapePixels } from '../renderer/shapeMorpher';
import { bakeShapeLayout, type ShapeCell } from '../renderer/shapeBaker';

export class Monster {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  
  font: string = '20px "Press Start 2P", monospace';
  fontSize: number = 16;
  
  baseText: string;
  fullText: string; 
  typeIndex: number = 0;
  
  targetShape: string = 'Square';
  isLoaded: boolean = false;
  
  cells: ShapeCell[] = [];
  
  isDeadState: boolean = false;
  maxHp: number = 0;
  hp: number = 0;

  constructor(id: number, x: number, y: number, baseText: string) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = 400;
    this.height = 400;
    
    this.baseText = baseText + " ";
    this.fullText = Array(20).fill(this.baseText).join('');
    
    initMorpher();
  }
  
  changeShape(newShape: string, newText: string) {
    this.isLoaded = false;
    this.targetShape = newShape;
    this.baseText = newText + " ";
    this.fullText = Array(20).fill(this.baseText).join('');
    this.typeIndex = 0;
    
    loadShapePixels(newShape, () => {
      const baked = bakeShapeLayout(newShape, this.fullText, this.width, this.fontSize);
      this.cells = baked.cells;
      this.maxHp = baked.totalTargetChars;
      this.hp = this.maxHp;
      this.isLoaded = true;
      this.isDeadState = false;
      this.updateTargetHighlight();
    });
  }

  updateTargetHighlight() {
    for (const cell of this.cells) {
      cell.isTarget = false;
    }
    
    if (this.typeIndex < this.cells.length) {
      this.cells[this.typeIndex].isTarget = true;
    } else {
      this.isDeadState = true;
    }
  }

  update(_dt: number) {
  }

  isDead() {
    return this.isDeadState || this.hp <= 0;
  }
  
  getCurrentTargetChar(): string | null {
    if (!this.isLoaded || this.typeIndex >= this.cells.length) return null;
    return this.cells[this.typeIndex].char;
  }
  
  hitChar(char: string): ShapeCell | null {
    if (!this.isLoaded || this.typeIndex >= this.cells.length) return null;
    
    const targetCell = this.cells[this.typeIndex];
    if (targetCell.char === char) {
      targetCell.isActive = false;
      this.typeIndex++;
      this.hp--;
      
      if (this.hp <= 0 || this.typeIndex >= this.cells.length) {
        this.isDeadState = true;
      }
      this.updateTargetHighlight();
      return targetCell;
    }
    return null;
  }
}

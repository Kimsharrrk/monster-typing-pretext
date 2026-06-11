import { bakeShapeLayout, type ShapeCell } from '../renderer/shapeBaker';

export class Projectile {
  x: number;
  y: number;
  vy: number;
  word: string;
  typeIndex: number = 0;
  isDead: boolean = false;
  damage: number = 5;
  cells: ShapeCell[] = [];

  constructor(x: number, y: number, word: string, shape: string, vy: number) {
    this.x = x;
    this.y = y;
    this.word = word;
    this.vy = vy;
    
    // Repeat word to fill the shape
    const repeatedWord = (word + " ").repeat(100);
    const baked = bakeShapeLayout(shape, repeatedWord, 160, 6);
    this.cells = baked.cells;
  }

  update(dt: number) {
    this.y += this.vy * dt;
  }

  hitChar(char: string): boolean {
    if (this.word[this.typeIndex] === char) {
      // Mark the cell as typed
      if (this.cells[this.typeIndex]) {
        this.cells[this.typeIndex].isTarget = true; // reusing isTarget for 'typed'
      }
      this.typeIndex++;
      if (this.typeIndex >= this.word.length) {
        this.isDead = true;
      }
      return true;
    }
    return false;
  }
}

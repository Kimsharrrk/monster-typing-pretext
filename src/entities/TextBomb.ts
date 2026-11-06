export class TextBomb {
  x: number;
  y: number;
  radius: number;
  word: string;
  typeIndex: number = 0;
  isDead: boolean = false;
  hasDealtDamage: boolean = false;
  timer: number;
  maxTimer: number;

  constructor(x: number, y: number, word: string, timeMs: number) {
    this.x = x;
    this.y = y;
    this.word = word;
    this.timer = timeMs;
    this.maxTimer = timeMs;
    this.radius = 20;
  }

  update(dt: number) {
    this.timer -= dt;
    // Radius grows as timer goes down (from 20 to 200)
    const progress = 1 - Math.max(0, this.timer / this.maxTimer);
    this.radius = 20 + progress * 180; 

    if (this.timer <= 0) {
      this.isDead = true;
    }
  }

  hitChar(char: string): boolean {
    if (this.timer <= 0) return false;
    if (this.word[this.typeIndex] === char) {
      this.typeIndex++;
      if (this.typeIndex >= this.word.length) {
        this.isDead = true;
      }
      return true;
    }
    return false;
  }
}

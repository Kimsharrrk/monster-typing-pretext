export class AlphabetExplosion {
  chars: { char: string, x: number, y: number, isDead: boolean }[] = [];
  timer: number;
  maxTimer: number;
  isDead: boolean = false;
  hasDealtDamage: boolean = false;

  constructor(letters: string[], w: number, h: number) {
    this.timer = 4000; // 4 seconds to type 5 letters
    this.maxTimer = 4000;
    
    // Spread them around the screen randomly
    letters.forEach((char) => {
      this.chars.push({
        char,
        x: 100 + Math.random() * (w - 200),
        y: 100 + Math.random() * (h - 200),
        isDead: false
      });
    });
  }

  update(dt: number) {
    this.timer -= dt;
    if (this.chars.every(c => c.isDead) || this.timer <= 0) {
      this.isDead = true;
    }
  }

  hitChar(char: string): boolean {
    if (this.timer <= 0) return false;
    
    // Must hit the FIRST non-dead char in sequence
    const active = this.chars.find(c => !c.isDead);
    if (active && active.char.toLowerCase() === char.toLowerCase()) {
      active.isDead = true;
      return true;
    }
    return false;
  }
}

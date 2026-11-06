export class WordShieldPiece {
  word: string;
  typeIndex: number = 0;
  isDead: boolean = false;
  angle: number;
  distance: number;
  
  constructor(word: string, angle: number, distance: number) {
    this.word = word;
    this.angle = angle;
    this.distance = distance;
  }
  
  hitChar(char: string): boolean {
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

export class WordShield {
  pieces: WordShieldPiece[] = [];
  rotation: number = 0;
  isDead: boolean = false;

  constructor(words: string[]) {
    const angleStep = (Math.PI * 2) / words.length;
    words.forEach((w, i) => {
      this.pieces.push(new WordShieldPiece(w, i * angleStep, 150));
    });
  }

  update(dt: number) {
    // 0.5 radians per second
    this.rotation += (dt / 1000) * 0.5; 
    
    this.pieces = this.pieces.filter(p => !p.isDead);
    if (this.pieces.length === 0) {
      this.isDead = true;
    }
  }

  hitChar(char: string): boolean {
    // If we are already typing a piece, we MUST continue it, 
    // or we can allow switching? Usually typing games allow switching if they don't lock.
    // For simplicity and less frustration, let's just find the first piece that matches.
    // Prioritize pieces that are already partially typed.
    for (const p of this.pieces) {
      if (p.typeIndex > 0) {
        if (p.hitChar(char)) return true;
      }
    }
    for (const p of this.pieces) {
      if (p.typeIndex === 0 && p.hitChar(char)) return true;
    }
    return false;
  }
}

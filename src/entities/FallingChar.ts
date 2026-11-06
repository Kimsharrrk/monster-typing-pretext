export class FallingChar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  isDead: boolean = false;
  damage: number = 10;

  constructor(x: number, y: number, targetX: number, targetY: number, char: string) {
    this.x = x;
    this.y = y;
    this.char = char;
    
    // Calculate velocity towards target
    const speed = 100 + Math.random() * 50; // Random speed between 100-150
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  color: string;
  font: string;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;

  constructor(x: number, y: number, char: string, color: string, font: string) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 100;
    this.vy = -50 - Math.random() * 50;
    this.char = char;
    this.color = color;
    this.font = font;
    this.maxLife = 1 + Math.random();
    this.life = this.maxLife;
    this.rotation = 0;
    this.vRot = (Math.random() - 0.5) * 10;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 300 * dt; // gravity
    this.life -= dt;
    this.rotation += this.vRot * dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.font = this.font;
    ctx.fillText(this.char, 0, 0);
    ctx.restore();
  }
}

export class DamagePopup {
  x: number;
  y: number;
  amount: number;
  life: number;
  maxLife: number;
  vy: number;
  
  constructor(x: number, y: number, amount: number) {
    this.x = x + (Math.random() - 0.5) * 40;
    this.y = y;
    this.amount = amount;
    this.maxLife = 1.0;
    this.life = this.maxLife;
    this.vy = -100;
  }
  
  update(dt: number) {
    this.y += this.vy * dt;
    this.vy += 200 * dt; // gravity
    this.life -= dt;
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = '#ef4444'; // Red damage
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.font = '24px "Press Start 2P", monospace';
    const text = `-${this.amount}`;
    ctx.strokeText(text, this.x, this.y);
    ctx.fillText(text, this.x, this.y);
    ctx.restore();
  }
}

import { Monster } from '../entities/Monster';
import { Particle, DamagePopup } from '../entities/Particle';

export class CanvasRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  
  boxWidth: number = 0;
  boxHeight: number = 250;
  boxX: number = 0;
  boxY: number = 0;

  constructor(canvasId: string) {
    const el = document.getElementById(canvasId);
    if (!el || !(el instanceof HTMLCanvasElement)) {
      throw new Error('Canvas not found');
    }
    this.canvas = el;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resize();
    
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    this.boxWidth = Math.min(800, this.width - 40);
    this.boxX = (this.width - this.boxWidth) / 2;
    this.boxY = this.height - this.boxHeight - 100;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
  
  renderCombatBox(bossDialog: string, inputText: string, isSkillMode: boolean, boss: Monster | null) {
    this.ctx.save();
    
    this.ctx.lineWidth = 6;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.fillStyle = '#000000';
    
    this.ctx.beginPath();
    this.ctx.rect(this.boxX, this.boxY, this.boxWidth, this.boxHeight);
    this.ctx.fill();
    this.ctx.stroke();
    
    const pad = 30;
    let y = this.boxY + pad;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px "Press Start 2P", monospace';
    this.ctx.textBaseline = 'top';
    
    if (bossDialog && (!boss || !boss.isLoaded)) {
      this.ctx.fillText("* " + bossDialog, this.boxX + pad, y);
      y += 50;
    }

    if (boss && boss.isLoaded) {
      this.ctx.font = '18px "Fira Code", monospace';
      
      const localIdx = boss.typeIndex % boss.baseText.length;
      
      let curX = this.boxX + pad;
      let curY = y;
      const lineHeight = 28;
      
      const words = boss.baseText.split(/(\s+)/); // keep spaces
      
      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        const wordWidth = this.ctx.measureText(word).width;
        
        if (curX + wordWidth > this.boxX + this.boxWidth - pad && word.trim() !== '') {
          curX = this.boxX + pad;
          curY += lineHeight;
        }
        
        // Let's find the absolute index for each character in this word to color it
        // We need to keep track of the absolute index in baseText
        // A simpler way: just iterate by characters and word-wrap by checking next space distance
      }
      
      // Simpler character-by-character wrap that looks ahead for word length
      curX = this.boxX + pad;
      curY = y;
      
      let i = 0;
      while (i < boss.baseText.length) {
        // Measure next word length
        let nextSpace = boss.baseText.indexOf(' ', i);
        if (nextSpace === -1) nextSpace = boss.baseText.length;
        const nextWord = boss.baseText.substring(i, nextSpace);
        const nextWordWidth = this.ctx.measureText(nextWord).width;
        
        if (curX + nextWordWidth > this.boxX + this.boxWidth - pad && curX > this.boxX + pad) {
           curX = this.boxX + pad;
           curY += lineHeight;
        }
        
        // Draw character
        const char = boss.baseText[i];
        
        if (i < localIdx) {
          this.ctx.fillStyle = '#60a5fa'; // Blue for typed
        } else if (i === localIdx) {
          this.ctx.fillStyle = '#a3e635'; // Green for current
          
          // Draw a small underline or background for the current character
          this.ctx.fillRect(curX, curY + 20, this.ctx.measureText(char).width, 4);
        } else {
          this.ctx.fillStyle = '#d1d5db'; // Light gray for future
        }
        
        let displayChar = char;
        if (char === ' ' && i === localIdx) {
           displayChar = '_';
        }
        
        this.ctx.fillText(displayChar, curX, curY);
        curX += this.ctx.measureText(char).width;
        i++;
      }
      
      y = curY + 40; // Push input text down
    }
    
    this.ctx.fillStyle = isSkillMode ? '#ef4444' : '#ffffff';
    this.ctx.font = '24px "Press Start 2P", monospace';
    const prefix = isSkillMode ? 'CASTING > ' : '> ';
    
    // Draw input area near the bottom of the box
    this.ctx.fillText(prefix + inputText + '_', this.boxX + pad, this.boxY + this.boxHeight - pad - 24);
    
    this.ctx.restore();
  }

  renderUndertaleUI(now: number, isSkillMode: boolean) {
    this.ctx.save();
    const btnWidth = 150;
    const btnHeight = 50;
    const gap = (this.boxWidth - (btnWidth * 4)) / 3;
    const startX = this.boxX;
    const btnY = this.boxY + this.boxHeight + 20;

    const labels = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];
    
    this.ctx.font = '20px "Press Start 2P", monospace';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';

    for (let i = 0; i < 4; i++) {
      const bx = startX + i * (btnWidth + gap);
      
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = '#f97316';
      if (i === 0 && !isSkillMode) {
        this.ctx.strokeStyle = '#eab308';
      } else if (i === 1 && isSkillMode) {
        this.ctx.strokeStyle = '#eab308';
      }
      this.ctx.strokeRect(bx, btnY, btnWidth, btnHeight);
      
      this.ctx.fillStyle = '#f97316';
      if ((i === 0 && !isSkillMode) || (i === 1 && isSkillMode)) {
        this.ctx.fillStyle = '#eab308';
      }
      this.ctx.fillText(labels[i], bx + btnWidth / 2, btnY + btnHeight / 2);
    }

    const heartActive = Math.sin(now / 150) > 0;
    if (heartActive) {
      this.ctx.fillStyle = '#ef4444';
      const activeIdx = isSkillMode ? 1 : 0;
      const bx = startX + activeIdx * (btnWidth + gap);
      this.ctx.font = '20px "Press Start 2P", monospace';
      this.ctx.fillText("❤", bx + 15, btnY + btnHeight / 2);
    }
    this.ctx.restore();
  }

  renderMonster(boss: Monster, now: number) {
    if (!boss.isLoaded) return;

    this.ctx.save();
    
    const hoverY = Math.sin(now / 500) * 15;
    const cx = this.width / 2;
    const cy = 250 + hoverY; 
    
    boss.x = cx;
    boss.y = cy;
    
    const maxShapeSize = boss.width;
    const shapeTop = cy - maxShapeSize / 2;
    
    const font = `900 ${boss.fontSize}px "Fira Code", monospace`;
    this.ctx.font = font;
    this.ctx.textBaseline = 'top';
    
    for (const cell of boss.cells) {
      if (!cell.isActive) {
        continue; 
      }
      
      let drawChar = cell.char;
      if (cell.isSpace) {
        if (cell.isTarget) drawChar = '_';
        else continue;
      }
      
      if (cell.isTarget) {
        this.ctx.fillStyle = '#a3e635'; 
        this.ctx.shadowColor = '#a3e635';
        this.ctx.shadowBlur = 10;
        
        const scale = 1 + Math.sin(now / 100) * 0.1;
        this.ctx.save();
        this.ctx.translate(cx + cell.x + 8, shapeTop + cell.y + 8);
        this.ctx.scale(scale, scale);
        this.ctx.fillText(drawChar, -8, -8);
        this.ctx.restore();
        
      } else {
        this.ctx.fillStyle = '#ffffff'; 
        this.ctx.shadowBlur = 0;
        this.ctx.fillText(drawChar, cx + cell.x, shapeTop + cell.y);
      }
    }
    
    this.ctx.restore();
    
    this.ctx.save();
    const hpWidth = 300;
    const hpHeight = 20;
    const hpX = (this.width - hpWidth) / 2;
    const hpY = 20;
    
    const hpPercent = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
    
    this.ctx.fillStyle = '#ef4444';
    this.ctx.fillRect(hpX, hpY, hpWidth, hpHeight);
    this.ctx.fillStyle = '#a3e635';
    this.ctx.fillRect(hpX, hpY, hpWidth * hpPercent, hpHeight);
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(hpX, hpY, hpWidth, hpHeight);
    this.ctx.restore();
  }

  renderParticles(particles: Particle[]) {
    for (const p of particles) {
      p.draw(this.ctx);
    }
  }

  renderDamagePopups(popups: DamagePopup[]) {
    for (const p of popups) {
      p.draw(this.ctx);
    }
  }
}

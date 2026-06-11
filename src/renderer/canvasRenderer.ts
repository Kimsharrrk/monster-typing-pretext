import { Monster } from '../entities/Monster';
import { Particle, DamagePopup } from '../entities/Particle';
import { Projectile } from '../entities/Projectile';

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
    this.boxY = this.height - this.boxHeight - 120; // Lifted up to prevent HP bar cutoff
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
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px "Press Start 2P", monospace';
    this.ctx.textBaseline = 'top';
    this.ctx.textAlign = 'left';
    
    let y = this.boxY + 20;
    const pad = 20;
    
    // Always draw bossDialog
    if (bossDialog) {
      this.ctx.fillText("* " + bossDialog, this.boxX + pad, y);
      y += 40;
    }
    
    if (boss && boss.isLoaded) {
      this.ctx.font = '18px "Fira Code", monospace';
      
      let curX = this.boxX + pad;
      let curY = y;
      const lineHeight = 28;
      
      if (boss.chapter === 1 && !boss.wordMode) {
        const targetChar = boss.getCurrentTargetChar();
        if (targetChar !== null) {
          this.ctx.save();
          
          const keyW = 180;
          const keyH = 80;
          const keyX = this.boxX + (this.boxWidth - keyW) / 2;
          const keyY = y + 20;
          
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 4;
          this.ctx.strokeRect(keyX, keyY, keyW, keyH);
          this.ctx.fillStyle = '#1e1e2e';
          this.ctx.fillRect(keyX, keyY, keyW, keyH);
          
          this.ctx.font = 'bold 28px "Press Start 2P", monospace';
          this.ctx.fillStyle = '#a3e635';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          
          const displayChar = targetChar === ' ' ? 'SPACE' : targetChar;
          this.ctx.fillText(displayChar, this.boxX + this.boxWidth / 2, keyY + keyH / 2);
          
          this.ctx.font = '12px "Press Start 2P", monospace';
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillText("TYPE THIS KEY", this.boxX + this.boxWidth / 2, y);
          this.ctx.restore();
        }
      } else if (boss.wordMode) {
        for (const group of boss.wordGroups) {
          const wordText = group.text;
          const wordWidth = this.ctx.measureText(wordText + " ").width;
          
          if (curX + wordWidth > this.boxX + this.boxWidth - pad && curX > this.boxX + pad) {
             curX = this.boxX + pad;
             curY += lineHeight;
          }
          
          let charX = curX;
          for (let i = 0; i < wordText.length; i++) {
            const char = wordText[i];
            
            if (group.isCompleted) {
              this.ctx.fillStyle = '#4b5563'; // Faded gray for completed
            } else if (boss.activeCandidateIds.includes(group.id)) {
              if (i < group.typeIndex) {
                this.ctx.fillStyle = '#60a5fa'; // Blue for typed characters
              } else if (i === group.typeIndex) {
                this.ctx.fillStyle = '#a3e635'; // Green for active character
                this.ctx.fillRect(charX, curY + 20, this.ctx.measureText(char).width, 4);
              } else {
                this.ctx.fillStyle = '#ffffff'; // White for remaining
              }
            } else {
              this.ctx.fillStyle = '#ffffff'; // Untouched words are white
            }
            
            this.ctx.fillText(char, charX, curY);
            charX += this.ctx.measureText(char).width;
          }
          
          curX += wordWidth;
        }
      } else {
        const localIdx = boss.typeIndex % boss.baseText.length;
        let i = 0;
        while (i < boss.baseText.length) {
          // Measure next word length for word wrap
          let nextSpace = boss.baseText.indexOf(' ', i);
          if (nextSpace === -1) nextSpace = boss.baseText.length;
          const nextWord = boss.baseText.substring(i, nextSpace);
          const nextWordWidth = this.ctx.measureText(nextWord).width;
          
          if (curX + nextWordWidth > this.boxX + this.boxWidth - pad && curX > this.boxX + pad) {
             curX = this.boxX + pad;
             curY += lineHeight;
          }
          
          const char = boss.baseText[i];
          
          if (i < localIdx) {
            this.ctx.fillStyle = '#60a5fa';
          } else if (i === localIdx) {
            this.ctx.fillStyle = '#a3e635';
            this.ctx.fillRect(curX, curY + 20, this.ctx.measureText(char).width, 4);
          } else {
            this.ctx.fillStyle = '#d1d5db';
          }
          
          let displayChar = char;
          if (char === ' ' && i === localIdx) {
             displayChar = '_';
          }
          
          this.ctx.fillText(displayChar, curX, curY);
          curX += this.ctx.measureText(char).width;
          i++;
        }
      }
    }
    
    this.ctx.fillStyle = isSkillMode ? '#ef4444' : '#ffffff';
    this.ctx.font = '24px "Press Start 2P", monospace';
    const prefix = isSkillMode ? 'CASTING > ' : '> ';
    
    // Draw input area near the bottom of the box
    this.ctx.fillText(prefix + inputText + '_', this.boxX + pad, this.boxY + this.boxHeight - pad - 24);
    
    this.ctx.restore();
  }

  renderUndertaleUI(now: number, activeMenu: string) {
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
      const isActive = labels[i] === activeMenu;
      
      this.ctx.lineWidth = isActive ? 4 : 2;
      this.ctx.strokeStyle = isActive ? '#fbbf24' : '#f97316';
      this.ctx.strokeRect(bx, btnY, btnWidth, btnHeight);
      
      this.ctx.fillStyle = isActive ? '#fbbf24' : '#f97316';
      this.ctx.fillText(labels[i], bx + btnWidth / 2, btnY + btnHeight / 2);
    }

    const heartActive = Math.sin(now / 150) > 0;
    if (heartActive) {
      this.ctx.fillStyle = '#ef4444';
      const activeIdx = labels.indexOf(activeMenu);
      if (activeIdx !== -1) {
        const bx = startX + activeIdx * (btnWidth + gap);
        this.ctx.font = '20px "Press Start 2P", monospace';
        this.ctx.fillText("❤", bx + 20, btnY + btnHeight / 2);
      }
    }
    this.ctx.restore();
  }
  
  renderPlayerHp(playerHp: number, playerMaxHp: number, level: number, exp: number, maxExp: number, shieldCount: number = 0) {
    this.ctx.save();
    
    // Position it at the bottom center, below the action buttons
    const hpWidth = 300;
    const hpHeight = 20;
    const hpX = (this.width - hpWidth) / 2;
    const hpY = this.boxY + this.boxHeight + 90;
    
    const hpPercent = Math.max(0, playerHp / playerMaxHp);
    
    this.ctx.fillStyle = '#ef4444'; // Red background
    this.ctx.fillRect(hpX, hpY, hpWidth, hpHeight);
    
    this.ctx.fillStyle = '#eab308'; // Yellow/Green foreground for player HP
    this.ctx.fillRect(hpX, hpY, hpWidth * hpPercent, hpHeight);
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(hpX, hpY, hpWidth, hpHeight);
    
    // EXP Bar
    const expY = hpY + hpHeight + 5;
    const expHeight = 6;
    const expPercent = Math.max(0, exp / maxExp);
    this.ctx.fillStyle = '#4b5563'; // Gray background
    this.ctx.fillRect(hpX, expY, hpWidth, expHeight);
    this.ctx.fillStyle = '#60a5fa'; // Blue foreground
    this.ctx.fillRect(hpX, expY, hpWidth * expPercent, expHeight);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px "Press Start 2P", monospace';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`LV ${level}   HP ${Math.floor(playerHp)}/${playerMaxHp}`, hpX - 20, hpY + hpHeight / 2);
    
    if (shieldCount > 0) {
      this.ctx.fillStyle = '#38bdf8'; // light blue shield text
      this.ctx.font = '12px "Press Start 2P", monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`SHIELD x${shieldCount} 🛡️`, hpX + hpWidth + 15, hpY + hpHeight / 2);
    }
    
    this.ctx.restore();
  }
  
  renderOpponentInfo(hp: number, score: number) {
    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px "Press Start 2P", monospace';
    this.ctx.textBaseline = 'top';
    this.ctx.textAlign = 'right';
    
    // Draw in top right corner
    this.ctx.fillText("OPPONENT (PVP)", this.width - 20, 20);
    this.ctx.fillText(`SCORE: ${score}`, this.width - 20, 45);
    
    const hpWidth = 150;
    const hpHeight = 15;
    const hpX = this.width - 20 - hpWidth;
    const hpY = 70;
    
    this.ctx.fillStyle = '#ef4444';
    this.ctx.fillRect(hpX, hpY, hpWidth, hpHeight);
    
    const hpPercent = Math.max(0, hp / 100);
    this.ctx.fillStyle = '#a3e635';
    this.ctx.fillRect(hpX + hpWidth * (1 - hpPercent), hpY, hpWidth * hpPercent, hpHeight);
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(hpX, hpY, hpWidth, hpHeight);
    
    this.ctx.restore();
  }

  renderMonster(boss: Monster, now: number, attackMotion: number = 0) {
    if (!boss.isLoaded) return;

    this.ctx.save();
    
    // Attack motion (dash forward)
    let attackZ = 0;
    if (attackMotion > 0) {
      // 0.2s duration. Math.sin to make it go forward and back
      const progress = attackMotion / 0.2; // 1 to 0
      attackZ = Math.sin(progress * Math.PI) * 100; // dashes up to 100px forward
    }
    
    const hoverY = Math.sin(now / 500) * 15;
    const cx = this.width / 2;
    const cy = 250 + hoverY + attackZ; // dash towards player (downwards visually) 
    
    boss.x = cx;
    boss.y = cy;
    
    const maxShapeSize = boss.width;
    const shapeTop = cy - maxShapeSize / 2;
    
    // Draw background silhouette
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.font = '10px "Fira Code", monospace';
    this.ctx.textAlign = 'center';
    for (const bgCell of boss.bgCells || []) {
      if (!bgCell.isSpace) {
        this.ctx.fillText('■', cx + bgCell.x, shapeTop + bgCell.y);
      }
    }
    
    const font = `900 ${boss.fontSize}px "Fira Code", monospace`;
    this.ctx.font = font;
    this.ctx.textBaseline = 'top';
    this.ctx.textAlign = 'left';
    
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

  renderProjectiles(projectiles: Projectile[]) {
    this.ctx.save();
    
    for (const p of projectiles) {
      const shapeTop = p.y - 80; // maxShapeSize is 160, center vertically
      
      // 1. Draw shape silhouette (faint)
      this.ctx.font = '6px "Fira Code", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (const cell of p.cells) {
        if (!cell.isSpace) {
          this.ctx.fillText('■', p.x + cell.x, shapeTop + cell.y);
        }
      }
      
      // 2. Draw the word largely over the center
      this.ctx.font = '24px "Press Start 2P", monospace';
      this.ctx.textBaseline = 'middle';
      
      const typed = p.word.substring(0, p.typeIndex);
      const remaining = p.word.substring(p.typeIndex);
      
      // To center the combined text, we calculate the total width
      const typedWidth = this.ctx.measureText(typed).width;
      const remainingWidth = this.ctx.measureText(remaining).width;
      const totalWidth = typedWidth + remainingWidth;
      
      const startX = p.x - totalWidth / 2;
      
      // Draw typed part
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = '#60a5fa'; // Blue
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#60a5fa';
      this.ctx.fillText(typed, startX, p.y);
      
      // Draw remaining part
      this.ctx.fillStyle = '#ef4444'; // Red
      this.ctx.shadowBlur = 0;
      this.ctx.fillText(remaining, startX + typedWidth, p.y);
    }
    
    this.ctx.restore();
  }

  renderDamagePopups(popups: DamagePopup[]) {
    for (const p of popups) {
      p.draw(this.ctx);
    }
  }

  renderMenu(_now: number) {
    this.ctx.save();
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    
    // Title
    this.ctx.font = '60px "Press Start 2P", monospace';
    this.ctx.fillText("MONSTER", this.width / 2, this.height / 3 - 40);
    this.ctx.fillStyle = '#ef4444';
    this.ctx.fillText("TYPING", this.width / 2, this.height / 3 + 40);
    
    // Options
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px "Press Start 2P", monospace';
    this.ctx.fillText("[1] PRACTICE MODE", this.width / 2, this.height * 2 / 3 - 20);
    this.ctx.fillText("[2] CHALLENGE MODE (ROGUELIKE)", this.width / 2, this.height * 2 / 3 + 20);
    this.ctx.fillText("[3] SETTINGS", this.width / 2, this.height * 2 / 3 + 60);
    
    this.ctx.restore();
  }

  renderStageSelect(_now: number) {
    this.ctx.save();
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    
    this.ctx.font = '30px "Press Start 2P", monospace';
    this.ctx.fillText("SELECT STAGE", this.width / 2, this.height / 3 - 40);
    
    this.ctx.font = '16px "Press Start 2P", monospace';
    this.ctx.fillStyle = '#ffffff';
    
    const startY = this.height / 3 + 20;
    const gap = 35;
    
    this.ctx.fillText("[1] Stage 1: Home Position", this.width / 2, startY);
    this.ctx.fillText("[2] Stage 2: Top & Bottom", this.width / 2, startY + gap);
    this.ctx.fillText("[3] Stage 3: Words", this.width / 2, startY + gap * 2);
    this.ctx.fillText("[4] Stage 4: Sentences", this.width / 2, startY + gap * 3);
    this.ctx.fillText("[5] Stage 5: Long Text Boss", this.width / 2, startY + gap * 4);
    
    this.ctx.fillStyle = '#d1d5db';
    this.ctx.fillText("[ESC] BACK", this.width / 2, startY + gap * 6);
    
    this.ctx.restore();
  }

  renderSettings(_now: number, enableUIAttacks: boolean, difficulty: string) {
    this.ctx.save();
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    
    this.ctx.font = '30px "Press Start 2P", monospace';
    this.ctx.fillText("SETTINGS", this.width / 2, this.height / 3 - 40);
    
    this.ctx.font = '16px "Press Start 2P", monospace';
    
    const startY = this.height / 3 + 40;
    
    this.ctx.fillText("1. UI Attacks (Shake, Flip, Popup):", this.width / 2, startY);
    this.ctx.fillStyle = enableUIAttacks ? '#a3e635' : '#ef4444';
    this.ctx.fillText(`[1] ${enableUIAttacks ? 'ON' : 'OFF'}`, this.width / 2, startY + 30);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText("2. Game Difficulty:", this.width / 2, startY + 80);
    
    let diffColor = '#ffffff';
    if (difficulty === 'EASY') diffColor = '#a3e635';
    if (difficulty === 'HARD') diffColor = '#ef4444';
    
    this.ctx.fillStyle = diffColor;
    this.ctx.fillText(`[2] ${difficulty}`, this.width / 2, startY + 110);
    
    this.ctx.fillStyle = '#d1d5db';
    this.ctx.fillText("[ESC] BACK", this.width / 2, startY + 180);
    
    this.ctx.restore();
  }

  renderGameOver(score: number, now: number) {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#ef4444';
    this.ctx.textAlign = 'center';
    this.ctx.font = '60px "Press Start 2P", monospace';
    this.ctx.fillText("GAME OVER", this.width / 2, this.height / 3);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '30px "Press Start 2P", monospace';
    this.ctx.fillText(`FINAL SCORE: ${score}`, this.width / 2, this.height / 2);
    
    if (Math.floor(now / 500) % 2 === 0) {
      this.ctx.fillStyle = '#a3e635';
      this.ctx.font = '20px "Press Start 2P", monospace';
      this.ctx.fillText("- PRESS [ENTER] TO RETRY -", this.width / 2, this.height * 2 / 3);
    }
    
    this.ctx.restore();
  }

  renderUpgradeScreen(options: { type: string, name: string, description: string }[]) {
    this.ctx.save();
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    
    this.ctx.font = '24px "Press Start 2P", monospace';
    this.ctx.fillText("CHOOSE YOUR UPGRADE", this.width / 2, this.height / 6);
    
    const cardW = 220;
    const cardH = 260;
    const gap = 40;
    const totalW = (cardW * 3) + (gap * 2);
    const startX = (this.width - totalW) / 2;
    const cardY = this.height / 3;
    
    for (let i = 0; i < 3; i++) {
      const opt = options[i];
      if (!opt) continue;
      
      const cx = startX + i * (cardW + gap);
      
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = '#fbbf24'; // Golden
      this.ctx.fillStyle = '#1e1e2e'; // Dark Blue
      
      this.ctx.beginPath();
      this.ctx.roundRect(cx, cardY, cardW, cardH, 12);
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.font = '28px "Press Start 2P", monospace';
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.fillText(`[${i + 1}]`, cx + cardW / 2, cardY + 45);
      
      this.ctx.font = '14px "Press Start 2P", monospace';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(opt.name, cx + cardW / 2, cardY + 100);
      
      this.ctx.font = '12px "Press Start 2P", monospace';
      this.ctx.fillStyle = '#9ca3af';
      
      const descWords = opt.description.split(' ');
      let line = '';
      let descY = cardY + 150;
      const descLineHeight = 18;
      
      for (const word of descWords) {
        const testLine = line + word + ' ';
        const testWidth = this.ctx.measureText(testLine).width;
        if (testWidth > cardW - 30) {
          this.ctx.fillText(line, cx + cardW / 2, descY);
          line = word + ' ';
          descY += descLineHeight;
        } else {
          line = testLine;
        }
      }
      this.ctx.fillText(line, cx + cardW / 2, descY);
    }
    
    this.ctx.restore();
  }
}

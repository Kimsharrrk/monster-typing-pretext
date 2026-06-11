import { GameState, type AttackType } from './state';
import { CanvasRenderer } from '../renderer/canvasRenderer';
import { InputHandler } from './input';
import { Monster } from '../entities/Monster';

export class GameEngine {
  state: GameState;
  renderer: CanvasRenderer;
  input: InputHandler;
  
  lastTime: number = 0;
  running: boolean = false;
  
  nextAttackTime: number = 0;
  
  phase: number = 1;

  constructor() {
    this.state = new GameState();
    this.renderer = new CanvasRenderer('gameCanvas');
    this.input = new InputHandler(this.state);
  }

  start() {
    this.state.bossDialog = "I AM THE SHAPE-SHIFTING BEAST!";
    const p1Text = "Typing is the ultimate weapon. You must type fast and accurately to defeat me. Focus on the green letters and strike them down. Speed is key.";
    this.state.boss = new Monster(1, 0, 0, p1Text);
    this.state.boss.changeShape('Skull', p1Text);
    
    this.running = true;
    this.lastTime = performance.now();
    this.nextAttackTime = this.lastTime + 15000;
    requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
  }

  loop(now: number) {
    if (!this.running) return;
    
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    this.update(dt, now);
    this.draw(now);
    
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt: number, now: number) {
    if (this.state.boss) {
      this.state.boss.update(dt);
      
      // Phase management
      if (this.phase === 1 && this.state.boss.isDeadState && this.state.boss.targetShape === 'Skull') {
        this.phase = 2;
        const p2Text = "Impressive. But can you handle my sword? The blade is sharp and unforgiving. Every mistake will cost you dearly. Keep typing.";
        this.state.boss.changeShape('Sword', p2Text);
        this.state.bossDialog = "YOU FOOL! FEEL MY BLADE!";
      } else if (this.phase === 2 && this.state.boss.isDeadState && this.state.boss.targetShape === 'Sword') {
        this.phase = 3;
        const p3Text = "Flames will consume everything you know. Burn into ashes. Your typing speed will not save you from the inferno. Give up now.";
        this.state.boss.changeShape('Flame', p3Text);
        this.state.bossDialog = "BURN INTO ASHES!";
      }
      
      if (this.phase === 3 && this.state.boss.isDeadState && this.state.boss.targetShape === 'Flame') {
        this.state.bossDialog = "IMPOSSIBLE... I HAVE BEEN DEFEATED...";
      }
    }
    
    for (const p of this.state.particles) {
      p.update(dt);
      const boxTop = this.renderer.boxY;
      if (p.y > boxTop - 20) {
        if (Math.abs(p.vy) > 50) {
          p.vy *= -0.5;
          p.y = boxTop - 20;
        }
      }
    }
    this.state.particles = this.state.particles.filter(p => p.life > 0);
    
    for (const dp of this.state.damagePopups) {
      dp.update(dt);
    }
    this.state.damagePopups = this.state.damagePopups.filter(dp => dp.life > 0);
    
    if (this.state.shakeTimeRemaining > 0) {
      this.state.shakeTimeRemaining -= dt;
    }
    
    if (this.state.boss && !this.state.boss.isDead() && now > this.nextAttackTime) {
      const attacks: AttackType[] = ['shake', 'flip', 'fullscreen', 'popup'];
      const randomAttack = attacks[Math.floor(Math.random() * attacks.length)];
      this.state.pendingAttacks.push(randomAttack);
      
      this.state.bossDialog = `I cast [${randomAttack.toUpperCase()}]! Dodge this!`;
      this.nextAttackTime = now + 10000 + Math.random() * 10000;
    }
  }

  draw(now: number) {
    this.renderer.clear();
    
    const ctx = this.renderer.ctx;
    ctx.save();
    if (this.state.shakeTimeRemaining > 0) {
      const dx = (Math.random() - 0.5) * 10;
      const dy = (Math.random() - 0.5) * 10;
      ctx.translate(dx, dy);
    }
    
    if (this.state.boss) {
      this.renderer.renderMonster(this.state.boss, now);
    }
    
    this.renderer.renderParticles(this.state.particles);
    this.renderer.renderDamagePopups(this.state.damagePopups);
    
    this.renderer.renderCombatBox(this.state.bossDialog, this.state.inputText, this.state.isSkillMode, this.state.boss);
    
    this.renderer.renderUndertaleUI(now, this.state.isSkillMode);
    
    ctx.restore();
    
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`SCORE: ${this.state.score}`, 20, 20);
    ctx.fillText(`COMBO: ${this.state.combo}`, 20, 50);
    ctx.fillText(`WPM: ${this.state.getWPM(now)}`, 20, 80);
    ctx.restore();
  }
}

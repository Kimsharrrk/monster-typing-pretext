import { GameState } from './state';
import { Particle, DamagePopup } from '../entities/Particle';
import { UIAttacks } from '../skills/uiAttacks';

export class InputHandler {
  state: GameState;
  
  constructor(state: GameState) {
    this.state = state;
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      this.triggerPendingAttacks();

      if (e.key === 'Tab') {
        e.preventDefault();
        this.state.isSkillMode = !this.state.isSkillMode;
        this.state.inputText = '';
        return;
      }
      
      if (e.key === 'Backspace') {
        this.state.inputText = this.state.inputText.slice(0, -1);
        return;
      }
      
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.state.isSkillMode && this.state.inputText.trim() !== '') {
          this.executeSkill(this.state.inputText.trim());
          this.state.inputText = '';
          this.state.isSkillMode = false;
        }
        return;
      }

      if (e.key === ' ') {
        e.preventDefault(); // Prevent scrolling
      }

      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) {
        return;
      }
      
      if (this.state.isSkillMode) {
        this.state.inputText += e.key;
      } else {
        // We do not append to inputText for visual, because the boss IS the text.
        // But let's show what was typed briefly.
        this.state.inputText += e.key;
        setTimeout(() => {
          if (!this.state.isSkillMode && this.state.inputText.length > 0) {
             this.state.inputText = this.state.inputText.slice(1);
          }
        }, 300);
        
        this.handleCharHit(e.key);
      }
      
      if (this.state.startTime === 0) {
        this.state.startTime = performance.now();
      }
    });
  }
  
  triggerPendingAttacks() {
    while(this.state.pendingAttacks.length > 0) {
      const attack = this.state.pendingAttacks.pop();
      if (attack === 'fullscreen') {
        UIAttacks.requestFullscreen();
      } else if (attack === 'popup') {
        UIAttacks.popupAttack();
      } else if (attack === 'shake') {
        UIAttacks.shakeScreen();
      } else if (attack === 'flip') {
        UIAttacks.flipScreen();
      }
    }
  }
  
  executeSkill(keyword: string) {
    console.log("Executing skill:", keyword);
    const m = this.state.boss;
    if (!m) return;
    
    // Skill: change shape to whatever user typed!
    const shapeName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    m.changeShape(shapeName, "You used a powerful skill! " + keyword + " ");
    
    this.state.bossDialog = `Aargh! Forced morph into ${shapeName}!`;
    this.state.damagePopups.push(new DamagePopup(m.x, m.y + 50, 50));
    this.state.shakeTimeRemaining = 0.5;
  }

  handleCharHit(char: string) {
    const target = this.state.boss;
    if (!target) return;
    
    const hitRes = target.hitChar(char);
    if (hitRes) {
      const cx = window.innerWidth / 2;
      const cy = 250; 
      const shapeTop = cy - target.width / 2;
      
      const realX = cx + hitRes.x;
      const realY = shapeTop + hitRes.y;

      if (!hitRes.isSpace) {
        this.state.particles.push(new Particle(realX, realY, hitRes.char, '#ffffff', target.font));
        this.state.damagePopups.push(new DamagePopup(realX, realY, 10)); 
      }
      
      this.state.shakeTimeRemaining = 0.05; 
      
      this.state.combo++;
      this.state.score += 10 * (1 + Math.floor(this.state.combo / 10));
      this.state.typedCharsCount++;
      
      if (target.isDead()) {
        this.state.score += 5000;
      }
    } else {
      this.state.resetCombo();
      this.state.shakeTimeRemaining = 0.1;
      
      const expectedChar = target.getCurrentTargetChar();
      if (expectedChar !== null) {
        // Highlight wrong hit
        const cx = window.innerWidth / 2;
        const cy = 250; 
        this.state.damagePopups.push(new DamagePopup(cx, cy, 0)); // MISS
      }
    }
  }
}

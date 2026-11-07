import { GameState } from './state';
import { Particle, DamagePopup } from '../entities/Particle';
import { UIAttacks } from '../skills/uiAttacks';

export class InputHandler {
  state: GameState;
  onStart: () => void;
  onReset: () => void;
  onNextStage: () => void;
  onSelectUpgrade: (type: 'HEAL' | 'MAX_HP' | 'SHIELD' | 'ATTACK' | 'SCORE') => void;

  constructor(
    state: GameState, 
    onStart: () => void, 
    onReset: () => void, 
    onNextStage: () => void,
    onSelectUpgrade: (type: 'HEAL' | 'MAX_HP' | 'SHIELD' | 'ATTACK' | 'SCORE') => void
  ) {
    this.state = state;
    this.onStart = onStart;
    this.onReset = onReset;
    this.onNextStage = onNextStage;
    this.onSelectUpgrade = onSelectUpgrade;
    
    window.addEventListener('keydown', (e) => this.handleKey(e));
  }

  handleKey(e: KeyboardEvent) {
    if (this.state.screen === 'MENU') {
      if (e.key === '1') {
        this.state.gameMode = 'PRACTICE';
        this.state.screen = 'STAGE_SELECT';
      }
      if (e.key === '2') {
        this.state.gameMode = 'CHALLENGE';
        this.onStart();
      }
      if (e.key === '3') {
        this.state.screen = 'SETTINGS';
      }
      return;
    }
    
    if (this.state.screen === 'CHALLENGE_UPGRADE') {
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        const idx = parseInt(e.key) - 1;
        const opt = this.state.upgradeOptions[idx];
        if (opt) {
          this.onSelectUpgrade(opt.type);
        }
      }
      return;
    }
    
    if (this.state.screen === 'STAGE_SELECT') {
      if (e.key === 'Escape') this.state.screen = 'MENU';
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 6) {
        this.state.startingLevel = num;
        this.onStart();
      }
      return;
    }
    
    if (this.state.screen === 'SETTINGS') {
      if (e.key === 'Escape') this.state.screen = 'MENU';
      if (e.key === '1') this.state.enableUIAttacks = !this.state.enableUIAttacks;
      if (e.key === '2') {
        const diffs: ('EASY'|'NORMAL'|'HARD')[] = ['EASY', 'NORMAL', 'HARD'];
        const idx = diffs.indexOf(this.state.difficulty);
        this.state.difficulty = diffs[(idx + 1) % diffs.length];
      }
      return;
    }
    
    if (this.state.screen === 'GAMEOVER') {
      if (e.key === 'Enter') {
        this.onReset();
      }
      return;
    }

    if (this.state.screen === 'PLAYING') {
      if (e.key === 'Escape') {
        this.state.screen = 'MENU';
        return;
      }
      
      if (this.state.stageClearWaiting && e.key === 'Enter') {
        this.onNextStage();
        return;
      }
      if (this.state.stageClearWaiting) return;

      const menus: ('FIGHT' | 'ACT' | 'ITEM' | 'MERCY')[] = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];
      if (e.key === 'ArrowLeft') {
        const idx = menus.indexOf(this.state.activeMenu);
        this.state.activeMenu = menus[(idx - 1 + menus.length) % menus.length];
        this.state.inputText = '';
        return;
      }
      if (e.key === 'ArrowRight') {
        const idx = menus.indexOf(this.state.activeMenu);
        this.state.activeMenu = menus[(idx + 1) % menus.length];
        this.state.inputText = '';
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        
        if (this.state.activeMenu === 'FIGHT') {
          this.handleCharHit(e.key);
          this.state.inputText = e.key.toLowerCase();
          this.state.inputClearTimer = 0.5; // Clear after 500ms
        } else {
          if (e.key.match(/[a-zA-Z]/)) {
            this.state.inputText += e.key.toLowerCase();
          }
        }
      }
      
      if (e.key === 'Backspace') {
        this.state.inputText = this.state.inputText.slice(0, -1);
      }
      
      if (e.key === 'Enter' && this.state.activeMenu !== 'FIGHT') {
        const cmd = this.state.inputText;
        this.state.inputText = '';
        
        if (this.state.activeMenu === 'ITEM') {
          if ((cmd === 'heal' || cmd === 'potion') && this.state.score >= 500) {
            this.state.score -= 500;
            this.state.playerHp = Math.min(this.state.playerMaxHp, this.state.playerHp + 50);
            this.state.bossDialog = "* You drank a Potion! Restored 50 HP. (-500 Score)";
          } else {
            this.state.bossDialog = "* Not enough score (need 500), or unknown item. Type 'heal'.";
          }
        } else if (this.state.activeMenu === 'ACT') {
          if (cmd === 'taunt') {
            this.state.bossDialog = "* You taunted the monster! It is angry!";
          } else if (cmd === 'defend') {
            this.state.bossDialog = "* You take a defensive stance! (Not implemented)";
          } else {
            this.state.bossDialog = "* Unknown action. Try 'taunt' or 'defend'.";
          }
        } else if (this.state.activeMenu === 'MERCY') {
          if (cmd === 'spare') {
            if (this.state.boss && this.state.boss.hp < this.state.boss.maxHp * 0.1) {
              this.state.bossDialog = "* You spared the monster! (+2000 Score)";
              this.state.score += 2000;
              this.state.boss.hp = 0;
              this.state.boss.isDeadState = true;
            } else {
              this.state.bossDialog = "* The monster's HP is too high to spare! (<10% needed)";
            }
          }
        }
      }

      if (this.state.startTime === 0) {
        this.state.startTime = performance.now();
      }
    }
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
      } else if (attack === 'blur') {
        UIAttacks.blurScreen();
      } else if (attack === 'invert') {
        UIAttacks.invertColors();
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
    let hit = false;
    let hitX = window.innerWidth / 2;
    let hitY = 250;
    
    // 1. Alphabet Explosion
    for (const exp of this.state.alphabetExplosions) {
      if (exp.hitChar(char)) {
        hit = true;
        this.state.score += 50;
        const active = exp.chars.find(c => c.isDead); // roughly find recently dead
        if (active) { hitX = active.x; hitY = active.y; }
        break;
      }
    }
    
    // 2. FallingChars (Barrage)
    if (!hit && this.state.isBarrageActive) {
      for (const fc of this.state.fallingChars) {
        if (fc.char === char) {
          hit = true;
          fc.isDead = true;
          this.state.score += 20;
          hitX = fc.x; hitY = fc.y;
          this.state.damagePopups.push(new DamagePopup(hitX, hitY, 0)); // "DEFENDED"
          break;
        }
      }
    }
    
    // 3. Text Bomb
    if (!hit) {
      for (const bomb of this.state.textBombs) {
        if (bomb.hitChar(char)) {
          hit = true;
          this.state.score += 30;
          hitX = bomb.x; hitY = bomb.y;
          break;
        }
      }
    }

    // 4. Word Shield
    if (!hit) {
      for (const shield of this.state.wordShields) {
        if (shield.hitChar(char)) {
          hit = true;
          this.state.score += 40;
          // Approximate hit location for particle
          hitX = window.innerWidth / 2 + 100; hitY = 250;
          break;
        }
      }
    }

    // 5. Projectiles
    if (!hit) {
      let targetProj = this.state.projectiles.find(p => p.typeIndex > 0);
      if (!targetProj) {
          targetProj = this.state.projectiles.find(p => p.word[0] === char);
      }
      if (targetProj && targetProj.hitChar(char)) {
          hit = true;
          hitX = targetProj.x; hitY = targetProj.y;
          if (targetProj.isDead) {
              this.state.score += 100;
              if (targetProj.isHealing) {
                this.state.playerHp = Math.min(this.state.playerMaxHp, this.state.playerHp + 20);
                this.state.damagePopups.push(new DamagePopup(hitX, hitY, 0)); // "HEALED"
                this.state.bossDialog = "* You absorbed the healing orb! (+20 HP)";
              } else {
                this.state.damagePopups.push(new DamagePopup(hitX, hitY, 0)); // "DEFENDED"
              }
          }
      }
    }
    
    // Process particles for non-boss hits
    if (hit) {
      this.state.particles.push(new Particle(hitX, hitY, char, '#ef4444', '20px "Press Start 2P", monospace'));
      this.state.combo++;
      return;
    }

    // 6. Boss
    const target = this.state.boss;
    if (!target) return;
    
    // Disable normal boss typing during barrage
    if (this.state.isBarrageActive) {
      this.state.resetCombo();
      this.state.shakeTimeRemaining = 0.1;
      return;
    }
    
    if (this.state.wordShields.length > 0) {
      // Shield blocks boss damage
      this.state.resetCombo();
      this.state.shakeTimeRemaining = 0.1;
      this.state.damagePopups.push(new DamagePopup(window.innerWidth / 2, 250, 0)); // MISS/BLOCKED
      return;
    }
    
    const hitRes = target.hitChar(char);
    if (hitRes) {
      // Cancel basic attack charge if charging
      if (this.state.bossAttackState === 'CHARGING') {
        this.state.bossAttackState = 'IDLE';
        this.state.bossAttackTimer = 3.0; // Wait 3s before charging again
        this.state.bossDialog = "* You interrupted the attack!";
      }

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
      
      const expectedChars = target.getCurrentTargetChars();
      const expectedChar = expectedChars.length > 0 ? expectedChars[0] : null;
      
      // Ignore spacebar if it's not the expected character (prevents combo breaking when players instinctively press space between words)
      if (char === ' ' && expectedChar !== ' ') {
        return;
      }
      
      if (expectedChar !== null) {
        // Highlight wrong hit
        const cx = window.innerWidth / 2;
        const cy = 250; 
        this.state.damagePopups.push(new DamagePopup(cx, cy, 0)); // MISS
      }
    }
  }
}

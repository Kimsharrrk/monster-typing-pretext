import { GameState, type AttackType } from './state';
import { CanvasRenderer } from '../renderer/canvasRenderer';
import { InputHandler } from './input';
import { Monster } from '../entities/Monster';
import { Projectile } from '../entities/Projectile';
import { STAGES } from './stages';
import { MultiplayerManager } from './multiplayer';
import { loadShapePixels } from '../renderer/shapeMorpher';
import { FallingChar } from '../entities/FallingChar';
import { TextBomb } from '../entities/TextBomb';
import { WordShield } from '../entities/WordShield';
import { AlphabetExplosion } from '../entities/AlphabetExplosion';

const DICTIONARY = [
  "apple", "brave", "catch", "dance", "eagle", "flame", "ghost", "heart", "igloo", "juice",
  "knight", "lemon", "magic", "ninja", "ocean", "piano", "queen", "river", "snake", "train",
  "union", "voice", "water", "xenon", "yacht", "zebra", "fast", "slow", "hero", "myth",
  "sword", "shield", "spell", "beast", "slime", "dragon", "goblin", "orc", "elf", "dwarf"
];

export class GameEngine {
  state: GameState;
  renderer: CanvasRenderer;
  input: InputHandler;
  
  lastTime: number = 0;
  running: boolean = false;
  
  multiplayer: MultiplayerManager;
  lastSendTime: number = 0;
  
  nextAttackTime: number = 0;
  
  phase: number = 1;

  constructor() {
    this.state = new GameState();
    this.renderer = new CanvasRenderer('gameCanvas');
    this.input = new InputHandler(
      this.state,
      () => this.beginGame(),
      () => this.resetGame(),
      () => {
        this.phase++;
        this.loadStage(this.phase);
      },
      (type) => this.applyUpgrade(type)
    );
    
    this.multiplayer = new MultiplayerManager((hp, score) => {
      this.state.opponentHp = hp;
      this.state.opponentScore = score;
    });
  }

  start() {
    this.state.screen = 'MENU';
    
    // Preload shapes
    const shapes = ['Skull', 'Flame', 'Sword', 'Ghost', 'Shield', 'Crown', 'Axe', 'Mountain', 'Zap', 'Moon', 'Hexagon', 'Snowflake', 'Droplet', 'Bomb', 'Snail', 'Rabbit', 'Cat', 'Dog', 'Bird'];
    shapes.forEach(s => loadShapePixels(s));
    
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  beginGame() {
    this.state.screen = 'PLAYING';
    
    if (this.state.gameMode === 'CHALLENGE') {
      this.phase = 1;
      this.state.playerMaxHp = 100;
      this.state.playerHp = 100;
      this.state.level = 1;
      this.state.exp = 0;
      this.state.maxExp = 100;
      this.state.shieldCount = 0;
      this.state.damageMultiplier = 1.0;
      this.state.scoreMultiplier = 1.0;
      this.state.score = 0;
      this.state.combo = 0;
    } else {
      // Practice mode: start at selected level
      const startIndex = this.state.startingLevel - 1;
      this.phase = startIndex !== -1 ? STAGES[startIndex].level : 1;
    }
    
    this.loadStage(this.phase);
    this.state.startTime = performance.now();
    this.nextAttackTime = performance.now() + 10000;
    this.state.bossAttackState = 'IDLE';
    this.state.bossAttackTimer = 5.0;
  }
  
  resetGame() {
    // Keep multiplayer but reset other states
    const hp = this.state.opponentHp;
    const score = this.state.opponentScore;
    const mode = this.state.gameMode;
    
    this.state = new GameState();
    this.state.opponentHp = hp;
    this.state.opponentScore = score;
    this.state.gameMode = mode;
    this.input.state = this.state; // Re-link state to input
    
    this.beginGame();
  }

  loadStage(level: number) {
    const stage = STAGES[level - 1];
    if (!stage) return;
    
    let textToType = "";
    if (stage.charPool === "WORDS") {
      const words = [];
      for (let i = 0; i < stage.poolLength!; i++) {
        words.push(DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)]);
      }
      textToType = words.join(" ");
    } else if (stage.charPool === "PHRASES") {
      const phrases = [];
      for (let i = 0; i < stage.poolLength!; i++) {
        const w1 = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)];
        const w2 = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)];
        phrases.push(`${w1} ${w2}`);
      }
      textToType = phrases.join("  ");
    } else if (stage.charPool && stage.poolLength) {
      if (stage.wordMode) {
        const words = [];
        let remaining = stage.poolLength;
        while (remaining > 0) {
          const wordLen = Math.floor(Math.random() * 5) + 3;
          const actualLen = Math.min(wordLen, remaining);
          let word = "";
          for (let i = 0; i < actualLen; i++) {
            word += stage.charPool[Math.floor(Math.random() * stage.charPool.length)];
          }
          words.push(word);
          remaining -= actualLen;
        }
        textToType = words.join(" ");
      } else {
        // Linear mode: Just raw characters
        const parts = [];
        for (let i = 0; i < stage.poolLength; i++) {
          parts.push(stage.charPool[Math.floor(Math.random() * stage.charPool.length)]);
        }
        textToType = parts.join("");
      }
    } else {
      const texts = stage.texts || ["Missing text"];
      textToType = texts[Math.floor(Math.random() * texts.length)];
    }
    
    this.state.bossDialog = `${stage.title}...`;
    this.state.stageClearWaiting = false;
    
    if (!this.state.boss) {
      this.state.boss = new Monster(1, 0, 0, textToType, stage.repeats);
    }
    this.state.boss.chapter = stage.chapter;
    
    let shapeToUse = stage.shape as string;
    if (Array.isArray(stage.shape)) {
      shapeToUse = stage.shape[Math.floor(Math.random() * stage.shape.length)];
    }
    
    this.state.boss.changeShape(shapeToUse, textToType, stage.repeats, stage.wordMode || false, this.state.damageMultiplier);
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

  takeDamage(amount: number, message: string) {
    if (this.state.invincibilityTimeRemaining > 0 || this.state.screen !== 'PLAYING') return;
    
    if (this.state.shieldCount > 0) {
      this.state.shieldCount--;
      this.state.bossDialog = "* Shield blocked the attack!";
      this.state.bossAttackMotionRemaining = 0.2;
      this.state.invincibilityTimeRemaining = 1.0; // 1s iframe
    } else {
      this.state.playerHp -= amount;
      this.state.shakeTimeRemaining = 0.4;
      this.state.flashTimeRemaining = 0.2;
      this.state.bossDialog = message;
      this.state.invincibilityTimeRemaining = 1.0;
    }
    
    if (this.state.playerHp <= 0) {
      this.state.playerHp = 0;
      this.state.screen = 'GAMEOVER';
      this.state.bossDialog = "GAME OVER... PRESS [ENTER] TO RETRY.";
    }
  }

  update(dt: number, now: number) {
    if (this.state.screen !== 'PLAYING') return;
    
    if (this.state.boss) {
      this.state.boss.update(dt);
      
      // Phase management
      if (this.state.boss.isDeadState && !this.state.stageClearWaiting) {
        this.state.stageClearWaiting = true;
        
        const expGain = 20 * this.phase;
        this.state.exp += expGain;
        
        const baseScoreGain = 1000 * this.phase;
        this.state.score += Math.floor(baseScoreGain * this.state.scoreMultiplier);
        
        let levelUpStr = "";
        if (this.state.exp >= this.state.maxExp) {
          this.state.level++;
          this.state.exp -= this.state.maxExp;
          this.state.maxExp = Math.floor(this.state.maxExp * 1.5);
          this.state.playerMaxHp += 20;
          this.state.playerHp = this.state.playerMaxHp;
          levelUpStr = " LEVEL UP! MAX HP UP!";
        }
        
        if (this.phase < STAGES.length) {
          if (this.state.gameMode === 'CHALLENGE') {
            this.state.bossDialog = `STAGE CLEAR! +${expGain} EXP.` + levelUpStr;
            this.generateUpgradeOptions();
            this.state.screen = 'CHALLENGE_UPGRADE';
          } else {
            this.state.bossDialog = `STAGE CLEAR! +${expGain} EXP.` + levelUpStr + ` Press [ENTER] to continue.`;
          }
        } else {
          this.state.bossDialog = "YOU DEFEATED ME... YOU ARE A TYPING MASTER! GAME CLEAR!";
        }
      }
      
      // Basic Attack Logic (Charging Bar)
      if (!this.state.boss.isDead()) {
        if (this.state.bossAttackState === 'IDLE') {
          this.state.bossAttackTimer -= dt;
          if (this.state.bossAttackTimer <= 0) {
            this.state.bossAttackState = 'CHARGING';
            this.state.bossAttackChargeMax = Math.max(1.0, 3.0 - this.phase * 0.2); // Faster charge in later phases
            if (this.state.difficulty === 'HARD') this.state.bossAttackChargeMax *= 0.7;
            this.state.bossAttackTimer = this.state.bossAttackChargeMax;
            this.state.bossDialog = "* Boss is preparing to strike! Type quickly to cancel!";
          }
        } else if (this.state.bossAttackState === 'CHARGING') {
          this.state.bossAttackTimer -= dt;
          if (this.state.bossAttackTimer <= 0) {
            // FIRE ATTACK
            let damage = 5 + this.phase * 2;
            if (this.state.difficulty === 'EASY') damage = Math.floor(damage * 0.5);
            else if (this.state.difficulty === 'HARD') damage = Math.floor(damage * 1.5);
            
            this.takeDamage(damage, `* Boss attacks! You took ${damage} damage!`);
            
            // Go back to IDLE
            this.state.bossAttackState = 'IDLE';
            let intervalBase = 5000;
            let bossPhase = 1;
            const hpPct = this.state.boss.maxHp > 0 ? this.state.boss.hp / this.state.boss.maxHp : 0;
            if (hpPct <= 0.4) bossPhase = 3;
            else if (hpPct <= 0.7) bossPhase = 2;
            if (bossPhase === 2) intervalBase -= 1000;
            if (bossPhase === 3) intervalBase -= 2000;
            
            this.state.bossAttackTimer = Math.max(1000, intervalBase - (this.phase * 500)) / 1000;
            if (this.state.playerHp <= 0) return;
          }
        }
      }
      
      // Special Patterns
      if (!this.state.boss.isDead() && now > this.nextAttackTime) {
        let bossPhase = 1;
        const hpPct = this.state.boss.maxHp > 0 ? this.state.boss.hp / this.state.boss.maxHp : 0;
        if (hpPct <= 0.4) bossPhase = 3;
        else if (hpPct <= 0.7) bossPhase = 2;

        // UI Attack
        const attacks: AttackType[] = ['shake', 'flip', 'fullscreen', 'popup', 'blur', 'invert'];
        const randomAttack = attacks[Math.floor(Math.random() * attacks.length)];
        
        if (this.state.enableUIAttacks) {
          this.state.pendingAttacks.push(randomAttack);
        }
        
        const availablePatterns = ['projectile'];
        if (bossPhase >= 2) {
          availablePatterns.push('laser');
          availablePatterns.push('textbomb');
        }
        if (bossPhase >= 3) {
          availablePatterns.push('wordshield');
          availablePatterns.push('alphabet');
        }
        
        const chosenPattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
        
        if (chosenPattern === 'projectile') {
          const isHealing = Math.random() < 0.2; // 20% chance for a healing projectile
          let word = "";
          let shape = "";
          
          if (isHealing) {
            word = "heal";
            shape = "Heart";
          } else {
            const wordShapes: Record<string, string> = {
              'fire': 'Flame', 'thunder': 'Zap', 'ice': 'Snowflake',
              'poison': 'Droplet', 'blast': 'Bomb', 'slash': 'Sword'
            };
            const words = Object.keys(wordShapes);
            word = words[Math.floor(Math.random() * words.length)];
            shape = wordShapes[word];
          }
          
          const startX = this.renderer.width / 2 + (Math.random() - 0.5) * 300;
          const startY = this.state.boss.y - 50; 
          
          let vy = 50 + this.phase * 20;
          if (this.state.difficulty === 'EASY') vy *= 0.8;
          if (this.state.difficulty === 'HARD') vy *= 1.3;
          
          this.state.projectiles.push(new Projectile(startX, startY, word, shape, vy, isHealing));
          this.state.bossDialog = isHealing ? `* A HEALING orb appears! Type it to recover HP!` : `* I cast [${word.toUpperCase()}]! Dodge this!`;
        } else if (chosenPattern === 'laser') {
          this.state.isBarrageActive = true;
          this.state.bossDialog = `* BULLET HELL BARRAGE! Dodge the falling letters!`;
          
          const barrageCount = 15 + this.phase * 5; // e.g. 20, 25, 30 chars
          const allChars = "abcdefghijklmnopqrstuvwxyz";
          for (let i = 0; i < barrageCount; i++) {
            const startX = this.renderer.width/2 + (Math.random()-0.5) * (this.renderer.width * 0.8);
            const startY = -Math.random() * 200 - i * 60; // Spread them out vertically above screen
            const targetX = this.renderer.boxX + this.renderer.boxWidth/2 + (Math.random()-0.5) * 400;
            const targetY = this.renderer.boxY + 50;
            const char = allChars[Math.floor(Math.random() * allChars.length)];
            
            this.state.fallingChars.push(new FallingChar(startX, startY, targetX, targetY, char));
          }
        } else if (chosenPattern === 'textbomb') {
          for(let i=0; i<3; i++) {
            const bx = this.renderer.width/2 + (Math.random()-0.5)*400;
            const by = this.renderer.boxY/2 + (Math.random()-0.5)*200;
            this.state.textBombs.push(new TextBomb(bx, by, "boom", 4000));
          }
          this.state.bossDialog = `* Text Bombs incoming!`;
        } else if (chosenPattern === 'wordshield') {
          this.state.wordShields.push(new WordShield(["shield", "guard", "protect", "block"]));
          this.state.bossDialog = `* Boss surrounds itself with a WORD SHIELD!`;
        } else if (chosenPattern === 'alphabet') {
          this.state.alphabetExplosions.push(new AlphabetExplosion(["a", "b", "c", "d", "e"], this.renderer.width, this.renderer.boxY));
          this.state.bossDialog = `* Type the alphabet in order to stop the explosion!`;
        }

        let baseInterval = 8000;
        if (bossPhase === 2) baseInterval = 6000;
        if (bossPhase === 3) baseInterval = 4000;
        this.nextAttackTime = now + Math.max(2000, baseInterval - this.phase * 500);
      }
    }
    
    // Update projectiles
    for (const proj of this.state.projectiles) {
      proj.update(dt);
      if (proj.y > this.renderer.boxY) {
        proj.isDead = true;
        if (!proj.isHealing) {
          this.takeDamage(10, "* Projectile hit you!");
          if (this.state.playerHp <= 0) return;
        } else {
          this.state.bossDialog = "* The healing orb faded away...";
        }
      }
    }
    this.state.projectiles = this.state.projectiles.filter(p => !p.isDead);
    
    // Update FallingChars (Barrage)
    if (this.state.isBarrageActive) {
      for (const fc of this.state.fallingChars) {
        fc.update(dt);
        if (fc.y > this.renderer.boxY) {
          fc.isDead = true;
          this.takeDamage(fc.damage, "* A letter hit you!");
          if (this.state.playerHp <= 0) return;
        }
      }
      this.state.fallingChars = this.state.fallingChars.filter(fc => !fc.isDead);
      
      if (this.state.fallingChars.length === 0) {
        this.state.isBarrageActive = false;
        this.state.bossDialog = `* You survived the barrage!`;
      }
    }

    // Update TextBombs
    for (const bomb of this.state.textBombs) {
      bomb.update(dt);
      if (bomb.timer <= 0 && !bomb.isDead && !bomb.hasDealtDamage) {
        bomb.hasDealtDamage = true;
        this.takeDamage(15, "* Text bomb exploded!");
        if (this.state.playerHp <= 0) return;
      }
    }
    this.state.textBombs = this.state.textBombs.filter(b => !b.isDead);

    // Update AlphabetExplosions
    for (const exp of this.state.alphabetExplosions) {
      exp.update(dt);
      if (exp.timer <= 0 && !exp.isDead && !exp.hasDealtDamage) {
        exp.hasDealtDamage = true;
        this.takeDamage(25, "* Alphabet explosion damaged you!");
        if (this.state.playerHp <= 0) return;
      }
    }
    this.state.alphabetExplosions = this.state.alphabetExplosions.filter(e => !e.isDead);

    // Update WordShields
    for (const shield of this.state.wordShields) {
      shield.update(dt);
    }
    this.state.wordShields = this.state.wordShields.filter(s => !s.isDead);
    
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
    if (this.state.flashTimeRemaining > 0) {
      this.state.flashTimeRemaining -= dt;
    }
    if (this.state.bossAttackMotionRemaining > 0) {
      this.state.bossAttackMotionRemaining -= dt;
    }
    if (this.state.invincibilityTimeRemaining > 0) {
      this.state.invincibilityTimeRemaining -= dt;
    }
    
    if (this.state.inputClearTimer > 0) {
      this.state.inputClearTimer -= dt;
      if (this.state.inputClearTimer <= 0) {
        this.state.inputText = "";
      }
    }
    
    // Multiplayer sync (send every 500ms to avoid flooding)
    if (now - this.lastSendTime > 500) {
      this.multiplayer.sendUpdate(this.state.playerHp, this.state.score);
      this.lastSendTime = now;
    }
  }

  draw(now: number) {
    this.renderer.clear();
    
    if (this.state.screen === 'MENU') {
      this.renderer.renderMenu(now);
      return;
    }
    if (this.state.screen === 'STAGE_SELECT') {
      this.renderer.renderStageSelect(now);
      return;
    }
    if (this.state.screen === 'SETTINGS') {
      this.renderer.renderSettings(now, this.state.enableUIAttacks, this.state.difficulty);
      return;
    }
    if (this.state.screen === 'CHALLENGE_UPGRADE') {
      this.renderer.renderUpgradeScreen(this.state.upgradeOptions);
      return;
    }
    
    const ctx = this.renderer.ctx;
    ctx.save();
    
    if (this.state.flashTimeRemaining > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${this.state.flashTimeRemaining * 3})`;
      ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);
    }
    
    if (this.state.shakeTimeRemaining > 0) {
      const dx = (Math.random() - 0.5) * 10;
      const dy = (Math.random() - 0.5) * 10;
      ctx.translate(dx, dy);
    }
    
    if (this.state.boss) {
      this.renderer.renderMonster(
        this.state.boss, 
        now, 
        this.state.bossAttackMotionRemaining,
        this.state.bossAttackState,
        this.state.bossAttackTimer,
        this.state.bossAttackChargeMax
      );
    }
    
    this.renderer.renderParticles(this.state.particles);
    this.renderer.renderProjectiles(this.state.projectiles);
    this.renderer.renderFallingChars(this.state.fallingChars);
    this.renderer.renderDamagePopups(this.state.damagePopups);
    
    this.renderer.renderCombatBox(this.state.bossDialog, this.state.inputText, this.state.activeMenu !== 'FIGHT', this.state.boss);
    
    this.renderer.renderUndertaleUI(now, this.state.activeMenu);
    
    this.renderer.renderPlayerHp(this.state.playerHp, this.state.playerMaxHp, this.state.level, this.state.exp, this.state.maxExp, this.state.shieldCount);
    this.renderer.renderOpponentInfo(this.state.opponentHp, this.state.opponentScore);
    
    ctx.restore();
    
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`SCORE: ${this.state.score}`, 20, 20);
    
    ctx.fillStyle = this.state.combo >= 10 ? '#fbbf24' : '#ffffff';
    let comboText = `COMBO: ${this.state.combo}`;
    if (this.state.combo >= 20) comboText += ' 🔥';
    if (this.state.combo >= 50) comboText += ' ⚡';
    if (this.state.combo >= 10) ctx.font = '24px "Press Start 2P", monospace';
    ctx.fillText(comboText, 20, 50);
    
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`WPM: ${this.state.getWPM(now)}`, 20, 90);
    ctx.restore();
    
    if (this.state.screen === 'GAMEOVER') {
      this.renderer.renderGameOver(this.state.score, now);
    }
  }

  generateUpgradeOptions() {
    const types: ('HEAL' | 'MAX_HP' | 'SHIELD' | 'ATTACK' | 'SCORE')[] = ['HEAL', 'MAX_HP', 'SHIELD', 'ATTACK', 'SCORE'];
    const shuffled = types.sort(() => 0.5 - Math.random());
    const options = shuffled.slice(0, 3);
    
    this.state.upgradeOptions = options.map(type => {
      switch (type) {
        case 'HEAL':
          return { type, name: "HEAL", description: "Heal 50 HP" };
        case 'MAX_HP':
          return { type, name: "MAX HP UP", description: "Max HP +20 & Heal 20" };
        case 'SHIELD':
          return { type, name: "GET SHIELD", description: "Get 1 Shield (blocks next hit)" };
        case 'ATTACK':
          return { type, name: "ATTACK UP", description: "Boss HP -15% next stage" };
        case 'SCORE':
          return { type, name: "SCORE BOOST", description: "Score multiplier +20%" };
      }
    });
  }
  
  applyUpgrade(type: 'HEAL' | 'MAX_HP' | 'SHIELD' | 'ATTACK' | 'SCORE') {
    switch (type) {
      case 'HEAL':
        this.state.playerHp = Math.min(this.state.playerMaxHp, this.state.playerHp + 50);
        break;
      case 'MAX_HP':
        this.state.playerMaxHp += 20;
        this.state.playerHp = Math.min(this.state.playerMaxHp, this.state.playerHp + 20);
        break;
      case 'SHIELD':
        this.state.shieldCount++;
        break;
      case 'ATTACK':
        this.state.damageMultiplier += 0.15;
        break;
      case 'SCORE':
        this.state.scoreMultiplier += 0.20;
        break;
    }
    
    this.phase++;
    this.loadStage(this.phase);
    this.state.screen = 'PLAYING';
    this.nextAttackTime = performance.now() + 10000;
    this.state.bossAttackState = 'IDLE';
    this.state.bossAttackTimer = 5.0;
  }
}

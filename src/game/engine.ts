import { GameState, type AttackType } from './state';
import { CanvasRenderer } from '../renderer/canvasRenderer';
import { InputHandler } from './input';
import { Monster } from '../entities/Monster';
import { Projectile } from '../entities/Projectile';
import { DamagePopup } from '../entities/Particle';
import { STAGES } from './stages';
import { MultiplayerManager } from './multiplayer';
import { loadShapePixels } from '../renderer/shapeMorpher';

export class GameEngine {
  state: GameState;
  renderer: CanvasRenderer;
  input: InputHandler;
  
  lastTime: number = 0;
  running: boolean = false;
  
  multiplayer: MultiplayerManager;
  lastSendTime: number = 0;
  
  nextAttackTime: number = 0;
  nextBasicAttackTime: number = 0;
  
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
      const startIndex = STAGES.findIndex(s => s.chapter === this.state.startingChapter);
      this.phase = startIndex !== -1 ? STAGES[startIndex].level : 1;
    }
    
    this.loadStage(this.phase);
    this.state.startTime = performance.now();
    this.nextAttackTime = performance.now() + 10000;
    this.nextBasicAttackTime = performance.now() + 5000;
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
    
    const randomText = stage.texts[Math.floor(Math.random() * stage.texts.length)];
    this.state.bossDialog = `${stage.title}...`;
    this.state.stageClearWaiting = false;
    
    // Pick the shape defined for this stage
    const randomShape = stage.shape;
    
    if (!this.state.boss) {
      this.state.boss = new Monster(1, 0, 0, randomText, stage.repeats);
    }
    this.state.boss.chapter = stage.chapter;
    this.state.boss.changeShape(randomShape, randomText, stage.repeats, stage.wordMode || false, this.state.damageMultiplier);
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
      
      // Basic Attack (Timeout)
      if (!this.state.boss.isDead() && now > this.nextBasicAttackTime) {
        let damage = 5 + this.phase * 2;
        let intervalBase = 5000;
        let intervalMin = 1000;
        
        if (this.state.difficulty === 'EASY') {
          damage = Math.floor(damage * 0.5);
          intervalBase = 6000;
          intervalMin = 1500;
        } else if (this.state.difficulty === 'HARD') {
          damage = Math.floor(damage * 1.5);
          intervalBase = 4000;
          intervalMin = 500;
        }
        
        if (this.state.shieldCount > 0) {
          this.state.shieldCount--;
          this.state.bossDialog = "* Shield blocked the attack!";
          this.state.bossAttackMotionRemaining = 0.2;
        } else {
          this.state.playerHp -= damage;
          this.state.shakeTimeRemaining = 0.3;
          this.state.bossAttackMotionRemaining = 0.2; // 200ms dash motion
          this.state.flashTimeRemaining = 0.1; // Flash red
          this.state.bossDialog = `* Boss attacks! You took ${damage} damage!`;
        }
        
        if (this.state.playerHp <= 0) {
          this.state.playerHp = 0;
          this.state.screen = 'GAMEOVER';
          this.state.bossDialog = "GAME OVER... PRESS [ENTER] TO RETRY.";
          return;
        }
        
        // Reset basic attack timer
        const attackInterval = Math.max(intervalMin, intervalBase - (this.phase * 500));
        this.nextBasicAttackTime = now + attackInterval;
      }
      
      // Projectile attack
      if (!this.state.boss.isDead() && now > this.nextAttackTime) {
        // UI Attack
        const attacks: AttackType[] = ['shake', 'flip', 'fullscreen', 'popup', 'blur', 'invert'];
        const randomAttack = attacks[Math.floor(Math.random() * attacks.length)];
        
        if (this.state.enableUIAttacks) {
          this.state.pendingAttacks.push(randomAttack);
        }
        
        // Projectile attack
        const wordShapes: Record<string, string> = {
          'fire': 'Flame',
          'thunder': 'Zap',
          'ice': 'Snowflake',
          'poison': 'Droplet',
          'blast': 'Bomb',
          'slash': 'Sword'
        };
        const words = Object.keys(wordShapes);
        const word = words[Math.floor(Math.random() * words.length)];
        const shape = wordShapes[word];
        const startX = this.renderer.width / 2 + (Math.random() - 0.5) * 300;
        const startY = this.state.boss.y - 50; // spawn a bit higher
        
        let vy = 50 + this.phase * 20;
        if (this.state.difficulty === 'EASY') vy *= 0.8;
        if (this.state.difficulty === 'HARD') vy *= 1.3;
        
        this.state.projectiles.push(new Projectile(startX, startY, word, shape, vy));
        
        this.state.bossDialog = `* I cast [${word.toUpperCase()}]! Dodge this!`;
        this.nextAttackTime = now + Math.max(2000, 8000 - this.phase * 1000);
      }
    }
    
    // Update projectiles
    for (const proj of this.state.projectiles) {
      proj.update(dt);
      if (proj.y > this.renderer.boxY) {
        proj.isDead = true;
        
        if (this.state.shieldCount > 0) {
          this.state.shieldCount--;
          this.state.bossDialog = "* Shield blocked the attack!";
        } else {
          this.state.playerHp -= 10; // Projectile damage fixed at 10
          this.state.shakeTimeRemaining = 0.4;
          this.state.flashTimeRemaining = 0.15;
          this.state.damagePopups.push(new DamagePopup(proj.x, proj.y, 10));
        }
        
        if (this.state.playerHp <= 0) {
          this.state.playerHp = 0;
          this.state.screen = 'GAMEOVER';
          this.state.bossDialog = "GAME OVER... PRESS [ENTER] TO RETRY.";
          return;
        }
      }
    }
    this.state.projectiles = this.state.projectiles.filter(p => !p.isDead);
    
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
    
    // Dead code removed
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
      this.renderer.renderMonster(this.state.boss, now, this.state.bossAttackMotionRemaining);
    }
    
    this.renderer.renderParticles(this.state.particles);
    this.renderer.renderProjectiles(this.state.projectiles);
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
    this.nextBasicAttackTime = performance.now() + 5000;
  }
}

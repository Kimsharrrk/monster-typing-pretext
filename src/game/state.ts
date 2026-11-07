import { Monster } from '../entities/Monster';
import { Particle, DamagePopup } from '../entities/Particle';
import { Projectile } from '../entities/Projectile';
import { FallingChar } from '../entities/FallingChar';
import { TextBomb } from '../entities/TextBomb';
import { WordShield } from '../entities/WordShield';
import { AlphabetExplosion } from '../entities/AlphabetExplosion';

export type AttackType = 'shake' | 'flip' | 'fullscreen' | 'popup' | 'blur' | 'invert';

export class GameState {
  screen: 'MENU' | 'SETTINGS' | 'STAGE_SELECT' | 'PLAYING' | 'GAMEOVER' | 'CHALLENGE_UPGRADE' = 'MENU';
  startingLevel: number = 1;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' = 'NORMAL';
  enableUIAttacks: boolean = false;
  
  score: number = 0;
  boss: Monster | null = null;
  // Entity lists
  particles: Particle[] = [];
  projectiles: Projectile[] = [];
  fallingChars: FallingChar[] = [];
  textBombs: TextBomb[] = [];
  wordShields: WordShield[] = [];
  alphabetExplosions: AlphabetExplosion[] = [];
  damagePopups: DamagePopup[] = [];
  
  isBarrageActive: boolean = false;
  combo: number = 0;
  maxCombo: number = 0;
  
  bossDialog: string = "Prepare yourself...";
  
  bossAttackState: 'IDLE' | 'CHARGING' = 'IDLE';
  bossAttackTimer: number = 0;
  bossAttackChargeMax: number = 2.0;
  
  inputText: string = '';
  inputClearTimer: number = 0;
  isSkillMode: boolean = false;
  
  startTime: number = 0;
  typedCharsCount: number = 0;
  
  playerHp: number = 100;
  playerMaxHp: number = 100;
  
  // RPG Stats
  level: number = 1;
  exp: number = 0;
  maxExp: number = 100;
  
  // UI Menu State
  activeMenu: 'FIGHT' | 'ACT' | 'ITEM' | 'MERCY' = 'FIGHT';
  stageClearWaiting: boolean = false;
  
  gameMode: 'PRACTICE' | 'CHALLENGE' = 'PRACTICE';
  
  // Challenge Mode Upgrades
  shieldCount: number = 0;
  damageMultiplier: number = 1.0;
  scoreMultiplier: number = 1.0;
  upgradeOptions: { type: 'HEAL' | 'MAX_HP' | 'SHIELD' | 'ATTACK' | 'SCORE', name: string, description: string }[] = [];
  
  opponentHp: number = 100;
  opponentScore: number = 0;
  
  pendingAttacks: AttackType[] = [];
  
  // Micro-shake for hit feedback
  shakeTimeRemaining: number = 0;
  flashTimeRemaining: number = 0;
  bossAttackMotionRemaining: number = 0;
  invincibilityTimeRemaining: number = 0;

  getWPM(now: number): number {
    if (this.startTime === 0 || now === this.startTime) return 0;
    const minutes = (now - this.startTime) / 60000;
    return Math.floor((this.typedCharsCount / 5) / minutes);
  }

  resetCombo() {
    this.combo = 0;
  }
}

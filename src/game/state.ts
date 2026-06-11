import { Monster } from '../entities/Monster';
import { Particle, DamagePopup } from '../entities/Particle';

export type AttackType = 'shake' | 'flip' | 'fullscreen' | 'popup';

export class GameState {
  score: number = 0;
  boss: Monster | null = null;
  particles: Particle[] = [];
  damagePopups: DamagePopup[] = [];
  combo: number = 0;
  
  bossDialog: string = "Prepare yourself...";
  
  inputText: string = '';
  isSkillMode: boolean = false;
  
  startTime: number = 0;
  typedCharsCount: number = 0;
  
  pendingAttacks: AttackType[] = [];
  
  // Micro-shake for hit feedback
  shakeTimeRemaining: number = 0;

  getWPM(now: number): number {
    if (this.startTime === 0 || now === this.startTime) return 0;
    const minutes = (now - this.startTime) / 60000;
    return Math.floor((this.typedCharsCount / 5) / minutes);
  }

  resetCombo() {
    this.combo = 0;
  }
}

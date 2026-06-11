import { initMorpher, loadShapePixels } from '../renderer/shapeMorpher';
import { bakeShapeLayout, type ShapeCell } from '../renderer/shapeBaker';

export interface WordGroup {
  id: number;
  text: string;
  cells: ShapeCell[];
  typeIndex: number;
  isCompleted: boolean;
}

export class Monster {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  
  font: string = '20px "Press Start 2P", monospace';
  fontSize: number = 24;
  
  baseText: string;
  fullText: string; 
  typeIndex: number = 0;
  chapter: number = 1;
  
  targetShape: string = 'Square';
  isLoaded: boolean = false;
  
  cells: ShapeCell[] = [];
  bgCells: ShapeCell[] = [];
  
  isDeadState: boolean = false;
  maxHp: number = 0;
  hp: number = 0;

  wordMode: boolean = false;
  wordGroups: WordGroup[] = [];
  activeCandidateIds: number[] = [];
  candidateTypeIndex: number = 0;

  constructor(id: number, x: number, y: number, baseText: string, repeats: number = 2) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = Math.min(400, 150 + repeats * 15);
    this.height = this.width;
    
    this.baseText = baseText + " ";
    this.fullText = Array(repeats).fill(this.baseText).join('');
    
    initMorpher();
  }
  
  changeShape(newShape: string, newText: string, repeats: number = 2, wordMode: boolean = false, damageMultiplier: number = 1.0) {
    this.isLoaded = false;
    this.targetShape = newShape;
    this.baseText = newText + " ";
    this.fullText = Array(repeats).fill(this.baseText).join('');
    this.width = Math.min(400, 150 + repeats * 15);
    this.height = this.width;
    this.typeIndex = 0;
    this.wordMode = wordMode;
    
    loadShapePixels(newShape, () => {
      // Generate dense background silhouette. Add spaces so pretext can wrap it!
      const bgBaked = bakeShapeLayout(newShape, '■ '.repeat(1500), this.width, 10);
      this.bgCells = bgBaked.cells;
      
      const baked = bakeShapeLayout(newShape, this.fullText, this.width, this.fontSize);
      this.cells = baked.cells;
      
      // Apply damage multiplier (reduce boss HP by marking cells as inactive at start)
      this.maxHp = this.fullText.replace(/ /g, '').length;
      this.hp = this.maxHp;
      
      if (damageMultiplier > 1.0) {
        const percentToClear = Math.min(0.5, (damageMultiplier - 1.0)); // cap at 50%
        const numToClear = Math.floor(this.cells.length * percentToClear);
        let cleared = 0;
        for (let idx = this.cells.length - 1; idx >= 0 && cleared < numToClear; idx--) {
          const cell = this.cells[idx];
          if (cell && cell.isActive && !cell.isSpace) {
            cell.isActive = false;
            cleared++;
            this.hp--;
          }
        }
      }
      
      this.isLoaded = true;
      this.isDeadState = false;
      
      if (this.wordMode) {
        this.groupCellsIntoWords();
      } else {
        this.updateTargetHighlight();
      }
    });
  }

  groupCellsIntoWords() {
    this.wordGroups = [];
    this.activeCandidateIds = [];
    this.candidateTypeIndex = 0;
    
    let currentGroupCells: ShapeCell[] = [];
    let groupIdCounter = 0;
    
    for (const cell of this.cells) {
      if (cell.isSpace) {
        if (currentGroupCells.length > 0) {
          const wordText = currentGroupCells.map(c => c.char).join('');
          this.wordGroups.push({
            id: groupIdCounter++,
            text: wordText,
            cells: [...currentGroupCells],
            typeIndex: 0,
            isCompleted: false
          });
          currentGroupCells = [];
        }
        cell.isActive = false; // Spaces don't need to be typed
      } else {
        currentGroupCells.push(cell);
      }
    }
    
    if (currentGroupCells.length > 0) {
      const wordText = currentGroupCells.map(c => c.char).join('');
      this.wordGroups.push({
        id: groupIdCounter++,
        text: wordText,
        cells: [...currentGroupCells],
        typeIndex: 0,
        isCompleted: false
      });
    }
    
    this.updateTargetHighlight();
  }

  updateTargetHighlight() {
    for (const cell of this.cells) {
      cell.isTarget = false;
    }
    
    if (this.wordMode) {
      if (this.activeCandidateIds.length > 0) {
        for (const id of this.activeCandidateIds) {
          const g = this.wordGroups.find(group => group.id === id);
          if (g && !g.isCompleted && g.typeIndex < g.cells.length) {
            g.cells[g.typeIndex].isTarget = true;
          }
        }
      } else {
        // Highlight the first char of every uncompleted word group
        for (const group of this.wordGroups) {
          if (!group.isCompleted && group.cells.length > 0) {
            group.cells[0].isTarget = true;
          }
        }
      }
      
      const allCompleted = this.wordGroups.every(g => g.isCompleted);
      if (allCompleted) {
        this.isDeadState = true;
      }
    } else {
      if (this.typeIndex < this.cells.length) {
        this.cells[this.typeIndex].isTarget = true;
      } else {
        this.isDeadState = true;
      }
    }
  }

  update(_dt: number) {
  }

  isDead() {
    return this.isDeadState || this.hp <= 0;
  }
  
  getCurrentTargetChar(): string | null {
    if (!this.isLoaded) return null;
    if (this.wordMode) {
      if (this.activeCandidateIds.length > 0) {
        const g = this.wordGroups.find(group => group.id === this.activeCandidateIds[0]);
        if (g && !g.isCompleted && g.typeIndex < g.cells.length) {
          return g.cells[g.typeIndex].char;
        }
      }
      return null;
    } else {
      if (this.typeIndex >= this.cells.length) return null;
      return this.cells[this.typeIndex].char;
    }
  }
  
  hitChar(char: string): ShapeCell | null {
    if (!this.isLoaded) return null;
    
    if (this.wordMode) {
      if (this.activeCandidateIds.length > 0) {
        const matchingCandidates: number[] = [];
        const failingCandidates: number[] = [];
        
        for (const id of this.activeCandidateIds) {
          const g = this.wordGroups.find(group => group.id === id);
          if (g && !g.isCompleted && g.typeIndex < g.cells.length) {
            if (g.cells[g.typeIndex].char === char) {
              matchingCandidates.push(id);
            } else {
              failingCandidates.push(id);
            }
          }
        }
        
        if (matchingCandidates.length > 0) {
          this.hp--;
          
          // Restore failing candidates
          for (const id of failingCandidates) {
            const g = this.wordGroups.find(group => group.id === id);
            if (g) {
              for (let i = 0; i < g.typeIndex; i++) {
                g.cells[i].isActive = true;
                this.hp++;
              }
              g.typeIndex = 0;
            }
          }
          
          // Advance matching candidates
          for (const id of matchingCandidates) {
            const g = this.wordGroups.find(group => group.id === id);
            if (g) {
              g.cells[g.typeIndex].isActive = false;
              g.typeIndex++;
              if (g.typeIndex >= g.cells.length) {
                g.isCompleted = true;
              }
            }
          }
          
          this.activeCandidateIds = matchingCandidates.filter(id => {
            const g = this.wordGroups.find(group => group.id === id);
            return g ? !g.isCompleted : false;
          });
          
          this.candidateTypeIndex++;
          if (this.activeCandidateIds.length === 0) {
            this.candidateTypeIndex = 0;
          }
          
          this.updateTargetHighlight();
          const firstG = this.wordGroups.find(group => group.id === matchingCandidates[0]);
          return firstG ? firstG.cells[firstG.typeIndex - 1] : null;
        } else {
          // Mismatch: Reset current candidates progress
          for (const id of this.activeCandidateIds) {
            const g = this.wordGroups.find(group => group.id === id);
            if (g) {
              for (let i = 0; i < g.typeIndex; i++) {
                g.cells[i].isActive = true;
                this.hp++;
              }
              g.typeIndex = 0;
            }
          }
          this.activeCandidateIds = [];
          this.candidateTypeIndex = 0;
        }
      }
      
      // Try to find matching words starting with char
      if (this.activeCandidateIds.length === 0) {
        const matches = this.wordGroups.filter(
          g => !g.isCompleted && g.cells.length > 0 && g.cells[0].char === char
        );
        
        if (matches.length > 0) {
          this.activeCandidateIds = matches.map(g => g.id);
          this.candidateTypeIndex = 1;
          this.hp--;
          
          for (const g of matches) {
            g.cells[0].isActive = false;
            g.typeIndex = 1;
            if (g.typeIndex >= g.cells.length) {
              g.isCompleted = true;
            }
          }
          
          this.activeCandidateIds = this.activeCandidateIds.filter(id => {
            const g = this.wordGroups.find(group => group.id === id);
            return g ? !g.isCompleted : false;
          });
          
          if (this.activeCandidateIds.length === 0) {
            this.candidateTypeIndex = 0;
          }
          
          this.updateTargetHighlight();
          return matches[0].cells[0];
        }
      }
      
      return null;
    } else {
      if (this.typeIndex >= this.cells.length) return null;
      
      const targetCell = this.cells[this.typeIndex];
      if (targetCell.char === char) {
        targetCell.isActive = false;
        this.typeIndex++;
        this.hp--;
        
        if (this.hp <= 0 || this.typeIndex >= this.cells.length) {
          this.isDeadState = true;
        }
        this.updateTargetHighlight();
        return targetCell;
      }
      return null;
    }
  }
}

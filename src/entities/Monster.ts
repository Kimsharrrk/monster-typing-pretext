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
  width: number = 600;
  height: number = 600;
  
  font: string = '18px "Press Start 2P", monospace';
  fontSize: number = 18;
  
  baseText: string;
  fullText: string; 
  typeIndex: number = 0;
  chapter: number = 1;
  
  targetShape: string = 'Square';
  isLoaded: boolean = false;
  
  cells: ShapeCell[] = [];
  bgCells: ShapeCell[] = [];
  targetCellEndIndex: number = 0;
  
  linearTargetIds: number[] = [];
  linearTypeIndex: number = 0;
  
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
    this.width = 600;
    this.height = 600;
    
    this.baseText = baseText + " ";
    this.fullText = Array(repeats).fill(this.baseText).join('');
    
    initMorpher();
  }
  
  changeShape(newShape: string, newText: string, repeats: number = 2, wordMode: boolean = false, damageMultiplier: number = 1.0) {
    this.isLoaded = false;
    this.targetShape = newShape;
    this.baseText = newText + " ";
    this.wordMode = wordMode;
    
    const requiredText = Array(repeats).fill(this.baseText).join('');
    const requiredCharsArray = requiredText.replace(/ /g, '').split('');
    const requiredCharCount = requiredCharsArray.length;
    
    const allChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let combinedText = "";
    
    if (wordMode) {
      const requiredWords = requiredText.trim().split(/\s+/);
      const fillerWords: string[] = [];
      for(let i=0; i<400; i++) {
        let wLen = Math.floor(Math.random() * 4) + 3; // 3 to 6 chars
        let w = "";
        for(let j=0; j<wLen; j++) w += allChars[Math.floor(Math.random() * allChars.length)];
        fillerWords.push(w);
      }
      
      const combinedWords: string[] = [];
      let reqIdx = 0;
      const interval = Math.max(1, Math.floor(120 / requiredWords.length));
      
      for(let i=0; i<fillerWords.length; i++) {
         if (reqIdx < requiredWords.length && i > 0 && i % interval === 0) {
             combinedWords.push(requiredWords[reqIdx++]);
         }
         combinedWords.push(fillerWords[i]);
      }
      while(reqIdx < requiredWords.length) {
         combinedWords.push(requiredWords[reqIdx++]);
      }
      combinedText = combinedWords.join(" ");
    } else {
      let fillerText = "";
      for(let i=0; i<2000; i++) {
        fillerText += allChars[Math.floor(Math.random() * allChars.length)];
      }
      combinedText = fillerText;
    }
    
    loadShapePixels(newShape, () => {
      let baked = bakeShapeLayout(newShape, combinedText, this.width, this.fontSize, !wordMode);
      
      if (baked.cells.length === 0) {
        baked = bakeShapeLayout('Square', combinedText, this.width, this.fontSize, !wordMode);
      }
      
      this.cells = baked.cells;
      
      for (const cell of this.cells) {
        cell.isActive = false;
        cell.isTarget = false;
      }
      
      this.linearTargetIds = [];
      this.linearTypeIndex = 0;
      
      if (this.wordMode) {
        const requiredWords = requiredText.trim().split(/\s+/);
        
        // Temporarily activate all non-space cells to group them
        for (const cell of this.cells) {
           cell.isActive = !cell.isSpace;
        }
        this.groupCellsIntoWords(); // Groups all contiguous non-space cells
        
        const targetGroupIds = new Set<number>();
        let reqIdx = 0;
        
        for (const group of this.wordGroups) {
           if (reqIdx < requiredWords.length && group.text === requiredWords[reqIdx]) {
               targetGroupIds.add(group.id);
               reqIdx++;
           }
        }
        
        // Deactivate all cells that didn't match our required words
        for (const cell of this.cells) {
           cell.isActive = false;
        }
        
        // Reactivate ONLY the target cells and rebuild wordGroups array
        this.wordGroups = this.wordGroups.filter(g => targetGroupIds.has(g.id));
        this.wordGroups.forEach((g, i) => {
           g.id = i;
           for (const cell of g.cells) {
               cell.isActive = true;
               cell.isTarget = true;
           }
        });
        
      } else {
        const validCells = this.cells.filter(c => !c.isSpace);
        for (let i = validCells.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [validCells[i], validCells[j]] = [validCells[j], validCells[i]];
        }
        const targets = validCells.slice(0, requiredCharCount);
        targets.sort((a, b) => a.id - b.id);
        
        for (let i = 0; i < targets.length; i++) {
          targets[i].isActive = true;
          targets[i].char = requiredCharsArray[i];
          this.linearTargetIds.push(targets[i].id);
        }
      }

      this.maxHp = requiredCharCount;
      this.hp = this.maxHp;

      if (damageMultiplier > 1.0) {
        const percentToClear = Math.min(0.5, (damageMultiplier - 1.0));
        const numToClear = Math.floor(this.maxHp * percentToClear);
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
      
      if (!this.wordMode) {
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
      if (cell.isSpace || !cell.isActive) {
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
        const g = this.wordGroups.find(group => group.id === this.activeCandidateIds[0]);
        if (g && !g.isCompleted && g.typeIndex < g.cells.length) {
          g.cells[g.typeIndex].isTarget = true;
        }
      } else {
        const g = this.wordGroups.find(group => !group.isCompleted);
        if (g && g.typeIndex < g.cells.length) {
          g.cells[g.typeIndex].isTarget = true;
        }
      }
      
      const allCompleted = this.wordGroups.every(g => g.isCompleted);
      if (allCompleted) {
        this.isDeadState = true;
      }
    } else {
      for (const cell of this.cells) {
        cell.isTarget = false;
      }
      
      // Highlight all currently active linear targets
      for (const id of this.linearTargetIds) {
        const targetCell = this.cells.find(c => c.id === id);
        if (targetCell && targetCell.isActive) {
          targetCell.isTarget = true;
        }
      }
    }
  }

  update(_dt: number) {
  }

  isDead() {
    return this.isDeadState || this.hp <= 0;
  }
  
  getCurrentTargetChars(): string[] {
    if (this.wordMode) {
      if (this.activeCandidateIds.length > 0) {
        const chars: string[] = [];
        for (const id of this.activeCandidateIds) {
          const g = this.wordGroups.find(group => group.id === id);
          if (g && !g.isCompleted && g.typeIndex < g.cells.length) {
            chars.push(g.cells[g.typeIndex].char);
          }
        }
        return chars;
      } else {
        const chars = new Set<string>();
        for (const g of this.wordGroups) {
          if (!g.isCompleted && g.cells.length > 0) {
            chars.add(g.cells[0].char);
          }
        }
        return Array.from(chars);
      }
    } else {
      const activeChars = new Set<string>();
      for (const id of this.linearTargetIds) {
        const targetCell = this.cells.find(c => c.id === id);
        if (targetCell && targetCell.isActive) {
          activeChars.add(targetCell.char);
        }
      }
      return Array.from(activeChars);
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
          // Mismatch: We no longer reset progress on typo. 
          // The player keeps their typed letters and just suffers a combo drop / screen shake in input.ts.
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
      // Any-order linear mode
      for (const id of this.linearTargetIds) {
        const cell = this.cells.find(c => c.id === id);
        if (cell && cell.isActive && cell.char === char) {
          cell.isActive = false;
          this.hp--;
          
          this.updateTargetHighlight();
          
          const anyActive = this.linearTargetIds.some(targetId => {
             const c = this.cells.find(cell => cell.id === targetId);
             return c && c.isActive;
          });
          if (!anyActive) {
            this.isDeadState = true;
            this.linearTargetIds = [];
          }
          return cell;
        }
      }
      return null;
    }
  }
}

export interface StageInfo {
  chapter: number; // 1 to 5
  level: number;   // Linear progression
  title: string;
  shape: string;
  texts: string[];
  repeats: number;
  isBoss: boolean;
  wordMode?: boolean;
}

export const STAGES: StageInfo[] = [
  // Chapter 1: Home Position
  { chapter: 1, level: 1, title: "Stage 1: Home Tutorial", shape: "Snail", texts: ["asdfjkl;"], repeats: 2, isBoss: false },
  { chapter: 1, level: 2, title: "Stage 1: Home Field", shape: "Rabbit", texts: ["asdf jkl; asdf jkl; fjdksla", "asdf jkl;", "sad fad dad fall glass flask"], repeats: 3, isBoss: false, wordMode: true },
  
  // Chapter 2: Top & Bottom Row
  { chapter: 2, level: 3, title: "Stage 2: Top/Bottom Field", shape: "Cat", texts: ["qwer uiOP zxcv m,./", "type top row bottom row quick"], repeats: 4, isBoss: false, wordMode: true },
  { chapter: 2, level: 4, title: "Stage 2: Mixed Mid-Boss", shape: "Dog", texts: ["qwer asdf zxcv uiOP jkl; m,./", "zebra xylophone violin piano flute"], repeats: 8, isBoss: true, wordMode: true },
  
  // Chapter 3: Words
  { chapter: 3, level: 5, title: "Stage 3: Words Field", shape: "Bird", texts: ["monster attack defend magic sword", "hero brave combat health mana potion"], repeats: 5, isBoss: false, wordMode: true },
  { chapter: 3, level: 6, title: "Stage 3: Word Bomb Mid-Boss", shape: "Bomb", texts: ["dragon beast skeleton zombie slime", "fire ice lightning dark holy strike"], repeats: 10, isBoss: true, wordMode: true },
  
  // Chapter 4: Sentences
  { chapter: 4, level: 7, title: "Stage 4: Sentence Field", shape: "Sword", texts: ["The hero steps into the dark dungeon.", "Type fast to survive the deadly attack."], repeats: 3, isBoss: false },
  { chapter: 4, level: 8, title: "Stage 4: Sentence Mid-Boss", shape: "Axe", texts: ["A sharp blade slices through the empty air.", "Monsters are lurking in the shadows."], repeats: 6, isBoss: true },
  
  // Chapter 5: Long Text
  { chapter: 5, level: 9, title: "Stage 5: Final Boss 1", shape: "Skull", texts: ["this is a long paragraph about a monster that lives in the dark cave"], repeats: 20, isBoss: true },
  { chapter: 5, level: 10, title: "Stage 5: The Ultimate Boss", shape: "/horse.png", texts: ["the ultimate challenge awaits you. you must type faster than you ever have before. good luck."], repeats: 20, isBoss: true }
];

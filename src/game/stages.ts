export interface StageConfig {
  level: number;
  chapter: number;
  title: string;
  shape: string | string[];
  texts?: string[];
  repeats: number;
  isBoss?: boolean;
  wordMode?: boolean;
  charPool?: string;
  poolLength?: number;
}

export const STAGES: StageConfig[] = [
  // CHAPTER 1
  {
    level: 1,
    chapter: 1,
    title: "1-1 Home Row",
    shape: ['snail', 'bat', 'bird', 'rabbit'],
    texts: [],
    charPool: "asdfghjkl;'",
    poolLength: 10,
    repeats: 1,
    isBoss: false,
    wordMode: false
  },
  {
    level: 2,
    chapter: 1,
    title: "1-2 Top Row",
    shape: ['snail', 'bat', 'bird', 'rabbit'],
    texts: [],
    charPool: "qwertyuiop",
    poolLength: 15,
    repeats: 1,
    isBoss: false,
    wordMode: false
  },
  {
    level: 3,
    chapter: 1,
    title: "1-3 Bottom Row",
    shape: ['snail', 'bat', 'bird', 'rabbit'],
    texts: [],
    charPool: "zxcvbnm,./",
    poolLength: 15,
    repeats: 1,
    isBoss: false,
    wordMode: false
  },

  // CHAPTER 2
  {
    level: 4,
    chapter: 2,
    title: "Short Words",
    shape: ['bone-gnawer', 'brain', 'cat', 'burning-book'],
    texts: [],
    charPool: "WORDS",
    poolLength: 5,
    repeats: 1,
    isBoss: false,
    wordMode: true
  },

  // CHAPTER 3
  {
    level: 5,
    chapter: 3,
    title: "Short Sentences",
    shape: ['daemon-skull', 'diablo-skull', 'dragon-head', 'evil-moon'],
    texts: [],
    charPool: "PHRASES",
    poolLength: 3,
    repeats: 1,
    isBoss: false,
    wordMode: true
  },

  // CHAPTER 4
  {
    level: 6,
    chapter: 4,
    title: "Full Sentences",
    shape: ['evil-tree', 'fire-axe', 'ghost', 'lightning-storm'],
    texts: [
      "The quick brown fox jumps over the lazy dog.",
      "Pack my box with five dozen liquor jugs.",
      "How vexingly quick daft zebras jump."
    ],
    repeats: 1,
    isBoss: true,
    wordMode: true
  }
];

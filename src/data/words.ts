export type WordType = 'korean' | 'english' | 'code'

export const KOREAN_WORDS = [
  '안녕하세요', '프론트엔드', '자바스크립트', '타입스크립트',
  '웹어셈블리', '비동기처리', '이벤트루프', '리액트네이티브',
  '상태관리', '가상돔', '성능최적화', '컴포넌트', '생명주기',
  '서버사이드렌더링', '정적사이트생성기', '애플리케이션', '데이터베이스',
]

export const ENGLISH_WORDS = [
  'function', 'variable', 'promise', 'callback', 'async',
  'await', 'frontend', 'backend', 'fullstack', 'database',
  'component', 'interface', 'framework', 'library', 'middleware',
  'architecture', 'deployment', 'optimization', 'performance', 'scalability'
]

export const CODE_WORDS = [
  'const a = 1;',
  'let b = 2;',
  '() => {}',
  'function()',
  'import { x } from "y"',
  'console.log()',
  'return true;',
  'if (a === b)',
  'for (let i=0; i<10; i++)',
  'Object.keys(obj)',
  'Array.isArray(arr)',
  'JSON.parse(str)',
  'try { } catch(e) { }'
]

export function getRandomWord(type?: WordType): { text: string, type: WordType } {
  const types: WordType[] = ['korean', 'english', 'code']
  const selectedType = type || types[Math.floor(Math.random() * types.length)]
  
  let list: string[]
  if (selectedType === 'korean') list = KOREAN_WORDS
  else if (selectedType === 'english') list = ENGLISH_WORDS
  else list = CODE_WORDS

  const text = list[Math.floor(Math.random() * list.length)]
  return { text, type: selectedType }
}

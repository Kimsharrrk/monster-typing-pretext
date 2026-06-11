import './style.css';
import { GameEngine } from './game/engine';

async function init() {
  // Wait for fonts to load for accurate Pretext measurement
  await document.fonts.ready;
  
  const engine = new GameEngine();
  engine.start();
  
  // Expose for debugging if needed
  (window as any).gameEngine = engine;
}

init().catch(console.error);

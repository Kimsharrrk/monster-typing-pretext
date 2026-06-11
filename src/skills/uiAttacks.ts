export class UIAttacks {
  static shakeScreen(durationMs: number = 2000) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    canvas.style.transition = 'none';
    let start = performance.now();
    
    const shake = () => {
      const now = performance.now();
      if (now - start > durationMs) {
        canvas.style.transform = 'translate(0px, 0px)';
        return;
      }
      
      const dx = (Math.random() - 0.5) * 20;
      const dy = (Math.random() - 0.5) * 20;
      canvas.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(shake);
    };
    
    shake();
  }

  static flipScreen(durationMs: number = 5000) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    canvas.style.transition = 'transform 0.5s ease';
    canvas.style.transform = 'rotate(180deg) scaleX(-1)';
    
    setTimeout(() => {
      canvas.style.transform = 'rotate(0deg) scaleX(1)';
    }, durationMs);
  }
  
  static requestFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  }

  static async popupAttack() {
    // Open a popup that tells the user to type a random code to close it
    // Wait, due to popup blockers, we must do this on keydown.
    const w = 400;
    const h = 300;
    const left = (window.screen.width / 2) - (w / 2);
    const top = (window.screen.height / 2) - (h / 2);
    const popup = window.open('', 'MonsterAttack', `width=${w},height=${h},top=${top},left=${left}`);
    
    if (popup) {
      popup.document.write(`
        <html style="background:#000; color:#ef4444; font-family:monospace; text-align:center; padding-top:50px;">
          <h1>SYSTEM COMPROMISED</h1>
          <p>The monster has hacked your window!</p>
          <p>Please close this window to continue fighting.</p>
        </html>
      `);
    } else {
      console.warn("Popup blocked by browser.");
    }
  }
}

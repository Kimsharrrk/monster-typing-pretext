export class UIAttacks {
  static requestFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.warn("Fullscreen request failed:", e);
      });
    } else {
      document.exitFullscreen();
    }
  }

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

  static blurScreen(durationMs: number = 4000) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    canvas.style.transition = 'filter 0.5s';
    canvas.style.filter = 'blur(10px)';
    setTimeout(() => {
      canvas.style.filter = 'none';
    }, durationMs);
  }

  static invertColors(durationMs: number = 3000) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    canvas.style.transition = 'filter 0.1s';
    canvas.style.filter = 'invert(100%) hue-rotate(180deg)';
    setTimeout(() => {
      canvas.style.filter = 'none';
    }, durationMs);
  }

  static popupAttack() {
    const popup = document.createElement('div');
    popup.id = 'monster-fake-popup';
    popup.style.position = 'fixed';
    popup.style.top = Math.random() * 50 + 10 + '%';
    popup.style.left = Math.random() * 50 + 10 + '%';
    popup.style.width = '400px';
    popup.style.height = '200px';
    popup.style.backgroundColor = '#000';
    popup.style.border = '4px solid #ef4444';
    popup.style.boxShadow = '0 0 20px #ef4444';
    popup.style.color = '#ef4444';
    popup.style.zIndex = '9999';
    popup.style.padding = '20px';
    popup.style.fontFamily = '"Press Start 2P", monospace';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    popup.style.justifyContent = 'center';
    popup.style.alignItems = 'center';
    popup.style.textAlign = 'center';
    popup.innerHTML = `
      <h3 style="margin-bottom:20px;">VIRUS WARNING!</h3>
      <p style="font-size:12px; line-height:1.5;">The monster has blocked your view! Keep typing to survive, or wait for the virus to pass.</p>
    `;
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 5000);
  }
}

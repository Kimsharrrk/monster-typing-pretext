export class MultiplayerManager {
  channel: BroadcastChannel;
  opponentHp: number = 100;
  opponentScore: number = 0;
  onOpponentUpdate: (hp: number, score: number) => void;

  constructor(onOpponentUpdate: (hp: number, score: number) => void) {
    this.channel = new BroadcastChannel('monster-typing-pvp');
    this.onOpponentUpdate = onOpponentUpdate;

    this.channel.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'UPDATE') {
        this.opponentHp = data.hp;
        this.opponentScore = data.score;
        this.onOpponentUpdate(this.opponentHp, this.opponentScore);
      }
    };
  }

  sendUpdate(hp: number, score: number) {
    this.channel.postMessage({
      type: 'UPDATE',
      hp,
      score
    });
  }

  disconnect() {
    this.channel.close();
  }
}

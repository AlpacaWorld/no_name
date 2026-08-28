export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;

  socketId?: string;
  connected: boolean;
  hasConnected: boolean;
}

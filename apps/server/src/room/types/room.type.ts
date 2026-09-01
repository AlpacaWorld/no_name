import { Player } from './player.type';
import { Game } from './game.type';

export type RoomStatus =
  | 'WAITING'
  | 'PLAYING'
  | 'CLOSED';

export interface Room {
  id: string;
  hostId: string;
  status: RoomStatus;
  players: Map<string, Player>;
  game?: Game;
  createdAt: number;
}

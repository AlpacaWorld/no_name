import type { PlayerResponse } from './player';

export type RoomStatus =
  | 'WAITING'
  | 'PLAYING'
  | 'CLOSED';

export interface RoomResponse {
  id: string;
  hostId: string;
  status: RoomStatus;
  players: PlayerResponse[];
  createdAt: number;
}
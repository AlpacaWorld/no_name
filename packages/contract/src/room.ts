import type { PlayerResponse } from './player';

export const ROOM_STATUS = {
  WAITING: 'WAITING',
  PLAYING: 'PLAYING',
  CLOSED: 'CLOSED',
} as const;

export type RoomStatus =
  (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];

export interface RoomResponse {
  id: string;
  hostId: string;
  status: RoomStatus;
  players: PlayerResponse[];
  createdAt: number;
}
import type { PlayerResponse } from '../player.js';
import type { RoomResponse } from '../room.js';

export const ROOM_EVENT = {
  JOIN: 'room:join',
  PLAYER_JOINED: 'room:player-joined',
  PLAYER_RECONNECTED: 'room:player-reconnected',
  PLAYER_DISCONNECTED: 'room:player-disconnected',
  STATE: 'room:state',
} as const;

export interface RoomJoinPayload {
  roomId: string;
  playerId: string;
}

export interface PlayerJoinedPayload {
  player: PlayerResponse;
}

export interface PlayerReconnectedPayload {
  player: PlayerResponse;
}

export interface PlayerDisconnectedPayload {
  playerId: string;
}

export interface RoomStatePayload {
  room: RoomResponse;
}
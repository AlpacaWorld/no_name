import type { PlayerResponse } from '../player';
import type { RoomResponse } from '../room';

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
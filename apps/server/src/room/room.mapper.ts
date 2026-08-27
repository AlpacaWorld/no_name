import type {
  PlayerResponse,
  RoomResponse,
} from '@repo/contract';

import type { Player } from './types/player.type';
import type { Room } from './types/room.type';

export function toPlayerResponse(
  player: Player,
): PlayerResponse {
  return {
    id: player.id,
    nickname: player.nickname,
    isHost: player.isHost,
  };
}

export function toRoomResponse(
  room: Room,
): RoomResponse {
  return {
    id: room.id,
    hostId: room.hostId,
    status: room.status,
    players: Array.from(room.players.values())
      .map(toPlayerResponse),
    createdAt: room.createdAt,
  };
}
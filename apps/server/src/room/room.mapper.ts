import type {
  PlayerResponse,
  GameResponse,
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
    connected: player.connected,
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
    game: room.game ? toGameResponse(room.game) : undefined,
    createdAt: room.createdAt,
  };
}

function toGameResponse(game: Room['game'] & {}) : GameResponse {
  return {
    phase: game.phase,
    voteCount: game.votes.size,
    playerCount: game.playerIds.length,
    voteCounts: game.phase === 'VOTING'
      ? game.playerIds.map((playerId) => ({
        playerId,
        count: Array.from(game.votes.values())
          .filter((targetId) => targetId === playerId).length,
      }))
      : undefined,
    winner: game.winner,
    keyword: game.phase === 'FINISHED' ? game.keyword : undefined,
  };
}

import type { PlayerResponse } from './player';

export const ROOM_STATUS = {
  WAITING: 'WAITING',
  PLAYING: 'PLAYING',
  CLOSED: 'CLOSED',
} as const;

export type RoomStatus =
  (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];

export const GAME_PHASE = {
  DISCUSSION: 'DISCUSSION',
  VOTING: 'VOTING',
  LIAR_GUESSING: 'LIAR_GUESSING',
  FINISHED: 'FINISHED',
} as const;

export type GamePhase =
  (typeof GAME_PHASE)[keyof typeof GAME_PHASE];

export type GameWinner = 'LIAR' | 'CITIZENS';

export interface VoteCountResponse {
  playerId: string;
  count: number;
}

export interface GameResponse {
  phase: GamePhase;
  voteCount: number;
  playerCount: number;
  voteCounts?: VoteCountResponse[];
  winner?: GameWinner;
  keyword?: string;
}

export interface RoomResponse {
  id: string;
  hostId: string;
  status: RoomStatus;
  players: PlayerResponse[];
  game?: GameResponse;
  createdAt: number;
}

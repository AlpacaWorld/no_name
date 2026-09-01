import { GamePhase, GameWinner } from '@repo/contract';

export interface Game {
  category: string;
  keyword: string;
  liarId: string;
  playerIds: string[];
  phase: GamePhase;
  votes: Map<string, string>;
  winner?: GameWinner;
}

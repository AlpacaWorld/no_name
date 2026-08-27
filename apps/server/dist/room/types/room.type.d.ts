import { Player } from './player.type';
export type RoomStatus = 'WAITING' | 'PLAYING' | 'CLOSED';
export interface Room {
    id: string;
    hostId: string;
    status: RoomStatus;
    players: Map<string, Player>;
    createdAt: number;
}

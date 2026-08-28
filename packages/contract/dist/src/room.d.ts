import type { PlayerResponse } from './player';
export declare const ROOM_STATUS: {
    readonly WAITING: 'WAITING';
    readonly PLAYING: 'PLAYING';
    readonly CLOSED: 'CLOSED';
};
export type RoomStatus = (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];
export interface RoomResponse {
    id: string;
    hostId: string;
    status: RoomStatus;
    players: PlayerResponse[];
    createdAt: number;
}

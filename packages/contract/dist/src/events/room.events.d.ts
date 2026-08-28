import type { PlayerResponse } from '../player.js';
import type { RoomResponse } from '../room.js';
export declare const ROOM_EVENT: {
    readonly JOIN: 'room:join';
    readonly PLAYER_JOINED: 'room:player-joined';
    readonly PLAYER_RECONNECTED: 'room:player-reconnected';
    readonly PLAYER_DISCONNECTED: 'room:player-disconnected';
    readonly STATE: 'room:state';
};
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

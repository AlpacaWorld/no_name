import type { PlayerResponse, RoomResponse } from '@repo/contract';
import { RoomService } from './room.service';
interface CreateRoomRequest {
    nickname: string;
}
interface JoinRoomRequest {
    nickname: string;
}
export declare class RoomController {
    private readonly roomService;
    constructor(roomService: RoomService);
    createRoom(body: CreateRoomRequest): {
        room: RoomResponse;
        playerId: `${string}-${string}-${string}-${string}-${string}`;
    };
    getRoom(roomId: string): RoomResponse;
    joinRoom(roomId: string, body: JoinRoomRequest): {
        player: PlayerResponse;
    };
}
export {};

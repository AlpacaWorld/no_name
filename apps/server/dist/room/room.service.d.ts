import { Room } from './types/room.type';
import { Player } from './types/player.type';
import { RoomStatus } from '@repo/contract';
export declare class RoomService {
    private readonly rooms;
    createRoom(nickname: string): {
        room: Room;
        playerId: `${string}-${string}-${string}-${string}-${string}`;
    };
    getRoom(roomId: string): Room;
    joinRoom(roomId: string, nickname: string): {
        room: Room;
        player: Player;
    };
    getPlayer(roomId: string, playerId: string): Player;
    removePlayer(roomId: string, playerId: string): void;
    updateStatus(roomId: string, status: RoomStatus): Room;
    connectPlayer(roomId: string, playerId: string, socketId: string): {
        player: Player;
        reconnected: boolean;
    };
    disconnectPlayer(roomId: string, playerId: string): Player;
    private generateRoomId;
}

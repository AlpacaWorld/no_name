import { OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { type RoomJoinPayload } from '@repo/contract';
import { RoomService } from './room.service';
export declare class RoomGateway implements OnGatewayDisconnect {
    private readonly roomService;
    server: Server;
    constructor(roomService: RoomService);
    handleJoinRoom(data: RoomJoinPayload, socket: Socket): void;
    handleDisconnect(socket: Socket): void;
}

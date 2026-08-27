import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import {
  ROOM_EVENT,
  type RoomJoinPayload,
} from '@repo/contract';

import { RoomService } from './room.service';
import { toPlayerResponse } from './room.mapper';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RoomGateway
  implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly roomService: RoomService,
  ) { }

  @SubscribeMessage(ROOM_EVENT.JOIN)
  handleJoinRoom(
    @MessageBody() data: RoomJoinPayload,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(data.roomId);

    const result =
      this.roomService.connectPlayer(
        data.roomId,
        data.playerId,
        socket.id,
      );

    socket.data.roomId = data.roomId;
    socket.data.playerId = data.playerId;

    const player = toPlayerResponse(
      result.player,
    );

    if (result.reconnected) {
      this.server
        .to(data.roomId)
        .emit(
          ROOM_EVENT.PLAYER_RECONNECTED,
          { player },
        );

      return;
    }

    this.server
      .to(data.roomId)
      .emit(
        ROOM_EVENT.PLAYER_JOINED,
        { player },
      );
  }

  handleDisconnect(socket: Socket) {
    const { roomId, playerId } = socket.data;

    if (!roomId || !playerId) return;

    this.roomService.disconnectPlayer(
      roomId,
      playerId,
    );

    socket.to(roomId).emit(
      ROOM_EVENT.PLAYER_DISCONNECTED,
      { playerId },
    );
  }
}
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import {
  ROOM_EVENT,
  type RoomJoinPayload,
} from '@repo/contract';

import { RoomService } from './room.service';
import { toPlayerResponse, toRoomResponse } from './room.mapper';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RoomGateway
  implements OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();
  private readonly disconnectGraceMs = Number(
    process.env.PLAYER_DISCONNECT_GRACE_MS ?? 30_000,
  );

  constructor(
    private readonly roomService: RoomService,
  ) { }

  @SubscribeMessage(ROOM_EVENT.JOIN)
  handleJoinRoom(
    @MessageBody() data: RoomJoinPayload,
    @ConnectedSocket() socket: Socket,
  ) {
    const result =
      this.roomService.connectPlayer(
        data.roomId,
        data.playerId,
        socket.id,
      );

    this.clearDisconnectTimer(data.roomId, data.playerId);
    socket.join(data.roomId);

    socket.data.roomId = data.roomId;
    socket.data.playerId = data.playerId;

    if (!result.connectionChanged) {
      socket.emit(ROOM_EVENT.STATE, {
        room: toRoomResponse(result.room),
      });
      return;
    }

    const player = toPlayerResponse(result.player);

    if (result.reconnected) {
      this.server
        .to(data.roomId)
        .emit(
          ROOM_EVENT.PLAYER_RECONNECTED,
          { player },
        );

    } else {
      this.server
        .to(data.roomId)
        .emit(
          ROOM_EVENT.PLAYER_JOINED,
          { player },
        );
    }

    this.server
      .to(data.roomId)
      .emit(
        ROOM_EVENT.STATE,
        { room: toRoomResponse(result.room) },
      );
  }

  @SubscribeMessage(ROOM_EVENT.START)
  handleStartGame(
    @ConnectedSocket() socket: Socket,
  ) {
    const { roomId, playerId } = socket.data;

    if (!roomId || !playerId) return;

    const room = this.roomService.startGame(roomId, playerId);

    this.server.to(roomId).emit(ROOM_EVENT.STARTED, {
      room: toRoomResponse(room),
    });
    this.server.to(roomId).emit(ROOM_EVENT.STATE, {
      room: toRoomResponse(room),
    });
  }

  handleDisconnect(socket: Socket) {
    const { roomId, playerId } = socket.data;

    if (!roomId || !playerId) return;

    const result = this.roomService.disconnectPlayer(
      roomId,
      playerId,
      socket.id,
    );

    if (!result) return;

    socket.to(roomId).emit(
      ROOM_EVENT.PLAYER_DISCONNECTED,
      { playerId },
    );

    this.server
      .to(roomId)
      .emit(ROOM_EVENT.STATE, {
        room: toRoomResponse(result.room),
      });

    this.schedulePlayerRemoval(roomId, playerId);
  }

  onModuleDestroy() {
    this.disconnectTimers.forEach((timer) => clearTimeout(timer));
    this.disconnectTimers.clear();
  }

  private schedulePlayerRemoval(roomId: string, playerId: string) {
    this.clearDisconnectTimer(roomId, playerId);

    const key = this.timerKey(roomId, playerId);
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(key);

      const result = this.roomService.expireDisconnectedPlayer(
        roomId,
        playerId,
      );

      if (!result) return;

      if (result.roomClosed) {
        this.clearRoomTimers(roomId);
        this.server.to(roomId).emit(ROOM_EVENT.CLOSED, {
          roomId,
          reason: result.closeReason,
        });
        return;
      }

      this.server.to(roomId).emit(ROOM_EVENT.PLAYER_LEFT, {
        playerId,
      });
      this.server.to(roomId).emit(ROOM_EVENT.STATE, {
        room: toRoomResponse(result.room),
      });
    }, this.disconnectGraceMs);

    this.disconnectTimers.set(key, timer);
  }

  private clearDisconnectTimer(roomId: string, playerId: string) {
    const key = this.timerKey(roomId, playerId);
    const timer = this.disconnectTimers.get(key);

    if (!timer) return;

    clearTimeout(timer);
    this.disconnectTimers.delete(key);
  }

  private clearRoomTimers(roomId: string) {
    const prefix = `${roomId}:`;

    this.disconnectTimers.forEach((timer, key) => {
      if (!key.startsWith(prefix)) return;

      clearTimeout(timer);
      this.disconnectTimers.delete(key);
    });
  }

  private timerKey(roomId: string, playerId: string) {
    return `${roomId}:${playerId}`;
  }
}

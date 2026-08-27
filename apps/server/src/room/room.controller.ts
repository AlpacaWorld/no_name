import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import type { Room } from './types/room.type';
import type { Player } from './types/player.type';

import type {
  PlayerResponse,
  RoomResponse,
} from '@repo/contract';

import { RoomService } from './room.service';

interface CreateRoomRequest {
  nickname: string;
}

interface JoinRoomRequest {
  nickname: string;
}

@Controller('rooms')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
  ) {}

  @Post()
  createRoom(
    @Body() body: CreateRoomRequest,
  ) {
    const { room, playerId } =
      this.roomService.createRoom(body.nickname);

    return {
      room: this.toRoomResponse(room),
      playerId,
    };
  }

  @Get(':roomId')
  getRoom(
    @Param('roomId') roomId: string,
  ): RoomResponse {
    const room = this.roomService.getRoom(roomId);

    return this.toRoomResponse(room);
  }

  @Post(':roomId/players')
  joinRoom(
    @Param('roomId') roomId: string,
    @Body() body: JoinRoomRequest,
  ) {
    const { player } =
      this.roomService.joinRoom(
        roomId,
        body.nickname,
      );

    return {
      player: this.toPlayerResponse(player),
    };
  }

  private toRoomResponse(
    room: Room,
  ): RoomResponse {
    return {
      id: room.id,
      hostId: room.hostId,
      status: room.status,
      players: Array.from(
        room.players.values(),
      ).map((player) =>
        this.toPlayerResponse(player),
      ),
      createdAt: room.createdAt,
    };
  }

  private toPlayerResponse(
    player: Player,
  ): PlayerResponse {
    return {
      id: player.id,
      nickname: player.nickname,
      isHost: player.isHost,
    };
  }
}
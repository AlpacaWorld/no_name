import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import type {
  PlayerResponse,
  RoomResponse,
} from '@repo/contract';

import { RoomService } from './room.service';
import { toRoomResponse, toPlayerResponse } from './room.mapper';

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
  ) { }

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Post()
  createRoom(
    @Body() body: CreateRoomRequest,
  ) {
    const { room, playerId } =
      this.roomService.createRoom(body.nickname);

    return {
      room: toRoomResponse(room),
      playerId,
    };
  }

  @Get(':roomId')
  getRoom(
    @Param('roomId') roomId: string,
  ): RoomResponse {
    const room = this.roomService.getRoom(roomId);

    return toRoomResponse(room);
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
      player: toPlayerResponse(player),
    };
  }
}

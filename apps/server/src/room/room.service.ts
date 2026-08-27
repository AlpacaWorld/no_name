import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { Room } from './types/room.type';
import { Player } from './types/player.type';

@Injectable()
export class RoomService {
  private readonly rooms = new Map<string, Room>();

  /**
   * 방 생성
   */
  createRoom(nickname: string) {
    const roomId = this.generateRoomId();
    const playerId = randomUUID();

    const host: Player = {
      id: playerId,
      nickname,
      isHost: true,
    };

    const room: Room = {
      id: roomId,
      hostId: playerId,
      status: 'WAITING',
      players: new Map([[playerId, host]]),
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);

    return {
      room,
      playerId,
    };
  }

  /**
   * 방 조회
   */
  getRoom(roomId: string): Room {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    return room;
  }

  /**
   * 방 참가
   */
  joinRoom(
    roomId: string,
    nickname: string,
  ) {
    const room = this.getRoom(roomId);

    if (room.status !== 'WAITING') {
      throw new Error('이미 게임이 시작된 방입니다.');
    }

    const playerId = randomUUID();

    const player: Player = {
      id: playerId,
      nickname,
      isHost: false,
    };

    room.players.set(playerId, player);

    return {
      room,
      player,
    };
  }

  /**
   * 플레이어 조회
   */
  getPlayer(
    roomId: string,
    playerId: string,
  ): Player {
    const room = this.getRoom(roomId);

    const player = room.players.get(playerId);

    if (!player) {
      throw new NotFoundException('존재하지 않는 플레이어입니다.');
    }

    return player;
  }

  /**
   * 플레이어 제거
   */
  removePlayer(
    roomId: string,
    playerId: string,
  ) {
    const room = this.getRoom(roomId);

    room.players.delete(playerId);
  }

  /**
   * 방 상태 변경
   */
  updateStatus(
    roomId: string,
    status: Room['status'],
  ) {
    const room = this.getRoom(roomId);

    room.status = status;

    return room;
  }

  /**
   * 방 ID 생성
   */
  private generateRoomId(): string {
    let roomId: string;

    do {
      roomId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
    } while (this.rooms.has(roomId));

    return roomId;
  }
}
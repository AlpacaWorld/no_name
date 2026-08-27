import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { Room } from './types/room.type';
import { Player } from './types/player.type';
import { ROOM_STATUS, RoomStatus } from '@repo/contract';

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
      connected: false,
    };

    const room: Room = {
      id: roomId,
      hostId: playerId,
      status: ROOM_STATUS.WAITING,
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

    if (room.status !== ROOM_STATUS.WAITING) {
      throw new Error('이미 게임이 시작된 방입니다.');
    }

    const playerId = randomUUID();

    const player: Player = {
      id: playerId,
      nickname,
      isHost: false,
      connected: false,
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
    status: RoomStatus,
  ) {
    const room = this.getRoom(roomId);

    room.status = status;

    return room;
  }

  /**
   * 플레이어 소켓 연결
   */
  connectPlayer(
    roomId: string,
    playerId: string,
    socketId: string,
  ) {
    const player = this.getPlayer(
      roomId,
      playerId,
    );

    const wasConnected =
      player.connected;

    player.socketId = socketId;
    player.connected = true;

    return {
      player,
      reconnected: wasConnected === false,
    };
  }

  /**
   * 플레이어 소켓 연결 해제
   */
  disconnectPlayer(
    roomId: string,
    playerId: string,
  ) {
    const player = this.getPlayer(
      roomId,
      playerId,
    );

    player.socketId = undefined;
    player.connected = false;

    return player;
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
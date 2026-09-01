import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      hasConnected: false,
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
      hasConnected: false,
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
   * 방장만 최소 인원을 충족한 대기실에서 게임을 시작할 수 있다.
   */
  startGame(roomId: string, playerId: string) {
    const room = this.getRoom(roomId);

    if (room.hostId !== playerId) {
      throw new ForbiddenException('방장만 게임을 시작할 수 있습니다.');
    }

    if (room.status !== ROOM_STATUS.WAITING) {
      throw new BadRequestException('대기 중인 방에서만 게임을 시작할 수 있습니다.');
    }

    const connectedPlayers = Array.from(room.players.values())
      .filter((player) => player.connected);

    if (connectedPlayers.length < 3) {
      throw new BadRequestException('게임을 시작하려면 접속 중인 플레이어가 3명 이상 필요합니다.');
    }

    room.status = ROOM_STATUS.PLAYING;

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
    const room = this.getRoom(roomId);
    const player = room.players.get(playerId);

    if (!player) {
      throw new NotFoundException('존재하지 않는 플레이어입니다.');
    }

    const wasConnected = player.connected;
    const reconnected = player.hasConnected && !wasConnected;

    player.socketId = socketId;
    player.connected = true;
    player.hasConnected = true;

    return {
      room,
      player,
      reconnected,
      connectionChanged: !wasConnected,
    };
  }

  /**
   * 플레이어 소켓 연결 해제
   */
  disconnectPlayer(
    roomId: string,
    playerId: string,
    socketId: string,
  ) {
    const room = this.rooms.get(roomId);
    const player = room?.players.get(playerId);

    if (!room || !player || player.socketId !== socketId) {
      return undefined;
    }

    player.socketId = undefined;
    player.connected = false;

    return { room, player };
  }

  /**
   * 재접속 유예 시간이 지난 연결 해제 플레이어를 제거한다.
   */
  expireDisconnectedPlayer(
    roomId: string,
    playerId: string,
  ) {
    const room = this.rooms.get(roomId);
    const player = room?.players.get(playerId);

    if (!room || !player || player.connected) {
      return undefined;
    }

    room.players.delete(playerId);

    if (player.isHost) {
      this.rooms.delete(roomId);
      return {
        room,
        player,
        roomClosed: true,
        closeReason: 'HOST_LEFT' as const,
      };
    }

    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      return {
        room,
        player,
        roomClosed: true,
        closeReason: 'EMPTY' as const,
      };
    }

    return {
      room,
      player,
      roomClosed: false,
    };
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

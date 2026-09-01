import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { Room } from './types/room.type';
import { Player } from './types/player.type';
import { GAME_KEYWORDS } from './game-keywords';
import {
  GAME_PHASE,
  ROOM_STATUS,
  RoomStatus,
} from '@repo/contract';

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
      throw new BadRequestException('이미 게임이 시작된 방입니다.');
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

    if (connectedPlayers.length !== room.players.size) {
      throw new BadRequestException('모든 참가자가 접속한 뒤 게임을 시작할 수 있습니다.');
    }

    const topic = GAME_KEYWORDS[Math.floor(Math.random() * GAME_KEYWORDS.length)];
    const liar = connectedPlayers[Math.floor(Math.random() * connectedPlayers.length)];

    room.status = ROOM_STATUS.PLAYING;
    room.game = {
      category: topic.category,
      keyword: topic.keyword,
      liarId: liar.id,
      playerIds: connectedPlayers.map((player) => player.id),
      phase: GAME_PHASE.DISCUSSION,
      votes: new Map(),
    };

    return room;
  }

  getRoleAssignment(roomId: string, playerId: string) {
    const room = this.getRoom(roomId);
    const game = room.game;

    if (!game || room.status !== ROOM_STATUS.PLAYING) {
      throw new BadRequestException('진행 중인 게임이 없습니다.');
    }

    if (!game.playerIds.includes(playerId)) {
      throw new ForbiddenException('게임 참가자가 아닙니다.');
    }

    if (game.liarId === playerId) {
      return { role: 'LIAR' as const, category: game.category };
    }

    return {
      role: 'CITIZEN' as const,
      category: game.category,
      keyword: game.keyword,
    };
  }

  beginVoting(roomId: string, playerId: string) {
    const room = this.getRoom(roomId);
    const game = this.getActiveGame(room);

    if (room.hostId !== playerId) {
      throw new ForbiddenException('방장만 투표를 시작할 수 있습니다.');
    }

    if (game.phase !== GAME_PHASE.DISCUSSION) {
      throw new BadRequestException('토론 단계에서만 투표를 시작할 수 있습니다.');
    }

    game.phase = GAME_PHASE.VOTING;

    return room;
  }

  castVote(roomId: string, playerId: string, targetId: string) {
    const room = this.getRoom(roomId);
    const game = this.getActiveGame(room);

    if (game.phase !== GAME_PHASE.VOTING) {
      throw new BadRequestException('투표 단계가 아닙니다.');
    }

    if (!game.playerIds.includes(playerId) || !game.playerIds.includes(targetId)) {
      throw new ForbiddenException('게임 참가자만 투표할 수 있습니다.');
    }

    game.votes.set(playerId, targetId);

    if (game.votes.size === game.playerIds.length) {
      this.resolveVote(game);
    }

    return room;
  }

  guessKeyword(roomId: string, playerId: string, keyword: string) {
    const room = this.getRoom(roomId);
    const game = this.getActiveGame(room);

    if (game.phase !== GAME_PHASE.LIAR_GUESSING) {
      throw new BadRequestException('라이어 추측 단계가 아닙니다.');
    }

    if (game.liarId !== playerId) {
      throw new ForbiddenException('라이어만 키워드를 추측할 수 있습니다.');
    }

    game.winner = this.normalizeKeyword(keyword) === this.normalizeKeyword(game.keyword)
      ? 'LIAR'
      : 'CITIZENS';
    game.phase = GAME_PHASE.FINISHED;

    return room;
  }

  restartGame(roomId: string, playerId: string) {
    const room = this.getRoom(roomId);
    const game = this.getActiveGame(room);

    if (room.hostId !== playerId) {
      throw new ForbiddenException('방장만 게임을 재시작할 수 있습니다.');
    }

    if (game.phase !== GAME_PHASE.FINISHED) {
      throw new BadRequestException('게임이 종료된 뒤에만 재시작할 수 있습니다.');
    }

    room.game = undefined;
    room.status = ROOM_STATUS.WAITING;

    return room;
  }

  private getActiveGame(room: Room) {
    if (!room.game || room.status !== ROOM_STATUS.PLAYING) {
      throw new BadRequestException('진행 중인 게임이 없습니다.');
    }

    return room.game;
  }

  private resolveVote(game: Room['game'] & {}) {
    const tally = new Map<string, number>();

    game.votes.forEach((targetId) => {
      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
    });

    const [mostVotedId, maxVotes] = Array.from(tally.entries())
      .sort(([, left], [, right]) => right - left)[0];

    if (mostVotedId === game.liarId && maxVotes > game.playerIds.length / 2) {
      game.phase = GAME_PHASE.LIAR_GUESSING;
      return;
    }

    game.winner = 'LIAR';
    game.phase = GAME_PHASE.FINISHED;
  }

  private normalizeKeyword(keyword: string) {
    return keyword.trim().toLocaleLowerCase('ko-KR');
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

import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { GAME_PHASE, ROOM_STATUS } from '@repo/contract';

import { RoomService } from './room.service';
import { toRoomResponse } from './room.mapper';

interface StartedGame {
  service: RoomService;
  roomId: string;
  hostId: string;
  guestIds: [string, string];
}

describe('RoomService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('requires the host and three connected players to start a game', () => {
    const service = new RoomService();
    const { room, playerId: hostId } = service.createRoom('host');
    const { player: guest } = service.joinRoom(room.id, 'guest');

    expect(() => service.startGame(room.id, guest.id))
      .toThrow(ForbiddenException);

    service.connectPlayer(room.id, hostId, 'host-socket');
    service.connectPlayer(room.id, guest.id, 'guest-socket');

    expect(() => service.startGame(room.id, hostId))
      .toThrow(BadRequestException);
  });

  it('opens a liar guess only when the liar receives a majority', () => {
    const { service, roomId, hostId, guestIds } = createStartedGame();

    service.beginVoting(roomId, hostId);
    service.castVote(roomId, hostId, hostId);
    service.castVote(roomId, guestIds[0], hostId);
    service.castVote(roomId, guestIds[1], hostId);

    const room = service.getRoom(roomId);

    expect(room.game?.phase).toBe(GAME_PHASE.LIAR_GUESSING);
    expect(service.getRoleAssignment(roomId, hostId))
      .toEqual({ role: 'LIAR', category: '과일' });

    service.guessKeyword(roomId, hostId, ' 사과 ');

    expect(room.game?.phase).toBe(GAME_PHASE.FINISHED);
    expect(room.game?.winner).toBe('LIAR');
  });

  it('does not serialize the liar identity or keyword in the public room state', () => {
    const { service, roomId } = createStartedGame();
    const publicState = JSON.stringify(toRoomResponse(service.getRoom(roomId)));

    expect(publicState).not.toContain('liarId');
    expect(publicState).not.toContain('사과');
  });

  it('makes the liar win when no candidate has a majority', () => {
    const { service, roomId, hostId, guestIds } = createStartedGame();

    service.beginVoting(roomId, hostId);
    service.castVote(roomId, hostId, guestIds[0]);
    service.castVote(roomId, guestIds[0], guestIds[1]);
    service.castVote(roomId, guestIds[1], hostId);

    const room = service.getRoom(roomId);

    expect(room.game?.phase).toBe(GAME_PHASE.FINISHED);
    expect(room.game?.winner).toBe('LIAR');
  });

  it('returns the same members to the waiting room when the host restarts', () => {
    const { service, roomId, hostId, guestIds } = createStartedGame();

    service.beginVoting(roomId, hostId);
    service.castVote(roomId, hostId, guestIds[0]);
    service.castVote(roomId, guestIds[0], guestIds[1]);
    service.castVote(roomId, guestIds[1], hostId);

    const room = service.restartGame(roomId, hostId);

    expect(room.status).toBe(ROOM_STATUS.WAITING);
    expect(room.game).toBeUndefined();
    expect(room.players.size).toBe(3);
  });

  it('ignores a stale socket disconnect and closes the room after the host expires', () => {
    const service = new RoomService();
    const { room, playerId: hostId } = service.createRoom('host');

    service.connectPlayer(room.id, hostId, 'old-socket');
    service.connectPlayer(room.id, hostId, 'new-socket');

    expect(service.disconnectPlayer(room.id, hostId, 'old-socket'))
      .toBeUndefined();
    expect(service.getPlayer(room.id, hostId).connected).toBe(true);

    service.disconnectPlayer(room.id, hostId, 'new-socket');
    const result = service.expireDisconnectedPlayer(room.id, hostId);

    expect(result?.roomClosed).toBe(true);
    expect(result?.closeReason).toBe('HOST_LEFT');
    expect(() => service.getRoom(room.id)).toThrow();
  });
});

function createStartedGame(): StartedGame {
  const service = new RoomService();
  const { room, playerId: hostId } = service.createRoom('host');
  const { player: guestOne } = service.joinRoom(room.id, 'guest-one');
  const { player: guestTwo } = service.joinRoom(room.id, 'guest-two');

  service.connectPlayer(room.id, hostId, 'host-socket');
  service.connectPlayer(room.id, guestOne.id, 'guest-one-socket');
  service.connectPlayer(room.id, guestTwo.id, 'guest-two-socket');
  jest.spyOn(Math, 'random').mockReturnValue(0);
  service.startGame(room.id, hostId);

  return {
    service,
    roomId: room.id,
    hostId,
    guestIds: [guestOne.id, guestTwo.id],
  };
}

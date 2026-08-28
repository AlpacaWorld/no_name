import type { PlayerResponse, RoomResponse } from '@repo/contract';
import type { Player } from './types/player.type';
import type { Room } from './types/room.type';
export declare function toPlayerResponse(player: Player): PlayerResponse;
export declare function toRoomResponse(room: Room): RoomResponse;

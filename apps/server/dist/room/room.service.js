"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let RoomService = class RoomService {
    rooms = new Map();
    createRoom(nickname) {
        const roomId = this.generateRoomId();
        const playerId = (0, crypto_1.randomUUID)();
        const host = {
            id: playerId,
            nickname,
            isHost: true,
        };
        const room = {
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
    getRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new common_1.NotFoundException('존재하지 않는 방입니다.');
        }
        return room;
    }
    joinRoom(roomId, nickname) {
        const room = this.getRoom(roomId);
        if (room.status !== 'WAITING') {
            throw new Error('이미 게임이 시작된 방입니다.');
        }
        const playerId = (0, crypto_1.randomUUID)();
        const player = {
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
    getPlayer(roomId, playerId) {
        const room = this.getRoom(roomId);
        const player = room.players.get(playerId);
        if (!player) {
            throw new common_1.NotFoundException('존재하지 않는 플레이어입니다.');
        }
        return player;
    }
    removePlayer(roomId, playerId) {
        const room = this.getRoom(roomId);
        room.players.delete(playerId);
    }
    updateStatus(roomId, status) {
        const room = this.getRoom(roomId);
        room.status = status;
        return room;
    }
    generateRoomId() {
        let roomId;
        do {
            roomId = Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();
        } while (this.rooms.has(roomId));
        return roomId;
    }
};
exports.RoomService = RoomService;
exports.RoomService = RoomService = __decorate([
    (0, common_1.Injectable)()
], RoomService);
//# sourceMappingURL=room.service.js.map
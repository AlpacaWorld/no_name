"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPlayerResponse = toPlayerResponse;
exports.toRoomResponse = toRoomResponse;
function toPlayerResponse(player) {
    return {
        id: player.id,
        nickname: player.nickname,
        isHost: player.isHost,
    };
}
function toRoomResponse(room) {
    return {
        id: room.id,
        hostId: room.hostId,
        status: room.status,
        players: Array.from(room.players.values())
            .map(toPlayerResponse),
        createdAt: room.createdAt,
    };
}
//# sourceMappingURL=room.mapper.js.map
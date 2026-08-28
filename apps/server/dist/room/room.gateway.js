"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const contract_1 = require("@repo/contract");
const room_service_1 = require("./room.service");
const room_mapper_1 = require("./room.mapper");
let RoomGateway = class RoomGateway {
    roomService;
    server;
    constructor(roomService) {
        this.roomService = roomService;
    }
    handleJoinRoom(data, socket) {
        socket.join(data.roomId);
        const result = this.roomService.connectPlayer(data.roomId, data.playerId, socket.id);
        socket.data.roomId = data.roomId;
        socket.data.playerId = data.playerId;
        const player = (0, room_mapper_1.toPlayerResponse)(result.player);
        if (result.reconnected) {
            this.server
                .to(data.roomId)
                .emit(contract_1.ROOM_EVENT.PLAYER_RECONNECTED, { player });
            return;
        }
        this.server
            .to(data.roomId)
            .emit(contract_1.ROOM_EVENT.PLAYER_JOINED, { player });
    }
    handleDisconnect(socket) {
        const { roomId, playerId } = socket.data;
        if (!roomId || !playerId)
            return;
        this.roomService.disconnectPlayer(roomId, playerId);
        socket.to(roomId).emit(contract_1.ROOM_EVENT.PLAYER_DISCONNECTED, { playerId });
    }
};
exports.RoomGateway = RoomGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RoomGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)(contract_1.ROOM_EVENT.JOIN),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], RoomGateway.prototype, "handleJoinRoom", null);
exports.RoomGateway = RoomGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [room_service_1.RoomService])
], RoomGateway);
//# sourceMappingURL=room.gateway.js.map
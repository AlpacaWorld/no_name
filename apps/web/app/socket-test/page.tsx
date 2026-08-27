'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function SocketTestPage() {
  const [socket, setSocket] =
    useState<Socket | null>(null);

  const [messages, setMessages] =
    useState<string[]>([]);

  useEffect(() => {
    const socket = io('http://localhost:3000');

    socket.on('connect', () => {
      setMessages((prev) => [
        ...prev,
        `CONNECTED: ${socket.id}`,
      ]);
    });

    socket.on('disconnect', () => {
      setMessages((prev) => [
        ...prev,
        'DISCONNECTED',
      ]);
    });

    socket.on('room:player-joined', (data) => {
      setMessages((prev) => [
        ...prev,
        `PLAYER_JOINED: ${JSON.stringify(data)}`,
      ]);
    });

    socket.on('room:player-reconnected', (data) => {
      setMessages((prev) => [
        ...prev,
        `PLAYER_RECONNECTED: ${JSON.stringify(data)}`,
      ]);
    });

    socket.on('room:player-disconnected', (data) => {
      setMessages((prev) => [
        ...prev,
        `PLAYER_DISCONNECTED: ${JSON.stringify(data)}`,
      ]);
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = () => {
    socket?.emit('room:join', {
      roomId: 'TEST_ROOM',
      playerId: 'PLAYER_1',
    });
  };

  return (
    <main>
      <h1>Socket Test</h1>

      <button onClick={joinRoom}>
        JOIN ROOM
      </button>

      <ul>
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </main>
  );
}
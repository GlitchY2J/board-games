import assert from 'node:assert/strict';
import { test } from 'node:test';
import { roomService, RoomServiceError } from '../src/services/RoomService.ts';

test('RoomService crea salas sin aceptar socketId', () => {
  const { room, player } = roomService.createRoom('Host', 'avatar-1');

  assert.equal(room.settings.gameId, null);
  assert.equal(player.socketId, null);
  assert.equal(player.connected, false);
});

test('RoomService solo reanuda sesiones mediante sessionToken', () => {
  const created = roomService.createRoom('Host', 'avatar-1');
  const resumed = roomService.resumeSession(
    created.room.code,
    created.player.sessionToken,
    'socket-server-assigned',
  );

  assert.equal(resumed.id, created.player.id);
  assert.equal(resumed.socketId, 'socket-server-assigned');
  assert.equal(resumed.connected, true);

  assert.throws(
    () => roomService.resumeSession(created.room.code, 'socket-from-client', 'other'),
    (error) => error instanceof RoomServiceError && error.code === 'PLAYER_NOT_IN_ROOM',
  );
});

test('RoomService valida ownership al actualizar configuración', () => {
  const { room, player } = roomService.createRoom('Host', 'avatar-1');

  assert.throws(
    () => roomService.updateSettings(room.code, 'other-player', room.settings),
    (error) => error instanceof RoomServiceError && error.code === 'NOT_HOST',
  );

  const updated = roomService.updateSettings(room.code, player.id, room.settings);
  assert.equal(updated.settings.gameId, null);
});

test('RoomService inicia la partida usando el motor registrado', () => {
  const created = roomService.createRoom('Host', 'avatar-1');
  roomService.joinRoom(created.room.code, 'Guest', 'avatar-2');
  roomService.updateSettings(created.room.code, created.player.id, {
    gameId: 'unstable-unicorns',
    versionId: 'unstable-unicorns-base',
    expansionIds: [],
  });

  const room = roomService.startGame(created.room.code, created.player.id);
  assert.equal(room.gameState?.started, true);
  assert.equal(room.gameState?.players.length, 2);
});

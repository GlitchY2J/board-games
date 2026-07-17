import type { Room } from '../models/Room.ts';

class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(room: Room) {
    this.rooms.set(room.code, room);

    return room;
  }

  getRoom(code: string) {
    return this.rooms.get(code);
  }

  getRooms() {
    return [...this.rooms.values()];
  }
}

export default new RoomManager();

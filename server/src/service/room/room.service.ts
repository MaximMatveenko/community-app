import { injectable, inject } from 'inversify';
import { ApiService } from '../api';
import { LoggerService } from '../logger';
import { TimerService } from './../timer';
import { RoomStatus, Room } from './models';
import { RoomInfo } from '../../typing/room-info';
import { PlayersBindService } from '../players-bind';
import { Game } from '../../../models/games';
import { GamesRepository } from '../games/games.repository';

@injectable()
export class RoomService {
  @inject(ApiService) private apiService: ApiService;
  @inject(LoggerService) private loggerService: LoggerService;
  @inject(TimerService) private timerService: TimerService;
  @inject(PlayersBindService) private playersBindService: PlayersBindService;
  @inject(GamesRepository) private gamesRepository: GamesRepository;

  private rooms: Room[] = [];
  private games: any[] = [];

  constructor() { }

  public getRooms(): Room[] {
    return this.rooms;
  }

  public getRoomByIndex(index: number): Room | undefined {
    return this.rooms.find((r) => r.id === index);
  }

  public createNewRoom(index: number, client: SocketIO.Socket, playerToken: string): Promise<boolean> {
    return this.apiService.startNewRoom(`${this.games[index].requestUrl}/api/start-new-room`, {}, this.games[index])
      .then((roomToken: string) => {

        let isCreated = false;

        if (roomToken) {
          this.rooms.push({
            id: index,
            gameId: this.games[index].id,
            maxPlayersCount: this.games[index].maxRoomPlayer,
            players: [client],
            token: roomToken,
            status: RoomStatus.WAITING
          });

          this.playersBindService.bindPlayer(roomToken, playerToken);
          this.loggerService.infoLog(`New room was added for ${this.games[index].appName}`);
          this.loggerService.infoLog(`Current count of players is 1`);

          isCreated = true;
        } else {
          this.loggerService.errorLog(`New room was not added for ${this.games[index].appName}`);
        }

        return isCreated;
      });
  }

  public async addPlayerToRoom(index: number, client: SocketIO.Socket, playerToken: string): Promise<[boolean, Room]> {
    /*
    * @todo refactor for lock async operations (multiple users)
    * */
    this.games = await this.gamesRepository.getGames().map((game: any) => game.dataValues);

    const room: Room | undefined = this.rooms.find((r) => r.id === index);
    let operation$ = Promise.resolve(true);

    if (room && room.players.length < room.maxPlayersCount && room.status === RoomStatus.WAITING) {
      room.players.push(client);

      this.playersBindService.bindPlayer(room.token, playerToken);

      this.loggerService.infoLog(`Add player to ${this.games[index].appName} room`);
      this.loggerService.infoLog(`Current count of players is ${room.players.length}`);
    } else {
      operation$ = this.createNewRoom(index, client, playerToken).then((result) => {

        const newRoom = this.rooms.find((r) => r.id === index);
        const timer = this.timerService.start(
          (distance: number) => {
            this.loggerService.infoLog(`Countdown ${distance} -> ${this.games[index].appName}`);
            newRoom.distance = distance;

            const roundDistance = Math.round(distance / 1000);

            if (roundDistance % 30 === 0 || roundDistance === 15 || roundDistance === 10 || roundDistance === 5) {
              this.countdown(newRoom, index, distance);
            }
          },
          () => {
            this.loggerService.infoLog(`Start game by timer -> ${this.games[index].appName}`);

            this.startGame(this.games[index], newRoom, index);
          },
          this.games[index].maxWaitingTime);

        newRoom.timer = timer;

        return result;
      });
    }

    return operation$.then((isAdded: boolean) => {
      this.checkWaitPlayersCount(index);
      const updatedRoom = this.rooms.find((r) => r.id === index);

      return [isAdded, updatedRoom] as [boolean, Room];
    });
  }

  public removePlayerFromRoom(index: number, client: SocketIO.Socket, token: string): Promise<[boolean, Room]> {
    /*
    * @todo refactor for lock async operations (multiple users)
    * */
    const room = this.rooms.find((r) => r.id === index);
    const operation$ = Promise.resolve(true);

    if (token && room) {
      this.playersBindService.removePlayers(room.token, token);
    }

    if (room && room.players.length > 1) {

      room.players = room.players.filter((p) => p !== client);

      this.loggerService.infoLog(`Remove player from ${this.games[index]} room`);
      this.loggerService.infoLog(`Current count of players is ${room.players.length}`);
    } else if (room) {
      this.timerService.end(room.timer);
      this.rooms = [...this.rooms.filter((r) => r.id !== index)];
      room.players = [];

      this.loggerService.infoLog(`Remove ${this.games[index].appName} room`);
    }

    return operation$.then((result) => {
      if (room) {
        this.checkWaitPlayersCount(room.id);
      }

      return [result, room] as [boolean, Room];
    });
  }

  public removePlayer(client: SocketIO.Socket, token: string): Promise<[boolean, Room]> {
    /*
    * @todo refactor for lock async operations (multiple users)
    * */
    const room = this.rooms.find((r) => {
      return !!r.players.find((p) => p === client);
    });

    const operation$ = Promise.resolve(true);
    if (token) {
      this.playersBindService.removePlayers(room.token, token);
    }

    if (room && room.players.length > 1) {
      room.players = [...room.players.filter((p) => p !== client)];

      this.loggerService.infoLog(`Remove player from ${this.games[room.id].appName} room`);
      this.loggerService.infoLog(`Current count of players is ${room.players.length}`);
    } else if (room) {
      this.timerService.end(room.timer);
      this.rooms = [...this.rooms.filter((r) => r.id !== room.id)];
      room.players = [];

      this.loggerService.infoLog(`Remove ${this.games[room.id].appName} room`);
    }

    return operation$.then((result) => {
      if (room) {
        this.checkWaitPlayersCount(room.id);
      }

      return [result, room] as [boolean, Room];
    });
  }

  private checkWaitPlayersCount(index: number): void {
    const room = this.rooms.find((r) => r.id === index);

    if (room && room.players.length === this.games[index].maxRoomPlayer) {
      this.timerService.end(room.timer);

      this.startGame(this.games[index], room, index);
    }
  }

  private startGame(game: Game, room: Room, index: number): void {

    this.playersBindService.sendPlayerBind(game, room)
      .then(() => {
        room.players.forEach((player: SocketIO.Socket) => {
          player.emit(this.games[index].updateRoomsInfoEventName, this.mapRoomsToRoomsInfo());
          this.loggerService.infoLog(`Sent count wait players in ${this.games[index].appName}`);

          player.emit('redirect', this.games[index].redirectUrl);
          this.loggerService.infoLog(`Redirect players group to ${this.games[index].appName}`);
        });
        room.status = RoomStatus.IN_GAME;
      })
      .catch((error: any) => console.log(error));
  }

  private countdown(room: Room, index: number, distance: number): void {
    room.players.forEach((player: SocketIO.Socket) => {
      player.emit(this.games[index].notifyCountdown, distance);
    });
  }

  private mapRoomsToRoomsInfo(): RoomInfo[] {
    return this.rooms.map((r) => {
      return {
        id: r.id,
        gameId: r.gameId,
        distance: r.distance,
        maxPlayersCount: r.maxPlayersCount,
        playersCount: r.players.length,
        status: r.status
      } as RoomInfo;
    });
  }
}

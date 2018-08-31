import { RoomState } from './interfaces';

type State = RoomState;

export const initialState: State = {
  rooms: [],
  currentPlayerRoom: undefined,
  currentGameId: undefined,
};

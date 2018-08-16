import { ActionsObservable, ofType } from 'redux-observable';
import { from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { HttpWrapper } from 'services';

import { GameModel } from 'models';

import {
    AddGame,
    AddGameError,
    AddGameSuccess,
    DeleteGame,
    DeleteGameError,
    DeleteGameSuccess,
    EditGame,
    EditGameError,
    EditGameSuccess,
    InitMyGames,
    LoadMyGamesError,
    LoadMyGamesSuccess,
    MyGamesActionTypes
} from './my-games.action';

export const deleteGame$ = (action$: ActionsObservable<DeleteGame>) =>
    action$.pipe(
        ofType(MyGamesActionTypes.DeleteGame),
        switchMap(action =>
            from(HttpWrapper.post('api/v1/my-games/delete-game', action.payload)).pipe(
                map((res: any) => {
                    const games: GameModel[] = res.data;

                    return new DeleteGameSuccess(games);
                }),
                catchError(error => of(new DeleteGameError(error)))
            )
        )
    );

export const editGame$ = (action$: ActionsObservable<EditGame>) =>
    action$.pipe(
        ofType(MyGamesActionTypes.EditGame),
        switchMap(action =>
            from(HttpWrapper.post('api/v1/my-games/edit-game', action.payload)).pipe(
                map((res: any) => {
                    const games: GameModel[] = res.data;

                    return new EditGameSuccess(games);
                }),
                catchError(error => of(new EditGameError(error)))
            )
        )
    );

export const addGame$ = (action$: ActionsObservable<AddGame>) =>
    action$.pipe(
        ofType(MyGamesActionTypes.AddGame),
        switchMap(action => {
            return from(HttpWrapper.post('api/v1/my-games/add-game', action.payload)).pipe(
                map((res: any) => {
                    const game: GameModel = res.data;

                    return new AddGameSuccess(game);
                }),
                catchError(error => of(new AddGameError(error)))
            )
            }
        )
    );

export const initMyGames$ = (action$: ActionsObservable<InitMyGames>) =>
    action$.pipe(
        ofType(MyGamesActionTypes.InitMyGames),
        switchMap(action =>
            from(HttpWrapper.get(`api/v1/my-games/get-games?userId=${action.payload}`)).pipe(
                map((res: any) => {
                    const games: GameModel[] = res.data;

                    return new LoadMyGamesSuccess(games);
                }),
                catchError(error => of(new LoadMyGamesError(error)))
            )
        )
    );

export const MyGamesEffects = [
    deleteGame$,
    editGame$,
    addGame$,
    initMyGames$
];
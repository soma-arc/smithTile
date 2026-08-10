/** Reducer + Context wiring: single source of truth for UI state. */

import { createContext, type Dispatch, type ReactNode, useContext, useReducer } from 'react';
import {
    initialTileState,
    type TileAction,
    type TileState,
    tileReducer,
} from '../state/tileReducer';

const StateContext = createContext<TileState | null>(null);
const DispatchContext = createContext<Dispatch<TileAction> | null>(null);

export function TileStateProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(tileReducer, initialTileState);
    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
    );
}

export function useTileState(): TileState {
    const state = useContext(StateContext);
    if (!state) throw new Error('useTileState must be used within <TileStateProvider>');
    return state;
}

export function useTileDispatch(): Dispatch<TileAction> {
    const dispatch = useContext(DispatchContext);
    if (!dispatch) throw new Error('useTileDispatch must be used within <TileStateProvider>');
    return dispatch;
}

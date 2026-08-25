import { describe, expect, it } from 'vitest';
import { initialTileState, tileReducer } from './tileReducer';

describe('tileReducer — articulated worm mode', () => {
    it('selects E when entering the mode', () => {
        const state = tileReducer(initialTileState, {
            type: 'setShape',
            shape: 'articulatedWorm',
        });
        expect(state.shape).toEqual({ kind: 'articulatedWorm', worm: 'E' });
    });

    it('selects another articulated worm', () => {
        const state = tileReducer(initialTileState, {
            type: 'setArticulatedWorm',
            worm: 'I0:E',
        });
        expect(state.shape).toEqual({ kind: 'articulatedWorm', worm: 'I0:E' });
    });
});

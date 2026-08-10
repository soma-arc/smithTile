/** Derives the (memoized) render Scene from UI state. Replaces the old dirty-guard. */

import { useMemo } from 'react';
import { createCamera } from '../render/camera';
import { buildScene, type Scene } from '../render/scene';
import type { TileState } from '../state/tileReducer';

export function useScene(state: TileState): Scene {
    const { a, b, zoom, transform, toggles } = state;
    return useMemo(
        () =>
            buildScene(
                {
                    a,
                    b,
                    transform,
                    overlays: {
                        grid: toggles.showGrid,
                        polykite: toggles.showPolykite,
                        ab: toggles.showAB,
                        vectors: toggles.showVectors,
                        vertexNums: toggles.showVertexNums,
                        lengths: toggles.showLengths,
                    },
                },
                createCamera(zoom),
            ),
        [a, b, zoom, transform, toggles],
    );
}

/** Derives the (memoized) render Scene from UI state. Replaces the old dirty-guard. */

import { useMemo } from 'react';
import { createCamera } from '../render/camera';
import { buildScene, type Scene } from '../render/scene';
import { createSmithTile } from '../smithTile';
import type { TileState } from '../state/tileReducer';
import { IDENTITY_TRANSFORM } from '../Transform';

export function useScene(state: TileState): Scene {
    const { a, b, zoom, rotationDeg, toggles } = state;
    return useMemo(
        () =>
            // The interactive view is a one-tile world. Rotation is a camera (view)
            // operation, so the tile keeps its natural placement (identity transform).
            buildScene(
                {
                    tiles: [createSmithTile(a, b, IDENTITY_TRANSFORM)],
                    overlays: {
                        grid: toggles.showGrid,
                        polykite: toggles.showPolykite,
                        ab: toggles.showAB,
                        vectors: toggles.showVectors,
                        vertexNums: toggles.showVertexNums,
                        lengths: toggles.showLengths,
                        angles: toggles.showAngles,
                        ports: toggles.showPorts,
                    },
                },
                createCamera(zoom, rotationDeg),
            ),
        [a, b, zoom, rotationDeg, toggles],
    );
}

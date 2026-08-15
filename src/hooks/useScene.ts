/** Derives the (memoized) render Scene from UI state. Replaces the old dirty-guard. */

import { useMemo } from 'react';
import { createCamera, createFitCamera } from '../render/camera';
import { buildScene, type Overlays, type Scene } from '../render/scene';
import { createSmithTile, PATCHES, smithTileWorldVertices } from '../smithTile';
import type { TileState } from '../state/tileReducer';
import { IDENTITY_TRANSFORM } from '../Transform';

export function useScene(state: TileState): Scene {
    const { a, b, zoom, rotationDeg, patch, toggles } = state;
    return useMemo(() => {
        const overlays: Overlays = {
            grid: toggles.showGrid,
            polykite: toggles.showPolykite,
            ab: toggles.showAB,
            vectors: toggles.showVectors,
            vertexNums: toggles.showVertexNums,
            lengths: toggles.showLengths,
            angles: toggles.showAngles,
            ports: toggles.showPorts,
        };

        // A selected patch renders its full tile list (fit to its extent), with
        // its connection ports; otherwise the interactive Tile(a, b) is a
        // one-tile world on the fixed Hat frame.
        if (patch) {
            const p = PATCHES[patch];
            const points = [
                ...p.tiles.flatMap((t) => smithTileWorldVertices(t)),
                p.plug.position,
                ...p.sockets.map((s) => s.position),
            ];
            return buildScene(
                { tiles: p.tiles, overlays, ports: { plug: p.plug, sockets: p.sockets } },
                createFitCamera(points, zoom, rotationDeg),
            );
        }

        // Rotation is a camera (view) operation, so the tile keeps its natural
        // placement (identity transform).
        return buildScene(
            { tiles: [createSmithTile(a, b, IDENTITY_TRANSFORM)], overlays },
            createCamera(zoom, rotationDeg),
        );
    }, [a, b, zoom, rotationDeg, patch, toggles]);
}

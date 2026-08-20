/** Derives the (memoized) render Scene from UI state. Replaces the old dirty-guard. */

import { useMemo } from 'react';
import { createCamera, createFitCamera } from '../render/camera';
import { componentBorders } from '../render/patchBorders';
import { buildScene, type Overlays, type Scene } from '../render/scene';
import { patchColorGroups, SPECTRE_PATCHES } from '../smithPatch';
import { createSmithTile, DEFAULT_SPECTRE_CURVE, smithTileWorldVertices } from '../smithTile';
import type { TileState } from '../state/tileReducer';
import { IDENTITY_TRANSFORM } from '../Transform';

export function useScene(state: TileState): Scene {
    const { a, b, shape, zoom, rotationDeg, toggles } = state;
    return useMemo(() => {
        const overlays: Overlays = {
            grid: toggles.showGrid,
            polykite: toggles.showPolykite,
            ab: toggles.showAB,
            vectors: toggles.showVectors,
            vertexNums: toggles.showVertexNums,
            vertexDots: toggles.showVertexDots,
            lengths: toggles.showLengths,
            angles: toggles.showAngles,
            ports: toggles.showPorts,
        };

        // A selected Spectre patch renders its full tile list (fit to its extent)
        // and connection ports. Tile(a,b) and a single Spectre use the fixed frame.
        if (shape.kind === 'spectre' && shape.patch) {
            const p = SPECTRE_PATCHES[shape.patch];
            const points = [
                ...p.tiles.flatMap((t) => smithTileWorldVertices(t)),
                p.plug.position,
                ...p.sockets.map((s) => s.position),
            ];
            return buildScene(
                {
                    tiles: p.tiles,
                    edgeCurve: DEFAULT_SPECTRE_CURVE,
                    overlays,
                    ports: toggles.showPatchPorts
                        ? { plug: p.plug, sockets: p.sockets }
                        : undefined,
                    componentFills: toggles.showComponentColors ? patchColorGroups(p) : undefined,
                    componentBorders: toggles.showComponentBorders
                        ? componentBorders(p)
                        : undefined,
                },
                createFitCamera(points, zoom, rotationDeg),
            );
        }

        // Rotation is a camera (view) operation, so the tile keeps its natural
        // placement (identity transform).
        const isSpectre = shape.kind === 'spectre';
        const tile = isSpectre
            ? createSmithTile(1, 1, IDENTITY_TRANSFORM)
            : createSmithTile(a, b, IDENTITY_TRANSFORM);
        return buildScene(
            {
                tiles: [tile],
                edgeCurve: isSpectre ? DEFAULT_SPECTRE_CURVE : undefined,
                overlays,
            },
            createCamera(zoom, rotationDeg),
        );
    }, [a, b, shape, zoom, rotationDeg, toggles]);
}

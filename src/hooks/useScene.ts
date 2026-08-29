/** Derives the (memoized) render Scene from UI state. Replaces the old dirty-guard. */

import { useMemo } from 'react';
import { createCamera, createCenteredCamera } from '../render/camera';
import { colorGroupBorders, componentBorders } from '../render/patchBorders';
import { buildScene, type Overlays, type Scene } from '../render/scene';
import { patchColorGroups, SPECTRE_PATCHES } from '../smithPatch';
import { createSmithTile, STRAIGHT_CURVE, smithTileWorldVertices } from '../smithTile';
import {
    adjustRegionWorms,
    MIRRORED_SPECTRE_REGIONS,
    regionColorGroups,
    regionEndMarkers,
    regionMovableIndices,
    regionTiles,
    regionWormGroups,
    regionWormPivot,
    regionWormTiles,
    SPECTRE_REGIONS,
} from '../spectreRegion';
import { ARTICULATED_WORMS, MIRRORED_ARTICULATED_WORMS, wormColorGroups } from '../spectreWorm';
import type { TileState } from '../state/tileReducer';
import { createReflectionTransform, IDENTITY_TRANSFORM } from '../Transform';

export function useScene(state: TileState): Scene {
    const {
        a,
        b,
        mirrored,
        shape,
        spectreCurve,
        spectreCurveMode,
        zoom,
        pan,
        regionPlacementMode,
        regionAdjustments,
        rotationDeg,
        toggles,
    } = state;
    return useMemo(() => {
        const activeSpectreCurve = spectreCurveMode === 'straight' ? STRAIGHT_CURVE : spectreCurve;
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

        if (shape.kind === 'region') {
            const baseRegion = (mirrored ? MIRRORED_SPECTRE_REGIONS : SPECTRE_REGIONS)[
                shape.region
            ];
            const region =
                regionPlacementMode === 'manual'
                    ? adjustRegionWorms(baseRegion, regionAdjustments)
                    : baseRegion;
            const tiles = regionTiles(region);
            const cameraPoints = regionTiles(baseRegion).flatMap((tile) =>
                smithTileWorldVertices(tile),
            );
            const colorGroups = regionColorGroups(region);
            const wormGroups = regionWormGroups(region);
            const camera = createCenteredCamera(cameraPoints, zoom, rotationDeg, pan);
            const scene = buildScene(
                {
                    tiles,
                    overlays,
                    componentFills: toggles.showComponentColors ? colorGroups : undefined,
                    componentBorders: toggles.showComponentBorders
                        ? colorGroupBorders(wormGroups)
                        : undefined,
                },
                camera,
            );
            const endpointItems = toggles.showWormEnds
                ? regionEndMarkers(region).flatMap((marker) => {
                      const at = camera.project(marker.position);
                      const markerShape =
                          marker.end === 'front'
                              ? {
                                    kind: 'polygon' as const,
                                    points: [
                                        { x: at.x, y: at.y - 8 },
                                        { x: at.x - 7, y: at.y + 6 },
                                        { x: at.x + 7, y: at.y + 6 },
                                    ],
                                    style: { fill: marker.color, stroke: '#ffffff', width: 2 },
                                }
                              : {
                                    kind: 'polygon' as const,
                                    points: [
                                        { x: at.x - 6, y: at.y - 6 },
                                        { x: at.x + 6, y: at.y - 6 },
                                        { x: at.x + 6, y: at.y + 6 },
                                        { x: at.x - 6, y: at.y + 6 },
                                    ],
                                    style: { fill: marker.color, stroke: '#ffffff', width: 2 },
                                };
                      return [
                          markerShape,
                          {
                              kind: 'text' as const,
                              at: { x: at.x, y: at.y - 17 },
                              text: marker.label,
                              style: {
                                  fill: marker.color,
                                  size: 13,
                                  weight: 700,
                                  family: 'Barlow Condensed, sans-serif',
                              },
                          },
                      ];
                  })
                : [];
            const sceneWithEndpoints: Scene = {
                ...scene,
                layers: [...scene.layers, { id: 'region-worm-ends', items: endpointItems }],
            };
            if (regionPlacementMode !== 'manual') return sceneWithEndpoints;

            const targets = regionMovableIndices(region).map((wormIndex) => {
                const rotationCenter = camera.project(regionWormPivot(region, wormIndex));
                return {
                    wormIndex,
                    movablePolygons: regionWormTiles(region, wormIndex).map((tile) =>
                        smithTileWorldVertices(tile).map(camera.project),
                    ),
                    rotationCenter,
                    rotationHandle: { x: rotationCenter.x, y: rotationCenter.y - 58 },
                };
            });
            return {
                ...scene,
                layers: [
                    ...sceneWithEndpoints.layers,
                    {
                        id: 'region-placement-handles',
                        items: targets.flatMap((target) => [
                            {
                                kind: 'segment' as const,
                                a: target.rotationCenter,
                                b: target.rotationHandle,
                                style: { stroke: '#7c3aed', width: 2, dash: '5 4' },
                            },
                            {
                                kind: 'circle' as const,
                                center: target.rotationCenter,
                                r: 5,
                                style: { fill: '#ffffff', stroke: '#7c3aed', width: 2 },
                            },
                            {
                                kind: 'circle' as const,
                                center: target.rotationHandle,
                                r: 9,
                                style: { fill: '#7c3aed', stroke: '#ffffff', width: 2 },
                            },
                        ]),
                    },
                ],
                interaction: {
                    kind: 'regionPlacement',
                    targets,
                },
            };
        }

        if (shape.kind === 'articulatedWorm') {
            const worm = (mirrored ? MIRRORED_ARTICULATED_WORMS : ARTICULATED_WORMS)[shape.worm];
            const points = worm.tiles.flatMap((tile) => smithTileWorldVertices(tile));
            const colorGroups = wormColorGroups(worm);
            return buildScene(
                {
                    tiles: worm.tiles,
                    overlays,
                    componentFills: toggles.showComponentColors ? colorGroups : undefined,
                    componentBorders: toggles.showComponentBorders
                        ? colorGroupBorders(colorGroups)
                        : undefined,
                },
                createCenteredCamera(points, zoom, rotationDeg, pan),
            );
        }

        // A selected Spectre patch renders its full tile list centered on its
        // extent, at the same Hat-relative scale as every other mode.
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
                    edgeCurve: activeSpectreCurve,
                    overlays,
                    ports: toggles.showPatchPorts
                        ? { plug: p.plug, sockets: p.sockets }
                        : undefined,
                    componentFills: toggles.showComponentColors ? patchColorGroups(p) : undefined,
                    componentBorders: toggles.showComponentBorders
                        ? componentBorders(p)
                        : undefined,
                },
                createCenteredCamera(points, zoom, rotationDeg, pan),
            );
        }

        // Rotation is a camera (view) operation, so the tile keeps its natural
        // placement (identity transform).
        const isSpectre = shape.kind === 'spectre';
        const tile = isSpectre
            ? createSmithTile(1, 1, IDENTITY_TRANSFORM)
            : createSmithTile(a, b, mirrored ? createReflectionTransform() : IDENTITY_TRANSFORM);
        return buildScene(
            {
                tiles: [tile],
                edgeCurve: isSpectre ? activeSpectreCurve : undefined,
                overlays,
            },
            createCamera(zoom, rotationDeg, !isSpectre && mirrored, pan),
        );
    }, [
        a,
        b,
        mirrored,
        shape,
        spectreCurve,
        spectreCurveMode,
        zoom,
        pan,
        regionPlacementMode,
        regionAdjustments,
        rotationDeg,
        toggles,
    ]);
}

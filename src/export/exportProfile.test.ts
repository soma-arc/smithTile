import { describe, expect, it } from 'vitest';
import { initialTileState } from '../state/tileReducer';
import {
    createExportProfile,
    EXPORT_PROFILE_STORAGE_KEY,
    loadExportProfile,
    parseExportProfileJson,
} from './exportProfile';

const SETTINGS = {
    unitMm: 12,
    thickness: 5,
    bevel: 0.6,
    curveToleranceMm: 0.04,
    outerShape: 'rectangle' as const,
    clearance: 0.3,
    frameWidth: 4,
    baseThickness: 1.4,
    wallHeight: 5,
};

describe('3D export profile JSON', () => {
    it('round-trips the patch selection, straight edge mode, and print dimensions', () => {
        const profile = createExportProfile(
            {
                ...initialTileState,
                shape: { kind: 'spectre', patch: 'Ma0' },
                spectreCurveMode: 'straight',
                mirrored: true,
            },
            SETTINGS,
            '2026-11-22T00:00:00.000Z',
        );
        const json = JSON.stringify(profile);
        const restored = parseExportProfileJson(json);
        const storage = {
            getItem: (key: string) => (key === EXPORT_PROFILE_STORAGE_KEY ? json : null),
        };

        expect(restored.patch.shape).toEqual({ kind: 'spectre', patch: 'Ma0' });
        expect(restored.patch.spectreCurveMode).toBe('straight');
        expect(restored.patch.mirrored).toBe(true);
        expect(restored.export3d).toEqual(SETTINGS);
        expect(loadExportProfile(storage)).toEqual(restored);
    });

    it('rejects unsupported versions and invalid dimensions', () => {
        const valid = createExportProfile(initialTileState, SETTINGS);
        expect(() => parseExportProfileJson(JSON.stringify({ ...valid, version: 2 }))).toThrow();
        expect(() =>
            parseExportProfileJson(
                JSON.stringify({
                    ...valid,
                    export3d: { ...valid.export3d, bevel: valid.export3d.thickness },
                }),
            ),
        ).toThrow();
    });
});

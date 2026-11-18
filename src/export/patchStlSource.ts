import { SPECTRE_PATCHES, type SpectrePatchKey } from '../geometry/smithPatch';
import { createSmithTile } from '../geometry/smithTile';
import { getSpectreWrigglyPatch, type SpectreWrigglyKind } from '../geometry/spectreWrigglyPatch';
import { IDENTITY_TRANSFORM } from '../geometry/Transform';
import { getTileArticulatedPatch, type TilePatchKind } from '../geometry/tileArticulatedPatch';
import { getTileWrigglyPatch } from '../geometry/tileWrigglyPatch';
import type { PatchStlOptions } from './patchStl';
import type { PatchTrayOptions } from './patchTray';

type PatchSelection =
    | { singleSpectre: true }
    | { patchKey: SpectrePatchKey }
    | { spectreWrigglyPatch: { patch: SpectreWrigglyKind; level: number; mirrored: boolean } }
    | {
          tilePatch: {
              a: number;
              b: number;
              patch: TilePatchKind;
              level: number;
              mirrored: boolean;
              family?: 'articulated' | 'wriggly';
          };
      };

export type PatchStlRequest = PatchSelection &
    (
        | { output?: 'patch'; options: PatchStlOptions }
        | { output: 'tray'; options: PatchStlOptions; trayOptions: PatchTrayOptions }
    );

/** Shared by the browser worker and the in-process integration tests. */
export function resolvePatchStlSource(request: PatchStlRequest) {
    if ('singleSpectre' in request) {
        return { tiles: [createSmithTile(1, 1, IDENTITY_TRANSFORM)] };
    }
    if ('tilePatch' in request) {
        const { a, b, patch, level, mirrored, family } = request.tilePatch;
        return (family === 'wriggly' ? getTileWrigglyPatch : getTileArticulatedPatch)(
            a,
            b,
            patch,
            level,
            mirrored,
        );
    }
    if ('spectreWrigglyPatch' in request) {
        const { patch, level, mirrored } = request.spectreWrigglyPatch;
        return getSpectreWrigglyPatch(patch, level, mirrored);
    }
    return SPECTRE_PATCHES[request.patchKey];
}

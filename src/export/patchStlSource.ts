import { SPECTRE_PATCHES, type SpectrePatchKey } from '../geometry/smithPatch';
import { getSpectreWrigglyPatch, type SpectreWrigglyKind } from '../geometry/spectreWrigglyPatch';
import { getTileArticulatedPatch, type TilePatchKind } from '../geometry/tileArticulatedPatch';
import { getTileWrigglyPatch } from '../geometry/tileWrigglyPatch';
import type { PatchStlOptions } from './patchStl';

export type PatchStlRequest = (
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
      }
) & { options: PatchStlOptions };

/** Shared by the browser worker and the in-process integration tests. */
export function resolvePatchStlSource(request: PatchStlRequest) {
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

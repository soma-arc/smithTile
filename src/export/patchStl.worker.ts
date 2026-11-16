import { SPECTRE_PATCHES, type SpectrePatchKey } from '../geometry/smithPatch';
import { getTileArticulatedPatch, type TilePatchKind } from '../geometry/tileArticulatedPatch';
import { type PatchStlOptions, patchStl } from './patchStl';

export type PatchStlRequest = (
    | { patchKey: SpectrePatchKey }
    | {
          tilePatch: {
              a: number;
              b: number;
              patch: TilePatchKind;
              level: number;
              mirrored: boolean;
          };
      }
) & { options: PatchStlOptions };
export type PatchStlReply =
    | { bytes: Uint8Array<ArrayBuffer> }
    | { error: 'dimensions' | 'generation' };

self.onmessage = (event: MessageEvent<PatchStlRequest>) => {
    try {
        const request = event.data;
        const patch =
            'tilePatch' in request
                ? getTileArticulatedPatch(
                      request.tilePatch.a,
                      request.tilePatch.b,
                      request.tilePatch.patch,
                      request.tilePatch.level,
                      request.tilePatch.mirrored,
                  )
                : SPECTRE_PATCHES[request.patchKey];
        const bytes = patchStl(patch, request.options);
        self.postMessage({ bytes } satisfies PatchStlReply, { transfer: [bytes.buffer] });
    } catch (error) {
        self.postMessage({
            error: error instanceof RangeError ? 'dimensions' : 'generation',
        } satisfies PatchStlReply);
    }
};

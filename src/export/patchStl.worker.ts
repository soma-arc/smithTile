import { SPECTRE_PATCHES, type SpectrePatchKey } from '../geometry/smithPatch';
import { getTileArticulatedPatch, type TilePatchKind } from '../geometry/tileArticulatedPatch';
import { type PatchStlOptions, patchStl } from './patchStl';
import { PatchStlValidationError, type PatchStlErrorCode } from './patchStlError';

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
    | { error: 'validation'; code: PatchStlErrorCode }
    | { error: 'generation' };

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
        self.postMessage(
            error instanceof PatchStlValidationError
                ? ({ error: 'validation', code: error.code } satisfies PatchStlReply)
                : ({ error: 'generation' } satisfies PatchStlReply),
        );
    }
};

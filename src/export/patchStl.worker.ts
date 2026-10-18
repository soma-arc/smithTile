import { SPECTRE_PATCHES, type SpectrePatchKey } from '../geometry/smithPatch';
import { type PatchStlOptions, patchStl } from './patchStl';

export type PatchStlRequest = { patchKey: SpectrePatchKey; options: PatchStlOptions };
export type PatchStlReply =
    | { bytes: Uint8Array<ArrayBuffer> }
    | { error: 'dimensions' | 'generation' };

self.onmessage = (event: MessageEvent<PatchStlRequest>) => {
    try {
        const bytes = patchStl(SPECTRE_PATCHES[event.data.patchKey], event.data.options);
        self.postMessage({ bytes } satisfies PatchStlReply, { transfer: [bytes.buffer] });
    } catch (error) {
        self.postMessage({
            error: error instanceof RangeError ? 'dimensions' : 'generation',
        } satisfies PatchStlReply);
    }
};

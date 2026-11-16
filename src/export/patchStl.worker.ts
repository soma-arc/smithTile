import { patchStl } from './patchStl';
import { type PatchStlErrorCode, PatchStlValidationError } from './patchStlError';
import { type PatchStlRequest, resolvePatchStlSource } from './patchStlSource';

export type { PatchStlRequest } from './patchStlSource';

export type PatchStlReply =
    | { bytes: Uint8Array<ArrayBuffer> }
    | { error: 'validation'; code: PatchStlErrorCode }
    | { error: 'generation' };

self.onmessage = (event: MessageEvent<PatchStlRequest>) => {
    try {
        const request = event.data;
        const bytes = patchStl(resolvePatchStlSource(request), request.options);
        self.postMessage({ bytes } satisfies PatchStlReply, { transfer: [bytes.buffer] });
    } catch (error) {
        self.postMessage(
            error instanceof PatchStlValidationError
                ? ({ error: 'validation', code: error.code } satisfies PatchStlReply)
                : ({ error: 'generation' } satisfies PatchStlReply),
        );
    }
};

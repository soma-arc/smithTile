import type { PatchStlReply, PatchStlRequest } from './patchStl.worker';

/** Keep patch generation off the UI thread. Each job releases its worker on completion. */
export function startPatchStlJob(request: PatchStlRequest) {
    const worker = new Worker(new URL('./patchStl.worker.ts', import.meta.url), { type: 'module' });
    const result = new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<PatchStlReply>) => {
            worker.terminate();
            if ('bytes' in event.data) resolve(event.data.bytes);
            else
                reject(
                    event.data.error === 'dimensions'
                        ? new RangeError('Invalid patch dimensions')
                        : new Error('Patch generation failed'),
                );
        };
        worker.onerror = () => {
            worker.terminate();
            reject(new Error('Patch worker failed'));
        };
        worker.postMessage(request);
    });
    return { result, cancel: () => worker.terminate() };
}

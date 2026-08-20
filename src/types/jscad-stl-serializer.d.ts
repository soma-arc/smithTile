/**
 * Minimal typings for `@jscad/stl-serializer`, which ships none of its own.
 *
 * Only the binary path is declared, since that is all we use. `serialize`
 * returns a "blobable array": the 80-byte header, the uint32 triangle count,
 * and the triangle data, as three separate ArrayBuffers (text mode would
 * instead return strings). `export/stl.ts` concatenates them.
 */
declare module '@jscad/stl-serializer' {
    import type { Geom3 } from '@jscad/modeling/src/geometries/types';

    export const mimeType: string;

    export function serialize(
        options: { binary: true; statusCallback?: (status: { progress: number }) => void },
        ...objects: Geom3[]
    ): ArrayBuffer[];
}

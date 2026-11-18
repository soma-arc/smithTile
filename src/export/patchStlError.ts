export type PatchStlErrorCode =
    | 'emptyPatch'
    | 'invalidScale'
    | 'invalidThickness'
    | 'invalidBevel'
    | 'invalidTolerance'
    | 'invalidClearance'
    | 'invalidFrameWidth'
    | 'invalidBaseThickness'
    | 'invalidWallHeight'
    | 'invalidTrayShape'
    | 'invalidCurve'
    | 'selfIntersection'
    | 'bevelGeometry'
    | 'overlappingTiles'
    | 'triangulation';

export class PatchStlValidationError extends RangeError {
    readonly code: PatchStlErrorCode;

    constructor(code: PatchStlErrorCode, message?: string) {
        super(message ?? code);
        this.name = 'PatchStlValidationError';
        this.code = code;
    }
}

/** Convert lower-level geometry errors into stable codes suitable for the UI. */
export function classifyPatchStlError(error: RangeError): PatchStlErrorCode {
    if (error instanceof PatchStlValidationError) return error.code;
    const message = error.message;
    if (message.includes('empty patch') || message.includes('nonempty patch')) return 'emptyPatch';
    if (message.includes('scale')) return 'invalidScale';
    if (message.includes('thickness')) return 'invalidThickness';
    if (message.includes('curve tolerance')) return 'invalidTolerance';
    if (message.includes('Polyline')) return 'invalidCurve';
    if (
        message.includes('Bevel') ||
        message.includes('bevel') ||
        message.includes('offset a folded corner')
    ) {
        return 'bevelGeometry';
    }
    if (message.includes('simple polygon') || message.includes('intersects itself')) {
        return 'selfIntersection';
    }
    if (message.includes('duplicate') || message.includes('overlapping tile')) {
        return 'overlappingTiles';
    }
    if (message.includes('triangulate') || message.includes('cap triangle')) {
        return 'triangulation';
    }
    return 'invalidBevel';
}

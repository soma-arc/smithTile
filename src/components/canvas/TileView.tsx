import { useScene } from '../../hooks/useScene';
import { useTileState } from '../../hooks/useTileState';
import { CanvasBackend } from '../../render/backends/CanvasBackend';
import { SvgBackend } from '../../render/backends/SvgBackend';

export type Backend = 'svg' | 'canvas';

/** Draws the current tile through the chosen (swappable) render backend. */
export function TileView({ backend = 'svg' }: { backend?: Backend }) {
    const state = useTileState();
    const scene = useScene(state);
    return backend === 'canvas' ? <CanvasBackend scene={scene} /> : <SvgBackend scene={scene} />;
}

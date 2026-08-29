import { describe, expect, it } from 'vitest';
import { ZOOM_MAX, ZOOM_MIN } from '../../state/tileReducer';
import { sliderToZoom, zoomToSlider } from './ZoomControl';

describe('ZoomControl logarithmic scale', () => {
    it('round-trips the full supported zoom range', () => {
        for (const zoom of [ZOOM_MIN, 1, 3, ZOOM_MAX]) {
            expect(sliderToZoom(zoomToSlider(zoom))).toBeCloseTo(zoom, 12);
        }
    });
});

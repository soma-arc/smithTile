// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TileStateProvider, useTileState } from '../../hooks/useTileState';
import { clientDeltaToSceneDelta, TileView } from './TileView';

afterEach(cleanup);

function PanProbe() {
    const { pan } = useTileState();
    return (
        <>
            <TileView />
            <output data-testid="pan">{`${pan.x},${pan.y}`}</output>
        </>
    );
}

describe('<TileView> pan', () => {
    it('converts client pixels using uniform contain scaling', () => {
        expect(clientDeltaToSceneDelta(20, -10, 470, 320, [0, 0, 940, 640])).toEqual({
            x: 40,
            y: -20,
        });
        expect(clientDeltaToSceneDelta(20, -10, 0, 0, [0, 0, 940, 640])).toEqual({
            x: 0,
            y: 0,
        });
    });

    it('pans with a primary-pointer drag', () => {
        render(
            <TileStateProvider>
                <PanProbe />
            </TileStateProvider>,
        );
        const host = screen.getByTestId('tile-view-host');
        Object.defineProperties(host, {
            getBoundingClientRect: {
                value: () => ({ width: 470, height: 320 }),
            },
            setPointerCapture: { value: vi.fn() },
            hasPointerCapture: { value: vi.fn(() => true) },
            releasePointerCapture: { value: vi.fn() },
        });

        fireEvent.pointerDown(host, {
            pointerId: 1,
            isPrimary: true,
            button: 0,
            clientX: 100,
            clientY: 80,
        });
        fireEvent.pointerMove(host, {
            pointerId: 1,
            isPrimary: true,
            clientX: 120,
            clientY: 90,
        });

        expect(screen.getByTestId('pan')).toHaveTextContent('40,20');
        expect(host).toHaveStyle({ cursor: 'grabbing' });

        fireEvent.pointerUp(host, { pointerId: 1, isPrimary: true });
        expect(host).toHaveStyle({ cursor: 'grab' });
    });
});

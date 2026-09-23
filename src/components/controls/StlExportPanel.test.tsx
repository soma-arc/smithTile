// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TileStateProvider } from '../../hooks/useTileState';
import { App } from '../App';

afterEach(cleanup);

/**
 * jsdom implements neither Blob URLs nor navigation, so stub the two browser
 * calls `downloadBytes` makes and capture what the click handed them.
 */
function stubDownload() {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:stl');
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {});
    return { createObjectURL, click };
}

describe('<StlExportPanel>', () => {
    it('downloads an STL named after the current (a, b)', async () => {
        const { createObjectURL, click } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );

        await user.click(screen.getByRole('button', { name: 'STL を保存' }));

        expect(click).toHaveBeenCalledOnce();
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        // The app starts on the Hat, so that is what must be exported.
        expect(anchor.download).toBe('tile-a1-b1.7321.stl');
        const blob = createObjectURL.mock.calls[0][0];
        expect(blob.type).toBe('application/sla');
        expect(blob.size).toBe(2484); // 84 + 50 × 48 triangles
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('is hidden while a patch is selected, since only tiles export', async () => {
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );
        await user.click(screen.getByRole('radio', { name: 'Spectre' }));
        await user.click(screen.getByRole('button', { name: 'Ma0' }));
        expect(screen.queryByRole('button', { name: 'STL を保存' })).not.toBeInTheDocument();
    });

    it('downloads the currently displayed single Spectre', async () => {
        const { createObjectURL, click } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );

        await user.click(screen.getByRole('radio', { name: 'Spectre' }));
        await user.click(screen.getByRole('button', { name: 'STL を保存' }));

        expect(click).toHaveBeenCalledOnce();
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        expect(anchor.download).toBe('spectre.stl');
        const blob = createObjectURL.mock.calls[0][0];
        expect(blob.type).toBe('application/sla');
        expect(blob.size).toBeGreaterThan(84);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });
});

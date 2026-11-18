// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TileStateProvider } from '../../hooks/useTileState';
import { App } from '../App';

// jsdom has no Worker; run the same model builder in-process for UI integration tests.
vi.mock('../../export/patchStlJob', () => ({
    startPatchStlJob: (request: import('../../export/patchStl.worker').PatchStlRequest) => ({
        result: Promise.all([
            import('../../export/patchStl'),
            import('../../export/patchTray'),
            import('../../export/patchStlSource'),
        ]).then(([{ patchStl }, { patchTrayStl }, { resolvePatchStlSource }]) =>
            request.output === 'tray'
                ? patchTrayStl(resolvePatchStlSource(request), request.options, request.trayOptions)
                : patchStl(resolvePatchStlSource(request), request.options),
        ),
        cancel: vi.fn(),
    }),
}));

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

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
    it('exports the selected Wriggly Tile(a, b) with its mirror and parameters', async () => {
        const { click } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );
        await user.click(screen.getByRole('radio', { name: 'Patch' }));
        await user.click(screen.getByRole('radio', { name: 'Wriggly' }));
        await user.click(screen.getByRole('button', { name: 'Tile(1,4)' }));
        await user.click(screen.getByRole('radio', { name: 'C' }));
        await user.click(screen.getByRole('radio', { name: '鏡像' }));
        await user.click(screen.getByRole('button', { name: 'パッチのSTLを保存' }));
        await waitFor(() => expect(click).toHaveBeenCalledOnce());
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        expect(anchor.download).toBe('patch-tile-wriggly-a1-b4-C1-mirrored-straight.stl');
    });

    it('exports curved Wriggly Spectres and disables the identity patch', async () => {
        const { click, createObjectURL } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );
        await user.click(screen.getByRole('radio', { name: 'Spectre' }));
        await user.click(screen.getByRole('radio', { name: 'Wriggly' }));
        await user.selectOptions(screen.getByRole('combobox', { name: 'レベル' }), '0');
        await user.click(screen.getByRole('radio', { name: '鏡像' }));
        await user.click(screen.getByRole('button', { name: 'パッチのSTLを保存' }));
        await waitFor(() => expect(click).toHaveBeenCalledOnce());
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        expect(anchor.download).toBe('patch-spectre-wriggly-I0-mirrored-cubicBezier.stl');
        expect(createObjectURL.mock.calls[0][0].size).toBeGreaterThan(2484);
        await user.click(screen.getByRole('button', { name: 'Ma' }));
        expect(screen.getByRole('button', { name: 'パッチのSTLを保存' })).toBeDisabled();
    });

    it('downloads the selected Tile(a, b) articulated patch and disables the empty S0', async () => {
        const { click } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );
        await user.click(screen.getByRole('radio', { name: 'Patch' }));
        await user.click(screen.getByRole('button', { name: 'Tile(1,4)' }));
        await user.click(screen.getByRole('radio', { name: '鏡像' }));
        await user.click(screen.getByRole('button', { name: 'パッチのSTLを保存' }));
        await waitFor(() => expect(click).toHaveBeenCalledOnce());
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        expect(anchor.download).toBe('patch-tile-a1-b4-B1-mirrored-straight.stl');
        await user.click(screen.getByRole('radio', { name: 'S' }));
        await user.selectOptions(screen.getByRole('combobox', { name: 'レベル' }), '0');
        expect(screen.getByRole('button', { name: 'パッチのSTLを保存' })).toBeDisabled();
    });

    it('downloads an STL named after the current (a, b)', async () => {
        const { createObjectURL, click } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );

        await user.click(screen.getByRole('button', { name: 'STL を保存' }));

        await waitFor(() => expect(click).toHaveBeenCalledOnce());
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        // The app starts on the Hat, so that is what must be exported.
        expect(anchor.download).toBe('tile-a1-b1.7321.stl');
        const blob = createObjectURL.mock.calls[0][0];
        expect(blob.type).toBe('application/sla');
        expect(blob.size).toBe(2484); // 84 + 50 × 48 triangles
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('downloads the selected patch with its displayed Bezier edges', async () => {
        const { createObjectURL, click } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );
        await user.click(screen.getByRole('radio', { name: 'Spectre' }));
        await user.click(screen.getByRole('button', { name: 'Ma0' }));
        await user.click(screen.getByRole('button', { name: 'パッチのSTLを保存' }));
        await waitFor(() => expect(click).toHaveBeenCalledOnce());
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        expect(anchor.download).toBe('patch-Ma0-cubicBezier.stl');
        expect(createObjectURL.mock.calls[0][0].size).toBeGreaterThan(2484);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('downloads a silhouette frame and base for the selected patch', async () => {
        const { createObjectURL, click } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );
        await user.click(screen.getByRole('radio', { name: 'Spectre' }));
        await user.click(screen.getByRole('button', { name: 'Ma0' }));
        await user.click(screen.getByRole('button', { name: '外枠＋下地のSTLを保存' }));
        await waitFor(() => expect(click).toHaveBeenCalledOnce());
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        expect(anchor.download).toBe('tray-Ma0-cubicBezier.stl');
        expect(createObjectURL.mock.calls[0][0].size).toBeGreaterThan(84);
    });

    it('downloads a rectangular frame and base for the selected patch', async () => {
        const { click } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );
        await user.click(screen.getByRole('radio', { name: 'Spectre' }));
        await user.click(screen.getByRole('button', { name: 'Ma0' }));
        await user.selectOptions(screen.getByRole('combobox', { name: '外形' }), 'rectangle');
        await user.click(screen.getByRole('button', { name: '外枠＋下地のSTLを保存' }));
        await waitFor(() => expect(click).toHaveBeenCalledOnce());
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        expect(anchor.download).toBe('tray-rectangle-Ma0-cubicBezier.stl');
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

        await waitFor(() => expect(click).toHaveBeenCalledOnce());
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        expect(anchor.download).toBe('spectre.stl');
        const blob = createObjectURL.mock.calls[0][0];
        expect(blob.type).toBe('application/sla');
        expect(blob.size).toBeGreaterThan(84);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('downloads a frame and base for the single Spectre', async () => {
        const { click } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );
        await user.click(screen.getByRole('radio', { name: 'Spectre' }));
        await user.selectOptions(screen.getByRole('combobox', { name: '外形' }), 'rectangle');
        await user.click(screen.getByRole('button', { name: '外枠＋下地のSTLを保存' }));
        await waitFor(() => expect(click).toHaveBeenCalledOnce());
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        expect(anchor.download).toBe('tray-rectangle-spectre-cubicBezier.stl');
    });

    it('reports an excessive bevel without downloading a file', async () => {
        const { click } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );
        await user.click(screen.getByRole('radio', { name: 'Spectre' }));
        await user.click(screen.getByRole('button', { name: 'Ma0' }));
        const bevel = screen.getByRole('spinbutton', { name: '面取り幅 (mm)' });
        await user.clear(bevel);
        await user.type(bevel, '4');
        await user.click(screen.getByRole('button', { name: 'パッチのSTLを保存' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
            '面取り幅は0以上かつ厚さ未満にしてください。',
        );
        expect(click).not.toHaveBeenCalled();
    });

    it('disables export for an empty patch', async () => {
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );
        await user.click(screen.getByRole('radio', { name: 'Spectre' }));
        await user.click(screen.getByRole('button', { name: 'S0' }));
        expect(screen.getByRole('button', { name: 'パッチのSTLを保存' })).toBeDisabled();
        expect(screen.getByText('このパッチにはタイルがありません。')).toBeInTheDocument();
    });
});

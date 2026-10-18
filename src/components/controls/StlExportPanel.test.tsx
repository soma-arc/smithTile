// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TileStateProvider } from '../../hooks/useTileState';
import { App } from '../App';

// jsdom has no Worker; run the same model builder in-process for UI integration tests.
vi.mock('../../export/patchStlJob', () => ({
    startPatchStlJob: (request: {
        patchKey: import('../../geometry/smithPatch').SpectrePatchKey;
        options: import('../../export/patchStl').PatchStlOptions;
    }) => ({
        result: Promise.all([
            import('../../export/patchStl'),
            import('../../geometry/smithPatch'),
        ]).then(([{ patchStl }, { SPECTRE_PATCHES }]) =>
            patchStl(SPECTRE_PATCHES[request.patchKey], request.options),
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

    it('downloads the selected straight patch with a top bevel', async () => {
        const { createObjectURL, click } = stubDownload();
        const user = userEvent.setup();
        render(
            <TileStateProvider>
                <App />
            </TileStateProvider>,
        );
        await user.click(screen.getByRole('radio', { name: 'Spectre' }));
        await user.click(screen.getByRole('button', { name: 'Ma0' }));
        await user.click(screen.getByRole('button', { name: '直線パッチのSTLを保存' }));
        expect(click).toHaveBeenCalledOnce();
        const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
        expect(anchor.download).toBe('patch-Ma0-straight.stl');
        expect(createObjectURL.mock.calls[0][0].size).toBeGreaterThan(2484);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
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
        await user.click(screen.getByRole('button', { name: '直線パッチのSTLを保存' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('面取り幅は厚さ未満');
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
        expect(screen.getByRole('button', { name: '直線パッチのSTLを保存' })).toBeDisabled();
        expect(screen.getByText('このパッチにはタイルがありません。')).toBeInTheDocument();
    });
});

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { TileStateProvider } from '../hooks/useTileState';
import { App } from './App';

afterEach(cleanup);

function renderApp() {
    return render(
        <TileStateProvider>
            <App />
        </TileStateProvider>,
    );
}

describe('<App> (state + components wiring)', () => {
    it('starts on the Hat preset', () => {
        renderApp();
        expect(screen.getByRole('button', { name: /ハット/ })).toHaveClass('active');
        expect(screen.getByText('1 : √3')).toBeInTheDocument();
    });

    it('applies a preset on click and updates the info panel', async () => {
        const user = userEvent.setup();
        renderApp();
        await user.click(screen.getByRole('button', { name: 'Tile(1,4)' }));
        expect(screen.getByText('1 : 4')).toBeInTheDocument(); // a : b
        expect(screen.getByText('4.000')).toBeInTheDocument(); // b / a
        expect(screen.getByRole('button', { name: 'Tile(1,4)' })).toHaveClass('active');
    });

    it('switches language', async () => {
        const user = userEvent.setup();
        renderApp();
        await user.click(screen.getByRole('radio', { name: 'English' }));
        expect(screen.getByText('Parameters')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Hat/ })).toBeInTheDocument();
    });

    it('renders per-edge segments when the A/B toggle is enabled', async () => {
        const user = userEvent.setup();
        const { container } = renderApp();
        // Only the two legend swatches use <line> before the toggle.
        expect(container.querySelectorAll('svg line')).toHaveLength(2);
        await user.click(screen.getByRole('checkbox', { name: 'A / B 辺を区別' }));
        // 2 legend swatches + 14 tile edges.
        expect(container.querySelectorAll('svg line')).toHaveLength(16);
    });

    it('draws Spectre as a native cubic Bézier path for Tile(1,1)', async () => {
        const user = userEvent.setup();
        const { container } = renderApp();

        await user.click(screen.getByRole('radio', { name: 'Spectre' }));

        expect(screen.getByText(/Spectre\s+Tile\(1, 1\)/)).toBeInTheDocument();
        expect(container.querySelector('svg path[d*="C"]')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'STL を保存' })).toBeInTheDocument();
    });

    it('adds a polyline point with the middle button and removes it with a double-click', async () => {
        const user = userEvent.setup();
        const { container } = renderApp();

        await user.click(screen.getByRole('radio', { name: 'Spectre' }));
        await user.click(screen.getByRole('radio', { name: '点列' }));

        const editor = screen.getByLabelText('Spectre の辺の曲線プレビュー');
        Object.defineProperties(editor, {
            getScreenCTM: {
                value: () => ({ inverse: () => ({}) }),
            },
            createSVGPoint: {
                value: () => ({
                    x: 0,
                    y: 0,
                    matrixTransform() {
                        return { x: this.x, y: this.y };
                    },
                }),
            },
        });

        const hitLine = container.querySelector('.curve-editor-hit');
        expect(hitLine).toBeInTheDocument();
        fireEvent.pointerDown(hitLine as Element, { button: 1, clientX: 0.4, clientY: 0 });

        const controlPoint = screen.getByRole('button', { name: '点列の制御点 1' });
        expect(controlPoint).toHaveAttribute('cx', '0.4');
        await user.dblClick(controlPoint);
        expect(screen.queryByRole('button', { name: '点列の制御点 1' })).not.toBeInTheDocument();
    });

    it('paints once in the editor and transfers the stroke to the tile', () => {
        const { container } = renderApp();
        const editor = screen.getByLabelText('タイルのペイント編集領域');
        Object.defineProperties(editor, {
            getScreenCTM: {
                value: () => ({ inverse: () => ({}) }),
            },
            createSVGPoint: {
                value: () => ({
                    x: 0,
                    y: 0,
                    matrixTransform() {
                        return { x: this.x, y: this.y };
                    },
                }),
            },
            setPointerCapture: { value: () => {} },
            hasPointerCapture: { value: () => false },
        });

        fireEvent.pointerDown(editor, {
            button: 0,
            isPrimary: true,
            pointerId: 1,
            clientX: 0.25,
            clientY: 0.7,
        });
        fireEvent.pointerMove(editor, { pointerId: 1, clientX: 0.75, clientY: 0.3 });
        fireEvent.pointerUp(editor, { pointerId: 1, clientX: 0.75, clientY: 0.3 });

        expect(screen.getByRole('button', { name: '元に戻す' })).toBeEnabled();
        expect(container.querySelector('.svg-host svg g[clip-path] line')).toBeInTheDocument();
    });

    it('uses stylus pressure to vary the transferred line width', () => {
        const { container } = renderApp();
        const editor = screen.getByLabelText('タイルのペイント編集領域');
        Object.defineProperties(editor, {
            getScreenCTM: { value: () => ({ inverse: () => ({}) }) },
            createSVGPoint: {
                value: () => ({
                    x: 0,
                    y: 0,
                    matrixTransform() {
                        return { x: this.x, y: this.y };
                    },
                }),
            },
            setPointerCapture: { value: () => {} },
            hasPointerCapture: { value: () => false },
        });

        fireEvent.pointerDown(editor, {
            button: 0,
            isPrimary: true,
            pointerType: 'pen',
            pointerId: 7,
            pressure: 0.1,
            clientX: 0.2,
            clientY: 0.8,
        });
        fireEvent.pointerMove(editor, {
            pointerType: 'pen',
            pointerId: 7,
            pressure: 1,
            clientX: 0.8,
            clientY: 0.2,
        });
        fireEvent.pointerUp(editor, { pointerType: 'pen', pointerId: 7, pressure: 0 });

        const editorLine = container.querySelector('.paint-editor-stroke');
        const transferredLine = container.querySelector('.svg-host svg g[clip-path] line');
        expect(editorLine).toBeInTheDocument();
        expect(transferredLine).toBeInTheDocument();
        expect(Number(editorLine?.getAttribute('stroke-width'))).toBeLessThan(0.025);
    });

    it('suppresses the pen long-press context menu only in the paint canvas', () => {
        renderApp();
        const editor = screen.getByLabelText('タイルのペイント編集領域');
        expect(fireEvent.contextMenu(editor)).toBe(false);
    });

    it('switches between the brush and partial-stroke eraser tools', async () => {
        const user = userEvent.setup();
        renderApp();

        expect(screen.getByRole('radio', { name: 'ブラシ' })).toBeChecked();
        await user.click(screen.getByRole('radio', { name: '消しゴム' }));
        expect(screen.getByRole('radio', { name: '消しゴム' })).toBeChecked();
        expect(screen.getByRole('slider', { name: '消しゴム幅' })).toHaveValue('0.08');
        expect(screen.queryByLabelText('色')).not.toBeInTheDocument();
    });

    it('changes the base color of the tile and editor preview', () => {
        const { container } = renderApp();
        fireEvent.change(screen.getByLabelText('タイル色'), { target: { value: '#12ab34' } });

        expect(container.querySelector('.paint-editor-tile')).toHaveAttribute('fill', '#12ab34');
        expect(
            container.querySelector('.svg-host svg polygon[fill="#12ab34"]'),
        ).toBeInTheDocument();
    });

    it('rotates the paint preview with the shared scene rotation', () => {
        const { container } = renderApp();
        fireEvent.change(screen.getByRole('slider', { name: 'ペイント回転 0°' }), {
            target: { value: '90' },
        });

        expect(container.querySelector('.paint-editor-rotating')).toHaveAttribute(
            'transform',
            'rotate(-90 0.5 0.5)',
        );
        expect(screen.getByRole('slider', { name: '回転 90°' })).toHaveValue('90');
    });

    it('selects and draws an articulated worm', async () => {
        const user = userEvent.setup();
        const { container } = renderApp();

        await user.click(screen.getByRole('radio', { name: 'Worm' }));
        await user.click(screen.getByRole('button', { name: 'E:I0' }));

        expect(screen.getByText(/Articulated Worm\s+E:I0/)).toBeInTheDocument();
        expect(screen.getByText('タイル数')).toBeInTheDocument();
        expect(container.querySelectorAll('.svg-host svg polygon')).toHaveLength(6);
        expect(container.querySelectorAll('.svg-host svg polygon[fill="orange"]')).toHaveLength(2);
        expect(container.querySelectorAll('.svg-host svg polygon[fill="purple"]')).toHaveLength(1);
        expect(screen.getByRole('checkbox', { name: 'コンポーネント色分け' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'コンポーネント境界' })).not.toBeChecked();
        expect(screen.queryByRole('button', { name: 'STL を保存' })).not.toBeInTheDocument();
        expect(screen.queryByText('Spectre パッチ')).not.toBeInTheDocument();
    });

    it('draws a worm with the single Spectre prototile', async () => {
        const user = userEvent.setup();
        const { container } = renderApp();

        await user.click(screen.getByRole('radio', { name: 'Worm' }));
        const spectreOptions = screen.getAllByRole('radio', { name: 'Spectre' });
        await user.click(spectreOptions[spectreOptions.length - 1]);

        expect(screen.getByText('構成タイル')).toBeInTheDocument();
        expect(screen.getByText(/Articulated Worm\s+E\s+·\s+Spectre/)).toBeInTheDocument();
        expect(container.querySelector('.svg-host svg path[d*="C"]')).toBeInTheDocument();
        expect(screen.getByLabelText('Spectre の辺の曲線プレビュー')).toBeInTheDocument();
    });

    it('opens the PB2 partition workbench with two movable N2 worms', async () => {
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole('radio', { name: 'Region' }));
        await user.click(screen.getByRole('button', { name: 'PB2' }));

        expect(screen.getByRole('button', { name: 'PB2' })).toHaveClass('active');
        expect(screen.getByRole('radio', { name: '手動調整' })).toBeChecked();
        expect(screen.getByText('Worm数').parentElement).toHaveTextContent('4');
    });

    it('opens the TB2 partition workbench with three movable S1 worms', async () => {
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole('radio', { name: 'Region' }));
        await user.click(screen.getByRole('button', { name: 'TB2' }));

        expect(screen.getByRole('button', { name: 'TB2' })).toHaveClass('active');
        expect(screen.getByRole('radio', { name: '手動調整' })).toBeChecked();
        expect(screen.getByText('Worm数').parentElement).toHaveTextContent('6');
    });

    it('opens the TD2 partition workbench with three movable M1 worms', async () => {
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole('radio', { name: 'Region' }));
        await user.click(screen.getByRole('button', { name: 'TD2' }));

        expect(screen.getByRole('button', { name: 'TD2' })).toHaveClass('active');
        expect(screen.getByRole('radio', { name: '手動調整' })).toBeChecked();
        expect(screen.getByText('Worm数').parentElement).toHaveTextContent('6');
    });

    it('opens the PA2 child-region placement experiment', async () => {
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole('radio', { name: 'Region' }));
        await user.click(screen.getByRole('button', { name: 'PA2-TA2' }));

        expect(screen.getByRole('button', { name: 'PA2-TA2' })).toHaveClass('active');
        expect(screen.getByRole('radio', { name: '手動調整' })).toBeChecked();
        expect(screen.getByText('Worm数').parentElement).toHaveTextContent('7');
    });

    it('offers child-region experiments for the TA2 and TC2 partitions', async () => {
        const user = userEvent.setup();
        renderApp();

        await user.click(screen.getByRole('radio', { name: 'Region' }));
        await user.click(screen.getByRole('button', { name: 'TA2-TC2' }));
        expect(screen.getByRole('button', { name: 'TA2-TC2' })).toHaveClass('active');
        expect(screen.getByText('Worm数').parentElement).toHaveTextContent('9');

        await user.click(screen.getByRole('button', { name: 'TC2-PA1' }));
        expect(screen.getByRole('button', { name: 'TC2-PA1' })).toHaveClass('active');
        expect(screen.getByText('Worm数').parentElement).toHaveTextContent('8');
    });
});

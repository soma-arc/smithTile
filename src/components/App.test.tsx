// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
        expect(screen.queryByRole('button', { name: 'STL を保存' })).not.toBeInTheDocument();
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
        expect(screen.getByRole('checkbox', { name: 'コンポーネント境界' })).toBeChecked();
        expect(screen.queryByRole('button', { name: 'STL を保存' })).not.toBeInTheDocument();
        expect(screen.queryByText('Spectre パッチ')).not.toBeInTheDocument();
    });
});

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app.css';
import { App } from './components/App';
import { TileStateProvider } from './hooks/useTileState';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('missing #root element');

createRoot(rootEl).render(
    <StrictMode>
        <TileStateProvider>
            <App />
        </TileStateProvider>
    </StrictMode>,
);

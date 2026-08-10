import { useEffect } from 'react';
import { useTileState } from '../hooks/useTileState';
import { CanvasPanel } from './canvas/CanvasPanel';
import { ControlsPanel } from './controls/ControlsPanel';
import { AppHeader } from './header/AppHeader';
import { InfoPanel } from './info/InfoPanel';

export function App() {
    const { lang } = useTileState();
    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    return (
        <div className="app">
            <AppHeader />
            <div className="app-body">
                <ControlsPanel />
                <CanvasPanel />
                <InfoPanel />
            </div>
        </div>
    );
}

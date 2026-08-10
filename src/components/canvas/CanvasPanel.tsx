import { Legend } from './Legend';
import { NotPolykiteNote } from './NotPolykiteNote';
import { PresetTitle } from './PresetTitle';
import { TileView } from './TileView';

export function CanvasPanel() {
    return (
        <main className="canvas-main">
            <div className="blueprint canvas-frame">
                <i className="corner tl" />
                <i className="corner tr" />
                <i className="corner bl" />
                <i className="corner br" />
                <div className="svg-host">
                    <TileView />
                </div>
                <Legend />
                <PresetTitle />
                <NotPolykiteNote />
            </div>
        </main>
    );
}

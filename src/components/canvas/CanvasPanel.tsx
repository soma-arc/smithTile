import { useTileState } from '../../hooks/useTileState';
import { Legend } from './Legend';
import { NotPolykiteNote } from './NotPolykiteNote';
import { PresetTitle } from './PresetTitle';
import { TileView } from './TileView';

export function CanvasPanel() {
    const { shape } = useTileState();
    return (
        <main className="canvas-main">
            <div className="blueprint canvas-frame">
                <i className="corner tl" />
                <i className="corner tr" />
                <i className="corner bl" />
                <i className="corner br" />
                <div className="svg-host">
                    <TileView
                        backend={
                            shape.kind === 'spectreWriggly' && shape.level === 2 ? 'canvas' : 'svg'
                        }
                    />
                </div>
                <Legend />
                <PresetTitle />
                <NotPolykiteNote />
            </div>
        </main>
    );
}

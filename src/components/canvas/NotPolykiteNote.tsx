import { polykiteValid } from '../../geometry/kiteGrid';
import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';

export function NotPolykiteNote() {
    const { a: tileA, b: tileB, lang, shape, toggles } = useTileState();
    if (
        shape.kind === 'articulatedWorm' ||
        shape.kind === 'region' ||
        shape.kind === 'articulatedPatch'
    ) {
        return null;
    }
    const a = shape.kind === 'spectre' ? 1 : tileA;
    const b = shape.kind === 'spectre' ? 1 : tileB;
    if (!(toggles.showPolykite && !polykiteValid(a, b))) return null;
    return <div className="not-polykite">{TRANSLATIONS[lang].notPolykiteNote}</div>;
}

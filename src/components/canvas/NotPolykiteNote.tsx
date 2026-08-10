import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { polykiteValid } from '../../kiteGrid';

export function NotPolykiteNote() {
    const { a, b, lang, toggles } = useTileState();
    if (!(toggles.showPolykite && !polykiteValid(a, b))) return null;
    return <div className="not-polykite">{TRANSLATIONS[lang].notPolykiteNote}</div>;
}

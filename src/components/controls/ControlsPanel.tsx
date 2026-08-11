import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { DisplayToggles } from './DisplayToggles';
import { IndependentControls } from './IndependentControls';
import { ModeToggle } from './ModeToggle';
import { PresetGrid } from './PresetGrid';
import { RatioControl } from './RatioControl';
import { RotationControl } from './RotationControl';
import { ZoomControl } from './ZoomControl';

export function ControlsPanel() {
    const { lang, mode } = useTileState();
    const t = TRANSLATIONS[lang];
    return (
        <aside className="controls">
            <section>
                <h6>{t.params}</h6>
                <ModeToggle />
                {mode === 'independent' ? <IndependentControls /> : <RatioControl />}
                <ZoomControl />
                <RotationControl />
            </section>

            <section>
                <h6>{t.presets}</h6>
                <PresetGrid />
            </section>

            <section>
                <h6>{t.display}</h6>
                <DisplayToggles />
            </section>
        </aside>
    );
}

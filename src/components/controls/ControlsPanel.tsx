import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { DisplayToggles } from './DisplayToggles';
import { IndependentControls } from './IndependentControls';
import { ModeToggle } from './ModeToggle';
import { PatchSelect } from './PatchSelect';
import { PresetGrid } from './PresetGrid';
import { RatioControl } from './RatioControl';
import { RotationControl } from './RotationControl';
import { StlExportPanel } from './StlExportPanel';
import { ZoomControl } from './ZoomControl';

export function ControlsPanel() {
    const { lang, mode, patch } = useTileState();
    const t = TRANSLATIONS[lang];
    const isTile = patch === null;
    return (
        <aside className="controls">
            <section>
                <h6>{t.shape}</h6>
                <PatchSelect />
            </section>

            <section>
                <h6>{t.params}</h6>
                {isTile && <ModeToggle />}
                {isTile && mode === 'independent' && <IndependentControls />}
                {isTile && mode === 'ratio' && <RatioControl />}
                <ZoomControl />
                <RotationControl />
            </section>

            {isTile && (
                <section>
                    <h6>{t.presets}</h6>
                    <PresetGrid />
                </section>
            )}

            <section>
                <h6>{t.display}</h6>
                <DisplayToggles />
            </section>

            {isTile && mode !== 'spectre' && (
                <section>
                    <h6>{t.exportStl}</h6>
                    <StlExportPanel />
                </section>
            )}
        </aside>
    );
}

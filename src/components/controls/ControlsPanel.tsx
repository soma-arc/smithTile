import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { DisplayToggles } from './DisplayToggles';
import { IndependentControls } from './IndependentControls';
import { ModeToggle } from './ModeToggle';
import {
    ArticulatedWormSelect,
    ShapeToggle,
    SpectrePatchSelect,
    SpectreRegionSelect,
} from './PatchSelect';
import { PresetGrid } from './PresetGrid';
import { RatioControl } from './RatioControl';
import { ReflectionToggle } from './ReflectionToggle';
import { RotationControl } from './RotationControl';
import { StlExportPanel } from './StlExportPanel';
import { ZoomControl } from './ZoomControl';

export function ControlsPanel() {
    const { lang, parameterMode, shape } = useTileState();
    const t = TRANSLATIONS[lang];
    const isTile = shape.kind === 'tile';
    const isSpectre = shape.kind === 'spectre';
    const isArticulatedWorm = shape.kind === 'articulatedWorm';
    const isRegion = shape.kind === 'region';
    return (
        <aside className="controls">
            <section>
                <h6>{t.shape}</h6>
                <ShapeToggle />
            </section>

            {isSpectre && (
                <section>
                    <h6>{t.spectrePatches}</h6>
                    <SpectrePatchSelect />
                </section>
            )}

            {isArticulatedWorm && (
                <section>
                    <h6>{t.articulatedWorms}</h6>
                    <ArticulatedWormSelect />
                </section>
            )}

            {isRegion && (
                <section>
                    <h6>{t.spectreRegions}</h6>
                    <SpectreRegionSelect />
                </section>
            )}

            <section>
                <h6>{t.params}</h6>
                {isTile && <ModeToggle />}
                {isTile && parameterMode === 'independent' && <IndependentControls />}
                {isTile && parameterMode === 'ratio' && <RatioControl />}
                {(isTile || isArticulatedWorm || isRegion) && <ReflectionToggle />}
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

            {isTile && (
                <section>
                    <h6>{t.exportStl}</h6>
                    <StlExportPanel />
                </section>
            )}
        </aside>
    );
}

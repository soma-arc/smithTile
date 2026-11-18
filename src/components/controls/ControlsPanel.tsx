import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { DisplayToggles } from './DisplayToggles';
import { IndependentControls } from './IndependentControls';
import { ModeToggle } from './ModeToggle';
import {
    ArticulatedWormSelect,
    AssemblyTileModeSelect,
    PatchFamilySelect,
    ShapeToggle,
    SpectrePatchSelect,
    SpectreRegionSelect,
    SpectreWrigglyPatchSelect,
    TileArticulatedPatchSelect,
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
    const isSpectre = shape.kind === 'spectre' || shape.kind === 'spectreWriggly';
    const isArticulatedWorm = shape.kind === 'articulatedWorm';
    const isRegion = shape.kind === 'region';
    const isPatch = shape.kind === 'articulatedPatch' || shape.kind === 'wrigglyPatch';
    return (
        <aside className="controls">
            <section>
                <h6>{t.shape}</h6>
                <ShapeToggle />
            </section>

            {isSpectre && (
                <section>
                    <h6>{t.spectrePatches}</h6>
                    <PatchFamilySelect />
                    {shape.kind === 'spectreWriggly' ? (
                        <SpectreWrigglyPatchSelect />
                    ) : (
                        <SpectrePatchSelect />
                    )}
                </section>
            )}

            {isPatch && (
                <section>
                    <h6>
                        {shape.kind === 'wrigglyPatch'
                            ? t.tileWrigglyPatches
                            : t.tileArticulatedPatches}
                    </h6>
                    <PatchFamilySelect />
                    <TileArticulatedPatchSelect />
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

            {(isArticulatedWorm || isRegion) && (
                <section>
                    <h6>{t.assemblyTiles}</h6>
                    <AssemblyTileModeSelect />
                </section>
            )}

            <section>
                <h6>{t.params}</h6>
                {(isTile || isPatch) && <ModeToggle />}
                {(isTile || isPatch) && parameterMode === 'independent' && <IndependentControls />}
                {(isTile || isPatch) && parameterMode === 'ratio' && <RatioControl />}
                {(isTile ||
                    isArticulatedWorm ||
                    isRegion ||
                    isPatch ||
                    shape.kind === 'spectreWriggly') && <ReflectionToggle />}
                <ZoomControl />
                <RotationControl />
            </section>

            {(isTile || isSpectre || isPatch) && (
                <section>
                    <h6>{t.exportStl}</h6>
                    <StlExportPanel />
                </section>
            )}

            {(isTile || isPatch) && (
                <section>
                    <h6>{t.presets}</h6>
                    <PresetGrid />
                </section>
            )}

            <section>
                <h6>{t.display}</h6>
                <DisplayToggles />
            </section>

        </aside>
    );
}

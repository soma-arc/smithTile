import { fmtNum } from '../../format';
import { findPreset } from '../../geometry/smithTile';
import { useTileState } from '../../hooks/useTileState';

export function PresetTitle() {
    const { a, assemblyTileMode, b, shape, presetName, lang } = useTileState();
    const assemblySuffix = assemblyTileMode === 'spectre' ? '  ·  Spectre' : '';
    const preset = findPreset(presetName);
    const title =
        shape.kind === 'articulatedPatch' || shape.kind === 'wrigglyPatch'
            ? `${preset ? `${preset.nick[lang]}  ` : ''}Tile(${fmtNum(a)}, ${fmtNum(b)}) ${shape.kind === 'wrigglyPatch' ? 'Wriggly' : 'Articulated'} Patch  ${shape.patch}${shape.level}`
            : shape.kind === 'spectreWriggly'
              ? `Spectre Wriggly Patch  ${shape.patch}${shape.level}`
              : shape.kind === 'region'
                ? `Spectre Region  ${shape.region}${assemblySuffix}`
                : shape.kind === 'articulatedWorm'
                  ? `Articulated Worm  ${shape.worm}${assemblySuffix}`
                  : shape.kind === 'spectre'
                    ? shape.patch
                        ? `Spectre Patch  ${shape.patch}`
                        : 'Spectre  Tile(1, 1)'
                    : `${preset ? `${preset.nick[lang]}  ` : ''}Tile(${fmtNum(a)}, ${fmtNum(b)})`;
    return <div className="preset-title">{title}</div>;
}

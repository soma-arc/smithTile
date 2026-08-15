/** Selects what to draw: the interactive Tile(a, b) or a prebuilt patch. */

import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import type { PatchKey } from '../../smithTile';
import { Segmented } from '../ui/Segmented';

type Choice = 'tile' | PatchKey;

export function PatchSelect() {
    const { lang, patch } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];

    const options: readonly { value: Choice; label: string }[] = [
        { value: 'tile', label: t.shapeTile },
        { value: 'T', label: 'T' },
        { value: 'T2x', label: 'T2x' },
        { value: 'T2y', label: 'T2y' },
    ];

    return (
        <Segmented
            name="shape-select"
            value={patch ?? 'tile'}
            options={options}
            onChange={(value) =>
                dispatch({ type: 'setPatch', patch: value === 'tile' ? null : value })
            }
        />
    );
}

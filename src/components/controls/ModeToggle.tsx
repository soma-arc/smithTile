import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import type { ParameterMode } from '../../state/tileReducer';
import { Segmented } from '../ui/Segmented';

export function ModeToggle() {
    const { lang, parameterMode } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];
    return (
        <Segmented<ParameterMode>
            name="mode"
            value={parameterMode}
            options={[
                { value: 'ratio', label: t.modeRatio },
                { value: 'independent', label: t.modeIndep },
            ]}
            onChange={(mode) => dispatch({ type: 'setParameterMode', mode })}
            containerStyle={{ width: '100%', marginBottom: 'var(--space-3)' }}
            optionStyle={{ flex: 1, justifyContent: 'center' }}
        />
    );
}

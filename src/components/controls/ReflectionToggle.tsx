import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { Segmented } from '../ui/Segmented';

type Orientation = 'normal' | 'mirrored';

export function ReflectionToggle() {
    const { lang, mirrored } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];
    const orientation: Orientation = mirrored ? 'mirrored' : 'normal';

    return (
        <fieldset className="field reflection-field">
            <legend className="field-heading">{t.orientation}</legend>
            <Segmented<Orientation>
                name="orientation"
                value={orientation}
                options={[
                    { value: 'normal', label: t.orientationNormal },
                    { value: 'mirrored', label: t.orientationMirrored },
                ]}
                onChange={(value) =>
                    dispatch({ type: 'setMirrored', mirrored: value === 'mirrored' })
                }
                containerStyle={{ width: '100%' }}
                optionStyle={{ flex: 1, justifyContent: 'center' }}
            />
        </fieldset>
    );
}

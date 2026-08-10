import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { type Lang, TRANSLATIONS } from '../../i18n';
import { Segmented } from '../ui/Segmented';

export function AppHeader() {
    const { lang } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];
    return (
        <header className="nav app-header">
            <div className="app-title-group">
                <span className="nav-brand">{t.appTitle}</span>
                <span className="app-subtitle">{t.subtitle}</span>
            </div>
            <Segmented<Lang>
                name="lang"
                value={lang}
                options={[
                    { value: 'ja', label: '日本語' },
                    { value: 'en', label: 'English' },
                ]}
                onChange={(lang) => dispatch({ type: 'setLang', lang })}
            />
        </header>
    );
}

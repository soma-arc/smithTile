import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import type { Toggles } from '../../state/tileReducer';

export function DisplayToggles() {
    const { lang, toggles } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];
    const defs: { key: keyof Toggles; label: string }[] = [
        { key: 'showGrid', label: t.grid },
        { key: 'showPolykite', label: t.polykite },
        { key: 'showAB', label: t.abEdges },
        { key: 'showVectors', label: t.vectors },
        { key: 'showVertexNums', label: t.vertexNums },
        { key: 'showLengths', label: t.lengths },
        { key: 'showAngles', label: t.angles },
        { key: 'showPorts', label: t.ports },
    ];
    return (
        <div>
            {defs.map((d) => (
                <label className="tv-toggle" key={d.key}>
                    <input
                        type="checkbox"
                        checked={toggles[d.key]}
                        onChange={() => dispatch({ type: 'toggle', key: d.key })}
                    />
                    <span className="tv-box">
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            aria-hidden="true"
                        >
                            <path d="M2 6.5 5 9.5 10 3" />
                        </svg>
                    </span>
                    <span>{d.label}</span>
                </label>
            ))}
        </div>
    );
}

import { fmtNum } from '../../format';
import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';

export function IndependentControls() {
    const { lang, a, b } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];
    return (
        <div className="field-row">
            <div className="field">
                <label htmlFor="param-a">a &nbsp;·&nbsp; {t.aEdges}</label>
                <input
                    id="param-a"
                    className="input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={fmtNum(a)}
                    onChange={(e) =>
                        dispatch({ type: 'setA', value: Number.parseFloat(e.target.value) })
                    }
                />
                <input
                    type="range"
                    min={0}
                    max={4}
                    step={0.01}
                    value={a}
                    aria-label="a"
                    style={{ marginTop: 8 }}
                    onChange={(e) =>
                        dispatch({ type: 'setA', value: Number.parseFloat(e.target.value) })
                    }
                />
            </div>
            <div className="field">
                <label htmlFor="param-b">b &nbsp;·&nbsp; {t.bEdges}</label>
                <input
                    id="param-b"
                    className="input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={fmtNum(b)}
                    onChange={(e) =>
                        dispatch({ type: 'setB', value: Number.parseFloat(e.target.value) })
                    }
                />
                <input
                    type="range"
                    min={0}
                    max={4}
                    step={0.01}
                    value={b}
                    aria-label="b"
                    style={{ marginTop: 8 }}
                    onChange={(e) =>
                        dispatch({ type: 'setB', value: Number.parseFloat(e.target.value) })
                    }
                />
            </div>
        </div>
    );
}

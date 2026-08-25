import { fmtMath } from '../../format';
import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { polykiteValid } from '../../kiteGrid';
import { closureError, createSmithTile, isAperiodic, SQRT3 } from '../../smithTile';
import { ARTICULATED_WORMS } from '../../spectreWorm';
import { IDENTITY_TRANSFORM } from '../../Transform';
import { Tag } from '../ui/Tag';
import { SpectreCurveEditor } from './SpectreCurveEditor';

const APERIODIC_TAG = { background: 'var(--color-accent-100)', color: 'var(--color-accent-800)' };
const PERIODIC_TAG = { background: 'var(--color-neutral-200)', color: 'var(--color-neutral-800)' };
const POLYKITE_YES_TAG = {
    background: 'var(--color-accent-100)',
    color: 'var(--color-accent-800)',
};
const POLYKITE_NO_TAG = {
    background: 'var(--color-neutral-200)',
    color: 'var(--color-neutral-700)',
};

export function InfoPanel() {
    const { a: tileA, b: tileB, lang, shape } = useTileState();
    const t = TRANSLATIONS[lang];
    if (shape.kind === 'articulatedWorm') {
        const worm = ARTICULATED_WORMS[shape.worm];
        return (
            <aside className="info">
                <h6>{t.info}</h6>
                <div>
                    <div className="info-stat-label">Articulated Worm</div>
                    <div className="info-stat-value">{shape.worm}</div>
                </div>
                <hr className="hr" style={{ margin: '2px 0' }} />
                <div className="info-list">
                    <div className="info-row">
                        <span className="k">{t.family}</span>
                        <span className="v">{t.articulated}</span>
                    </div>
                    <div className="info-row">
                        <span className="k">{t.tileCount}</span>
                        <span className="v">{worm.tiles.length}</span>
                    </div>
                    <div className="info-row">
                        <span className="k">{t.frontEnd}</span>
                        <span className="v">{worm.front.atomKind}</span>
                    </div>
                    <div className="info-row">
                        <span className="k">{t.rearEnd}</span>
                        <span className="v">{worm.rear.atomKind}</span>
                    </div>
                </div>
            </aside>
        );
    }
    const isSpectre = shape.kind === 'spectre';
    const a = isSpectre ? 1 : tileA;
    const b = isSpectre ? 1 : tileB;

    const pkValid = polykiteValid(a, b);
    const isException = !isSpectre && !isAperiodic(createSmithTile(a, b, IDENTITY_TRANSFORM));
    const ratioStr =
        a > 0 ? (Math.abs(b / a - SQRT3) < 1e-6 ? '√3 ≈ 1.732' : (b / a).toFixed(3)) : '∞';
    const err = closureError(a, b);
    const closureStr = err < 1e-12 ? '< 1e-12' : err.toExponential(1);

    return (
        <aside className="info">
            <h6>{t.info}</h6>

            {isSpectre && <SpectreCurveEditor />}

            <div>
                <div className="info-stat-label">a : b</div>
                <div className="info-stat-value">{`${fmtMath(a)} : ${fmtMath(b)}`}</div>
            </div>
            <div>
                <div className="info-stat-label">b / a</div>
                <div className="info-stat-value">{ratioStr}</div>
            </div>

            <hr className="hr" style={{ margin: '2px 0' }} />

            <div className="info-list">
                <div className="info-row">
                    <span className="k">{t.edgeCount}</span>
                    <span className="v">{`14 (${t.shown} 13)`}</span>
                </div>
                <div className="info-row">
                    <span className="k">{t.closure}</span>
                    <span className="v">{closureStr}</span>
                </div>
                <div>
                    <div className="info-block-label">{t.family}</div>
                    <Tag
                        label={isException ? t.periodic : t.aperiodic}
                        style={isException ? PERIODIC_TAG : APERIODIC_TAG}
                    />
                </div>
                <div>
                    <div className="info-block-label">{t.polykiteLabel}</div>
                    <Tag
                        label={pkValid ? t.polykiteYes : t.polykiteNo}
                        style={pkValid ? POLYKITE_YES_TAG : POLYKITE_NO_TAG}
                    />
                </div>
            </div>
        </aside>
    );
}

/**
 * Tile(a, b) 可視化ツール — application entry point.
 *
 * Owns the UI state, wires the controls, and re-renders on every change. All
 * geometry lives in the reusable modules (tile / kiteGrid / renderer); this
 * file is only glue: state → DOM.
 */

import './app.css';
import { fmtMath, fmtNum } from './format';
import { type Lang, type Strings, TRANSLATIONS } from './i18n';
import { polykiteValid } from './kiteGrid';
import { buildTileSVG, type RenderState } from './renderer';
import {
    closureError,
    createSmithTile,
    findPreset,
    isAperiodic,
    PRESETS,
    type Preset,
    SQRT3,
} from './smithTile';
import { IDENTITY_TRANSFORM } from './Transform';

type Mode = 'ratio' | 'independent';

interface Toggles {
    showGrid: boolean;
    showPolykite: boolean;
    showAB: boolean;
    showVectors: boolean;
    showVertexNums: boolean;
    showLengths: boolean;
}

interface AppState {
    lang: Lang;
    mode: Mode;
    a: number;
    b: number;
    zoom: number;
    toggles: Toggles;
    presetName: string;
}

const state: AppState = {
    lang: 'ja',
    mode: 'ratio', // implementation policy §6: prioritize ratio mode initially
    a: 1,
    b: SQRT3, // Hat
    zoom: 1,
    toggles: {
        showGrid: false,
        showPolykite: false,
        showAB: false,
        showVectors: false,
        showVertexNums: false,
        showLengths: false,
    },
    presetName: 'hat',
};

// Display toggles, in order, paired with their i18n key.
const TOGGLE_DEFS: Array<{ key: keyof Toggles; i18n: keyof Strings }> = [
    { key: 'showGrid', i18n: 'grid' },
    { key: 'showPolykite', i18n: 'polykite' },
    { key: 'showAB', i18n: 'abEdges' },
    { key: 'showVectors', i18n: 'vectors' },
    { key: 'showVertexNums', i18n: 'vertexNums' },
    { key: 'showLengths', i18n: 'lengths' },
];

// ── tiny DOM helpers ────────────────────────────────────────────────────────

const $ = <T extends Element = HTMLElement>(sel: string): T => {
    const el = document.querySelector<T>(sel);
    if (!el) throw new Error(`missing element: ${sel}`);
    return el;
};

/** Set an input's value without disrupting the field the user is editing. */
function setInputValue(el: HTMLInputElement, value: string): void {
    if (document.activeElement === el) return;
    if (el.value !== value) el.value = value;
}

// ── state transitions ───────────────────────────────────────────────────────

/** Apply a patch and mark the current shape as a custom (non-preset) one. */
function setCustom(patch: Partial<AppState>): void {
    Object.assign(state, patch, { presetName: 'custom' });
    render();
}

function applyPreset(p: Preset): void {
    state.a = p.a;
    state.b = p.b;
    state.presetName = p.key;
    // Chevron (a = 0) cannot be expressed as a finite ratio; force independent.
    if (p.a === 0) state.mode = 'independent';
    render();
}

// ── one-time DOM construction ────────────────────────────────────────────────

function buildPresetButtons(): void {
    const grid = $('#preset-grid');
    grid.innerHTML = '';
    for (const p of PRESETS) {
        const btn = document.createElement('button');
        btn.className = 'btn tv-preset';
        btn.dataset.key = p.key;
        btn.addEventListener('click', () => applyPreset(p));
        grid.appendChild(btn);
    }
}

function buildToggles(): void {
    const list = $('#toggle-list');
    list.innerHTML = '';
    for (const def of TOGGLE_DEFS) {
        const label = document.createElement('label');
        label.className = 'tv-toggle';
        label.dataset.key = def.key;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.addEventListener('change', () => {
            state.toggles[def.key] = input.checked;
            render();
        });

        const box = document.createElement('span');
        box.className = 'tv-box';
        box.innerHTML =
            '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M2 6.5 5 9.5 10 3"/></svg>';

        const text = document.createElement('span');
        text.className = 'toggle-text';

        label.append(input, box, text);
        list.appendChild(label);
    }
}

function wireControls(): void {
    // language
    for (const r of document.querySelectorAll<HTMLInputElement>('input[name="lang"]')) {
        r.addEventListener('change', () => {
            if (r.checked) {
                state.lang = r.value as Lang;
                document.documentElement.lang = state.lang;
                render();
            }
        });
    }

    // parameter mode
    for (const r of document.querySelectorAll<HTMLInputElement>('input[name="mode"]')) {
        r.addEventListener('change', () => {
            if (!r.checked) return;
            const mode = r.value as Mode;
            if (mode === 'ratio') {
                // Collapse to a = 1, keeping the current ratio.
                const ratio = state.a > 0 ? state.b / state.a : state.b;
                setCustom({ mode, a: 1, b: ratio });
            } else {
                setCustom({ mode });
            }
        });
    }

    // independent a / b (number + range share handlers)
    const setA = (raw: string) => {
        const v = Math.max(0, parseFloat(raw) || 0);
        if (v === 0 && state.b === 0) return;
        setCustom({ a: v });
    };
    const setB = (raw: string) => {
        const v = Math.max(0, parseFloat(raw) || 0);
        if (v === 0 && state.a === 0) return;
        setCustom({ b: v });
    };
    for (const s of ['#a-num', '#a-range']) {
        $<HTMLInputElement>(s).addEventListener('input', (e) =>
            setA((e.target as HTMLInputElement).value),
        );
    }
    for (const s of ['#b-num', '#b-range']) {
        $<HTMLInputElement>(s).addEventListener('input', (e) =>
            setB((e.target as HTMLInputElement).value),
        );
    }

    // ratio slider
    $<HTMLInputElement>('#ratio-range').addEventListener('input', (e) => {
        const r = parseFloat((e.target as HTMLInputElement).value) || 0;
        setCustom({ a: 1, b: r });
    });

    // zoom
    $<HTMLInputElement>('#zoom-range').addEventListener('input', (e) => {
        state.zoom = parseFloat((e.target as HTMLInputElement).value);
        render();
    });
}

// ── render ───────────────────────────────────────────────────────────────────

let lastSvgSig = '';

function renderSVG(): void {
    const rs: RenderState = { a: state.a, b: state.b, zoom: state.zoom, ...state.toggles };
    const sig = [
        rs.a,
        rs.b,
        rs.zoom,
        rs.showGrid,
        rs.showPolykite,
        rs.showAB,
        rs.showVectors,
        rs.showVertexNums,
        rs.showLengths,
    ].join('|');
    if (sig === lastSvgSig) return;
    lastSvgSig = sig;

    const host = $('#svg-host');
    host.replaceChildren(buildTileSVG(rs));
}

function render(): void {
    const t = TRANSLATIONS[state.lang];
    const { a, b } = state;

    // static i18n text nodes
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
        const key = el.dataset.i18n as keyof Strings;
        el.textContent = t[key];
    });

    // reflect selected radios (in case state changed programmatically)
    for (const r of document.querySelectorAll<HTMLInputElement>('input[name="lang"]')) {
        r.checked = r.value === state.lang;
    }
    for (const r of document.querySelectorAll<HTMLInputElement>('input[name="mode"]')) {
        r.checked = r.value === state.mode;
    }

    // mode panels
    $('#panel-indep').classList.toggle('hidden', state.mode !== 'independent');
    $('#panel-ratio').classList.toggle('hidden', state.mode !== 'ratio');

    // independent inputs
    setInputValue($<HTMLInputElement>('#a-num'), fmtNum(a));
    setInputValue($<HTMLInputElement>('#b-num'), fmtNum(b));
    setInputValue($<HTMLInputElement>('#a-range'), String(a));
    setInputValue($<HTMLInputElement>('#b-range'), String(b));

    // ratio inputs
    const ratioVal = a > 0 ? Math.min(4, b / a) : 0;
    setInputValue($<HTMLInputElement>('#ratio-range'), String(ratioVal));
    $('#ratio-readout').textContent = a > 0 ? (b / a).toFixed(2) : '∞';

    // zoom
    setInputValue($<HTMLInputElement>('#zoom-range'), String(state.zoom));
    $('#zoom-readout').textContent = `${state.zoom.toFixed(2)}×`;

    // preset buttons
    for (const btn of document.querySelectorAll<HTMLButtonElement>('#preset-grid .tv-preset')) {
        const key = btn.dataset.key;
        const p = key ? findPreset(key) : undefined;
        if (!p) continue;
        const nick = p.nick[state.lang];
        const coords = `(${fmtNum(p.a)}, ${fmtNum(p.b)})`;
        btn.textContent = /Tile\(/.test(nick) ? nick : `${nick}\n${coords}`;
        btn.classList.toggle('active', state.presetName === p.key);
    }

    // toggles
    for (const label of document.querySelectorAll<HTMLLabelElement>('#toggle-list .tv-toggle')) {
        const key = label.dataset.key as keyof Toggles;
        const def = TOGGLE_DEFS.find((d) => d.key === key);
        const input = label.querySelector<HTMLInputElement>('input');
        const text = label.querySelector<HTMLSpanElement>('.toggle-text');
        if (!def || !input || !text) continue;
        input.checked = state.toggles[key];
        text.textContent = t[def.i18n];
    }

    // canvas overlays
    const preset = findPreset(state.presetName);
    $('#preset-title').textContent =
        `${preset ? `${preset.nick[state.lang]}  ` : ''}Tile(${fmtNum(a)}, ${fmtNum(b)})`;

    const pkValid = polykiteValid(a, b);
    $('#not-polykite').classList.toggle('hidden', !(state.toggles.showPolykite && !pkValid));

    // info panel
    $('#ab-str').textContent = `${fmtMath(a)} : ${fmtMath(b)}`;
    $('#ratio-str').textContent =
        a > 0 ? (Math.abs(b / a - SQRT3) < 1e-6 ? '√3 ≈ 1.732' : (b / a).toFixed(3)) : '∞';
    $('#edges-str').textContent = `14 (${t.shown} 13)`;
    const err = closureError(a, b);
    $('#closure-str').textContent = err < 1e-12 ? '< 1e-12' : err.toExponential(1);

    const isException = !isAperiodic(createSmithTile(a, b, IDENTITY_TRANSFORM));
    const familyTag = $('#family-tag');
    familyTag.textContent = isException ? t.periodic : t.aperiodic;
    familyTag.style.cssText = isException
        ? 'background:var(--color-neutral-200);color:var(--color-neutral-800);'
        : 'background:var(--color-accent-100);color:var(--color-accent-800);';

    const pkTag = $('#polykite-tag');
    pkTag.textContent = pkValid ? t.polykiteYes : t.polykiteNo;
    pkTag.style.cssText = pkValid
        ? 'background:var(--color-accent-100);color:var(--color-accent-800);'
        : 'background:var(--color-neutral-200);color:var(--color-neutral-700);';

    renderSVG();
}

// ── bootstrap ────────────────────────────────────────────────────────────────

buildPresetButtons();
buildToggles();
wireControls();
render();

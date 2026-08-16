/** Bilingual (Japanese / English) UI strings. */

export type Lang = 'ja' | 'en';

export interface Strings {
    appTitle: string;
    subtitle: string;
    params: string;
    modeIndep: string;
    modeRatio: string;
    aEdges: string;
    bEdges: string;
    ratioLabel: string;
    zoom: string;
    rotation: string;
    shape: string;
    shapeTile: string;
    presets: string;
    display: string;
    grid: string;
    polykite: string;
    abEdges: string;
    vectors: string;
    vertexNums: string;
    vertexDots: string;
    lengths: string;
    angles: string;
    ports: string;
    legendSocket: string;
    legendPlug: string;
    info: string;
    edgeCount: string;
    closure: string;
    family: string;
    aperiodic: string;
    periodic: string;
    polykiteLabel: string;
    polykiteYes: string;
    polykiteNo: string;
    legendA: string;
    legendB: string;
    notPolykiteNote: string;
    shown: string;
}

export const TRANSLATIONS: Record<Lang, Strings> = {
    ja: {
        appTitle: 'Tile(a, b) 可視化ツール',
        subtitle: '非周期モノタイル連続族',
        params: 'パラメータ',
        modeIndep: '独立',
        modeRatio: '比率',
        aEdges: 'A辺 ×8',
        bEdges: 'B辺 ×6',
        ratioLabel: '比率 b / a',
        zoom: '表示スケール',
        rotation: '回転',
        shape: '図形',
        shapeTile: 'Tile(a, b)',
        presets: 'プリセット',
        display: '表示',
        grid: '参照グリッド (kite)',
        polykite: '8 kite 分解 (Hat)',
        abEdges: 'A / B 辺を区別',
        vectors: '方向ベクトル',
        vertexNums: '頂点番号 (14辺)',
        vertexDots: '頂点の点',
        lengths: '辺長ラベル a / b',
        angles: '内角ラベル (°)',
        ports: 'ポート候補',
        legendSocket: 'ソケット候補 (120°)',
        legendPlug: 'プラグ候補 (240°)',
        info: '情報',
        edgeCount: '辺数',
        closure: '閉路誤差',
        family: '分類',
        aperiodic: '強非周期 (einstein)',
        periodic: '周期的（例外点）',
        polykiteLabel: 'polykite 表示',
        polykiteYes: 'この格子上で可',
        polykiteNo: '不可（一般比率）',
        legendA: 'A辺（長さ a）・8本',
        legendB: 'B辺（長さ b）・6本',
        notPolykiteNote:
            '現在の比率は基礎 kite grid 上の polykite ではありません。背景は Hat の元の格子を参照として表示しています。',
        shown: '表示',
    },
    en: {
        appTitle: 'Tile(a, b) Visualizer',
        subtitle: 'Aperiodic monotile continuum',
        params: 'Parameters',
        modeIndep: 'Independent',
        modeRatio: 'Ratio',
        aEdges: 'A-edges ×8',
        bEdges: 'B-edges ×6',
        ratioLabel: 'Ratio b / a',
        zoom: 'View scale',
        rotation: 'Rotation',
        shape: 'Shape',
        shapeTile: 'Tile(a, b)',
        presets: 'Presets',
        display: 'Display',
        grid: 'Reference grid (kite)',
        polykite: '8-kite decomposition (Hat)',
        abEdges: 'Distinguish A / B edges',
        vectors: 'Direction vectors',
        vertexNums: 'Vertex numbers (14)',
        vertexDots: 'Vertex dots',
        lengths: 'Edge-length labels a / b',
        angles: 'Interior angles (°)',
        ports: 'Port candidates',
        legendSocket: 'Socket candidate (120°)',
        legendPlug: 'Plug candidate (240°)',
        info: 'Info',
        edgeCount: 'Edges',
        closure: 'Closure error',
        family: 'Class',
        aperiodic: 'Strongly aperiodic (einstein)',
        periodic: 'Periodic (exception)',
        polykiteLabel: 'Polykite view',
        polykiteYes: 'Available on grid',
        polykiteNo: 'Not available',
        legendA: 'A-edge (length a) · 8',
        legendB: 'B-edge (length b) · 6',
        notPolykiteNote:
            "This ratio is not a polykite on the base kite grid. The background shows the Hat's original grid only as a reference.",
        shown: 'shown',
    },
};

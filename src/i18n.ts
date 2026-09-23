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
    orientation: string;
    orientationNormal: string;
    orientationMirrored: string;
    zoom: string;
    rotation: string;
    shape: string;
    shapeTile: string;
    shapeSpectre: string;
    shapeArticulatedWorm: string;
    articulatedWorms: string;
    assemblyTiles: string;
    assemblyHatTurtle: string;
    assemblySpectre: string;
    shapeRegion: string;
    spectreRegions: string;
    regionPlacementAuto: string;
    regionPlacementManual: string;
    regionPlacementReset: string;
    spectrePatches: string;
    spectreSingle: string;
    spectreCurve: string;
    spectreCurvePreview: string;
    curveStraight: string;
    curveBezier: string;
    curvePolyline: string;
    dragControlPoints: string;
    editPolylinePoints: string;
    polylineControlPoint: string;
    resetCurve: string;
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
    patchPorts: string;
    componentColors: string;
    componentBorders: string;
    wormEnds: string;
    legendSocket: string;
    legendPlug: string;
    info: string;
    edgeCount: string;
    closure: string;
    family: string;
    articulated: string;
    tileCount: string;
    frontEnd: string;
    rearEnd: string;
    regionLevel: string;
    wormCount: string;
    aperiodic: string;
    periodic: string;
    polykiteLabel: string;
    polykiteYes: string;
    polykiteNo: string;
    legendA: string;
    legendB: string;
    notPolykiteNote: string;
    shown: string;
    exportStl: string;
    saveStl: string;
    stlInvalidBoundary: string;
    tilePaint: string;
    tileColor: string;
    paintCanvas: string;
    paintRotation: string;
    paintVisible: string;
    paintColor: string;
    paintWidth: string;
    paintUndo: string;
    paintClear: string;
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
        orientation: '向き',
        orientationNormal: '通常',
        orientationMirrored: '鏡像',
        zoom: '表示スケール',
        rotation: '回転',
        shape: '図形',
        shapeTile: 'Tile(a, b)',
        shapeSpectre: 'Spectre',
        shapeArticulatedWorm: 'Worm',
        articulatedWorms: 'Articulated Worm',
        assemblyTiles: '構成タイル',
        assemblyHatTurtle: 'Hat / Turtle',
        assemblySpectre: 'Spectre',
        shapeRegion: 'Region',
        spectreRegions: 'Spectre Region',
        regionPlacementAuto: '自動配置',
        regionPlacementManual: '手動調整',
        regionPlacementReset: '配置をリセット',
        spectrePatches: 'Spectre パッチ',
        spectreSingle: 'Single',
        spectreCurve: '辺の曲線',
        spectreCurvePreview: 'Spectre の辺の曲線プレビュー',
        curveStraight: '直線',
        curveBezier: 'ベジェ',
        curvePolyline: '点列',
        dragControlPoints: 'C1 / C2 をドラッグして調整',
        editPolylinePoints: 'ホイールクリックで追加・ドラッグで移動・ダブルクリックで削除',
        polylineControlPoint: '点列の制御点',
        resetCurve: '初期値',
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
        patchPorts: 'プラグ/ソケット矢印',
        componentColors: 'コンポーネント色分け',
        componentBorders: 'コンポーネント境界',
        wormEnds: 'Front / Rear',
        legendSocket: 'ソケット候補 (120°)',
        legendPlug: 'プラグ候補 (240°)',
        info: '情報',
        edgeCount: '辺数',
        closure: '閉路誤差',
        family: '分類',
        articulated: '関節型',
        tileCount: 'タイル数',
        frontEnd: '前端',
        rearEnd: '後端',
        regionLevel: 'レベル',
        wormCount: 'Worm数',
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
        exportStl: '3D 出力',
        saveStl: 'STL を保存',
        stlInvalidBoundary: '境界が自己交差しているため、STLを作成できません。',
        tilePaint: 'タイルペイント',
        tileColor: 'タイル色',
        paintCanvas: 'タイルのペイント編集領域',
        paintRotation: 'ペイント回転',
        paintVisible: '表示',
        paintColor: '色',
        paintWidth: '線幅',
        paintUndo: '元に戻す',
        paintClear: '全消去',
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
        orientation: 'Orientation',
        orientationNormal: 'Normal',
        orientationMirrored: 'Mirrored',
        zoom: 'View scale',
        rotation: 'Rotation',
        shape: 'Shape',
        shapeTile: 'Tile(a, b)',
        shapeSpectre: 'Spectre',
        shapeArticulatedWorm: 'Worm',
        articulatedWorms: 'Articulated worms',
        assemblyTiles: 'Constituent tiles',
        assemblyHatTurtle: 'Hat / Turtle',
        assemblySpectre: 'Spectre',
        shapeRegion: 'Region',
        spectreRegions: 'Spectre regions',
        regionPlacementAuto: 'Automatic',
        regionPlacementManual: 'Manual',
        regionPlacementReset: 'Reset placement',
        spectrePatches: 'Spectre patches',
        spectreSingle: 'Single',
        spectreCurve: 'Edge curve',
        spectreCurvePreview: 'Spectre edge curve preview',
        curveStraight: 'Straight',
        curveBezier: 'Bézier',
        curvePolyline: 'Polyline',
        dragControlPoints: 'Drag C1 / C2 to adjust',
        editPolylinePoints: 'Middle-click to add, drag to move, double-click to remove',
        polylineControlPoint: 'Polyline control point',
        resetCurve: 'Reset',
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
        patchPorts: 'Plug / socket arrows',
        componentColors: 'Component colors',
        componentBorders: 'Component borders',
        wormEnds: 'Front / Rear',
        legendSocket: 'Socket candidate (120°)',
        legendPlug: 'Plug candidate (240°)',
        info: 'Info',
        edgeCount: 'Edges',
        closure: 'Closure error',
        family: 'Class',
        articulated: 'Articulated',
        tileCount: 'Tiles',
        frontEnd: 'Front end',
        rearEnd: 'Rear end',
        regionLevel: 'Level',
        wormCount: 'Worms',
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
        exportStl: '3D export',
        saveStl: 'Save STL',
        stlInvalidBoundary: 'The boundary intersects itself, so an STL cannot be created.',
        tilePaint: 'Tile paint',
        tileColor: 'Tile color',
        paintCanvas: 'Tile paint editor',
        paintRotation: 'Paint rotation',
        paintVisible: 'Visible',
        paintColor: 'Color',
        paintWidth: 'Width',
        paintUndo: 'Undo',
        paintClear: 'Clear',
    },
};

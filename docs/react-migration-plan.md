# React 移行計画書 — Tile(a, b) 可視化ツール UI

## 1. 目的とスコープ

現在の UI 層（命令的な DOM 操作）を **React（宣言的コンポーネント）** に置き換える。
責務を「ドメイン（幾何）／状態（ロジック）／表示（コンポーネント）」に明確に分離する。

### 置き換える対象（UI 層）
- `index.html`（静的シェル）→ `#root` + `main.tsx`
- `src/main.ts`（状態・DOM 配線・`render()`）→ React コンポーネント + 状態管理
- `src/renderer.ts`（命令的 SVG 構築）→ **バックエンド非依存の描画モデル（Scene）＋ SVG バックエンド**（§7。将来 Canvas/WebGL を足せる構造）

### 変更しない対象（再利用する既存資産）
- **ドメイン層（DOM 非依存・純粋）**: `smithTile.ts` / `kiteGrid.ts` / `Vec2.ts` / `Transform.ts`
- `i18n.ts`（文言データ）/ `format.ts`（整形）→ そのまま import して利用
- `design-system.css` / `app.css` → 原則そのまま（クラス名を JSX の `className` で使用）
- Vitest による幾何テスト（`smithTile.test.ts`）→ node 環境のまま維持

> 原則: **React はプレゼンテーション層だけを担当する**。幾何計算は既存の純粋関数を呼ぶだけで、ロジックを React 内に再実装しない。

---

## 2. 設計原則（責務分離）

| レイヤー | 責務 | React 依存 | 該当 |
|---|---|---|---|
| Domain | 幾何・数学・分類（純粋関数、不変データ） | なし | `smithTile` / `kiteGrid` / `Vec2` / `Transform` |
| Render(core) | 描画モデル生成・投影（**バックエンド非依存**、純粋） | なし | `render/scene.ts` / `render/camera.ts`(新) |
| Render(backend) | Scene を実際に描く（SVG/Canvas…） | あり(SVG) | `render/backends/**`(新) |
| Lib | 整形・文言 | なし | `format` / `i18n` |
| State | UI 状態と遷移（reducer） | hooks のみ | `state/tileReducer.ts`(新) |
| Presentation | 見た目・入力の受け渡し（dumb components） | あり | `components/**` |
| Container | 状態と表示の結線 | あり | `App.tsx` |

- **表示コンポーネントは状態を持たない**（props と callback のみ）。例外は純粋にローカルな UI 状態（例: フォーカス）。
- **派生値はコンポーネント内に散らさず** `useMemo` セレクタ / 派生 hook に集約（現 `render()` 内の計算の移設先）。
- **描画は「何を描くか（Scene, 純粋）」と「どう描くか（backend, SVG/Canvas）」を分離**する（§7）。SVG 固有型を上位に漏らさない。

---

## 3. 全体アーキテクチャ

```
main.tsx
 └─ <App>                          … 状態(reducer)を保持し Context で配布
     ├─ <AppHeader>                … タイトル + 言語切替
     ├─ <ControlsPanel>            … 左カラム
     │    ├─ <ModeToggle>
     │    ├─ <IndependentControls> | <RatioControl>   (mode で分岐)
     │    ├─ <ZoomControl>
     │    ├─ <PresetGrid> → <PresetButton*>
     │    └─ <DisplayToggles> → <ToggleCheckbox*>
     ├─ <CanvasPanel>              … 中央カラム
     │    ├─ <TileView backend="svg">   … Scene(描画モデル) をバックエンドで描く
     │    │    └─ <SvgBackend> | <CanvasBackend>   (差し替え可能。§7)
     │    ├─ <Legend>
     │    ├─ <PresetTitle>
     │    └─ <NotPolykiteNote>     (条件表示)
     └─ <InfoPanel>               … 右カラム
          ├─ <StatBlock>*         (a:b, b/a)
          ├─ <InfoRow>*           (辺数, 閉路誤差)
          └─ <Tag>*               (分類, polykite 可否)
```

---

## 4. ディレクトリ構成（提案）

```
src/
├── domain/                 # 移動 or 現状維持（純粋・DOM非依存）
│   ├── smithTile.ts
│   ├── kiteGrid.ts
│   ├── Vec2.ts
│   └── Transform.ts
├── lib/
│   ├── i18n.ts             # 既存
│   ├── format.ts           # 既存
│   └── projection.ts       # 新規: refFrame + project(world→screen)
├── state/
│   └── tileReducer.ts      # 新規: State/Action/reducer/初期状態
├── render/                 # 描画（バックエンド非依存）— §7 の中核
│   ├── scene.ts            # Drawable/Scene 型 + buildScene(world, camera) 純粋関数
│   ├── camera.ts           # refFrame + Camera(project) （旧 projection.ts を統合）
│   ├── colors.ts           # 描画色トークン
│   └── backends/
│       ├── SvgBackend.tsx  # Scene → JSX(<svg>)（今回実装）
│       └── CanvasBackend.tsx # Scene → <canvas> 2D（将来。IF だけ用意）
├── hooks/
│   ├── useTileState.ts     # reducer + Context を束ねる
│   └── useScene.ts         # world モデル+camera → Scene を memo（旧 useTileGeometry）
├── components/
│   ├── App.tsx
│   ├── header/  AppHeader.tsx, LanguageToggle.tsx
│   ├── controls/ ControlsPanel.tsx, ModeToggle.tsx, IndependentControls.tsx,
│   │             RatioControl.tsx, ZoomControl.tsx, PresetGrid.tsx,
│   │             PresetButton.tsx, DisplayToggles.tsx, ToggleCheckbox.tsx,
│   │             Field.tsx, Slider.tsx, Segmented.tsx
│   ├── canvas/  CanvasPanel.tsx, TileView.tsx, Legend.tsx, PresetTitle.tsx,
│   │            NotPolykiteNote.tsx
│   └── info/    InfoPanel.tsx, StatBlock.tsx, InfoRow.tsx, Tag.tsx
├── styles/  design-system.css, app.css   # 既存を移動（任意）
└── main.tsx                # createRoot(<App/>)
```

> 粒度は目安。`Field`/`Slider`/`Segmented`/`Tag` などの汎用 UI は共通化して重複を減らす。過剰分割が負担なら `controls` はまず 1 ファイルにまとめ、後で分割してもよい。
> **描画レイヤーはコンポーネントではなく `render/scene.ts` の純粋関数**にする（§7）。これが Canvas 追加時の障害を防ぐ肝。

---

## 5. 状態管理

現 `AppState` をそのまま `useReducer` の state に移す。遷移ロジック（`setCustom` / `applyPreset` / モード切替の派生再計算）が非自明なため、**`useReducer` + Context** を推奨（プロップドリリング回避）。

### State
```ts
type Mode = 'ratio' | 'independent';
type Toggles = {
  showGrid: boolean; showPolykite: boolean; showAB: boolean;
  showVectors: boolean; showVertexNums: boolean; showLengths: boolean;
};
type TileState = {
  lang: 'ja' | 'en';
  mode: Mode;
  a: number; b: number;
  zoom: number;
  toggles: Toggles;
  presetName: string;         // 'custom' を含む
  transform: Transform;       // 既定 IDENTITY_TRANSFORM
};
```

### Actions（現 main.ts の各ハンドラを移植）
| Action | 現行の対応 | 備考 |
|---|---|---|
| `setLang` | 言語ラジオ | |
| `setMode` | mode seg | ratio 化時に `a=1, b=b/a, presetName='custom'` |
| `setA` / `setB` | 数値/レンジ | `a=b=0` を拒否、`presetName='custom'` |
| `setRatio` | ratio スライダー | `a=1, b=r, presetName='custom'` |
| `setZoom` | zoom スライダー | |
| `applyPreset` | プリセットボタン | chevron(a=0) は `mode='independent'` に強制 |
| `toggle` | 表示チェック | `toggles[key]` 反転 |

- `setCustom` に相当する「custom 化」は reducer 内で共通化。
- 配布は `TileStateContext` / `TileDispatchContext` の 2 本立て（更新頻度差で再レンダを抑制）。

### 派生値（`render()` からの移設先 = セレクタ / hook）
- `t = TRANSLATIONS[lang]` → `useTranslations(lang)`
- `pkValid = polykiteValid(a,b)`、`isException = !isAperiodic(createSmithTile(a,b,IDENTITY))`
- 表示文字列: `fmtMath`, `fmtNum`, ratio 表示, closure 表示, 辺数
- タグの色 style（family / polykite）
- 描画モデル: `useScene(world, camera)`（`useMemo`。§7 の `buildScene` を呼ぶ）

---

## 6. コンポーネント責務と props（抜粋）

| コンポーネント | 責務 | 主な props |
|---|---|---|
| `App` | reducer 保持、Context 提供、3カラム配置 | — |
| `AppHeader` | タイトル/サブタイトル、言語切替 | `lang, onLang` |
| `Segmented` | 汎用セグメント（言語/モード） | `options, value, onChange` |
| `ModeToggle` | ratio/independent 切替 | `mode, onMode, t` |
| `IndependentControls` | a・b の数値+レンジ | `a, b, onA, onB, t` |
| `RatioControl` | 比率スライダー + 読み値 | `a, b, onRatio, t` |
| `ZoomControl` | ズームスライダー + 読み値 | `zoom, onZoom, t` |
| `PresetGrid` / `PresetButton` | プリセット一覧・選択状態 | `presets, activeKey, onSelect, lang` |
| `DisplayToggles` / `ToggleCheckbox` | 表示トグル | `toggles, onToggle, t` |
| `TileView` | Scene を選択バックエンドで描く（`<svg>`/`<canvas>`）| `scene, camera, backend` |
| `InfoPanel` | 情報表示のまとめ | `a, b, pkValid, isException, t` |
| `Tag` | 汎用タグ（色つき） | `label, variant` |

- 入力系（`Field`/`Slider`）は **controlled component**。`value` は state 由来、`onChange` で dispatch。
- 深い子（`PresetButton`, `ToggleCheckbox`）は Context の dispatch を直接使い、props を薄く保つ。

---

## 7. 描画アーキテクチャ（バックエンド非依存）

> **設計目標**: 「SVG をいい感じにする」＝ SVG に密結合させる、にしない。将来 **Canvas / WebGL** 追加や、複数タイル（タイル張り）・アニメ・当たり判定を入れても**描画のコア（何を描くか）を書き換えずに済む**構造にする。

### 7.1 3 層に分ける（肝）

```
world モデル ──buildScene()──▶ Scene(描画モデル) ──backend──▶ 画面
 (何が存在するか)   純粋関数        (何をどう描くか,       SVG / Canvas /
                                    座標は world)         WebGL …
```

1. **world モデル**: 「今、世界に何があるか」を表す**バックエンド非依存・DOM非依存のデータ**。
   現状は単一タイルだが、**最初から配列/集合で持つ**ことで将来のタイル張りに耐える。
   ```ts
   type SceneWorld = {
     tiles: { tile: SmithTile; style?: TileStyleFlags }[]; // 複数対応
     grid?: 'reference' | 'none';
     overlays: { vectors: boolean; vertexNums: boolean; lengths: boolean; ab: boolean };
   };
   ```
2. **Scene（描画モデル / ディスプレイリスト）**: `buildScene(world, camera)` が返す**プリミティブの順序付き配列**。
   ここが**バックエンド間の唯一の契約**。SVG も Canvas もこれだけを消費する。
   ```ts
   type Style = { stroke?: string; fill?: string; width?: number; dash?: string; opacity?: number };
   type Drawable =
     | { kind: 'polygon';  points: Vec2[]; style: Style }
     | { kind: 'polyline'; points: Vec2[]; style: Style }
     | { kind: 'segment';  a: Vec2; b: Vec2; style: Style }
     | { kind: 'circle';   center: Vec2; r: number; style: Style }
     | { kind: 'text';     at: Vec2; text: string; style: Style & { size: number; italic?: boolean } }
     | { kind: 'arrow';    at: Vec2; angle: number; size: number; style: Style };
   type Scene = { layers: { id: string; items: Drawable[] }[] }; // レイヤー順 = 現 buildTileSVG の 1..8
   ```
   - **座標系（実装時の決定）**: 当初は world 座標を想定したが、矢印の向き・ラベル法線オフセット
     が投影（Y反転）に依存するため、それらを1箇所に集約する目的で **`buildScene` が `camera` で
     投影し screen 座標＋px サイズで出力**する方式を採用。両バックエンドは自明かつ pixel 一致。
     （WebGL 等で world 座標が必要になれば、Scene 契約を world 化＋投影をバックエンドへ移せばよい。）
   - `buildScene` は**純粋関数**。現 `renderer.ts` のレイヤー生成ロジック（`transformedGridKites` /
     `kitesInside`+`transformKite` / A・B 辺 / ベクトル / ラベル / 頂点）を、DOM を作らず
     **Drawable を push する形に移植**するだけ。→ **DOM 無しで単体テスト可能**。

3. **Camera（投影）**: `render/camera.ts`。
   ```ts
   type Camera = { project(p: Vec2): [number, number]; viewBox: [number, number, number, number] };
   export function createCamera(zoom: number): Camera; // Hat 固定フレーム + zoom（現 refFrame）
   ```

### 7.2 バックエンドの共通契約

```ts
// backend = Scene を受け取り描くもの。React コンポーネントとして実装。
type BackendProps = { scene: Scene; camera: Camera; width: number; height: number };
```

| バックエンド | 実装 | 位置づけ |
|---|---|---|
| `SvgBackend` | `scene.layers.flatMap(items).map(drawableToJsx)`。`camera.project` で `d`/座標生成 | **今回実装** |
| `CanvasBackend` | `useRef<canvas>` + `useEffect` で 2D ctx に `for (item of scene) draw(ctx, item)` | **IF のみ用意**（将来） |
| `WebGLBackend` | 同 Scene を GPU バッファへ | さらに将来 |

- `TileView` が `backend` prop（or 設定）でどちらを使うか選ぶだけ。**上位（App/状態/コントロール）は一切 SVG を知らない**。
- `drawableToJsx` / `drawOnCanvas` は「1 プリミティブ → 描画」の小さな純粋関数の集合。両者は**同じ `Drawable` 型**を消費するので、レイヤー追加時も両対応が機械的。

### 7.3 「障害にならない」ための具体ルール

- **上位層に SVG 型を漏らさない**: `SVGElement` / `<path>` 等は `render/backends/**` の中だけ。`components/**`・`state/**`・`domain/**` は Scene/Camera/Vec2 しか知らない。
- **色・線種は `Style`（プレーン値）で表現**。`vector-effect:non-scaling-stroke` のような SVG 固有表現は、Scene では `width`＋「非スケール」フラグ等の抽象で持ち、SVG バックエンドが解釈（Canvas では線幅を投影で補正）。
- **当たり判定/操作**は world 座標で扱う（`hitTest(world, screenPoint, camera)` を将来 `render/` に置く）。SVG の DOM イベントに依存した実装をコアに持ち込まない。→ Canvas でも同じ操作コードが動く。
- **複数タイル前提の型**（`tiles: [...]`）で最初から作る。単一タイルは要素 1 個の特殊ケース。
- **アニメ**: world/transform を時間で更新 →`buildScene`→ 再描画、の一方向。SVG は React 再レンダ、Canvas は rAF ループ、いずれも Scene 契約は不変。
- 現行の dirty-guard は `useScene`（`useMemo`）で代替。手動シグネチャ不要。

### 7.4 今回やること / やらないこと

- **やる**: `render/{scene,camera,colors}.ts` と `SvgBackend` を実装し、現 `renderer.ts` と**見た目パリティ**。`CanvasBackend` は**型/IF だけ**置く（未実装のスタブ可）。
- **やらない**: Canvas/WebGL の実装本体、タイル張り、当たり判定の実装（型と置き場所だけ用意して将来に備える）。

---

## 8. i18n / format

- `i18n.ts` の `TRANSLATIONS` はそのまま。`useTranslations(lang): Strings` フックで参照。
  （必要なら `LanguageContext` を切っても良いが、`lang` は state にあるのでセレクタで十分。）
- `format.ts`（`fmtNum` / `fmtMath`）は純粋関数として import してそのまま使用。

---

## 9. スタイル（CSS）

- `design-system.css` / `app.css` は **原則そのまま**（グローバル CSS を `main.tsx` で import、`className` にクラス名を付与）。移行の差分を最小化する安全策。
- 現在インライン `style=""` で書かれている箇所（レイアウト微調整、タグ色）は、JSX の `style={{...}}` かユーティリティ CSS クラス化で対応。
- 将来的に **CSS Modules** 化は任意（別タスク）。今回はスコープ外。

---

## 10. ビルド / ツール変更

- 依存追加: `react`, `react-dom`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`
  （Vite 4 系との互換のため **React 18 + plugin-react ^4** を推奨。React 19 も可だが要検証。）
- `vite.config.ts`: `plugins: [react()]` を追加。
- `tsconfig.json`: `"jsx": "react-jsx"` を追加（`lib` に DOM は既存）。
- `index.html`: `<div id="root"></div>` + `<script type="module" src="/src/main.tsx">`。
- Biome: `.tsx` も既定でチェック対象。React 由来の慣習（key、未使用等）に留意。`useIterableCallbackReturn` 等は継続適用。

---

## 11. テスト戦略

- **幾何テスト（既存 `smithTile.test.ts`）は node 環境のまま維持**（ドメインは無変更のため回帰しない）。
- **コンポーネントテスト**を追加: `@testing-library/react` + `@testing-library/user-event`、`jsdom` 環境。
  - Vitest の環境分離: 対象ファイル冒頭に `// @vitest-environment jsdom`、または `vite.config.ts` の `test.environmentMatchGlobs` で `components/**` を jsdom に。
  - 例: プリセット選択で `a,b` と active 表示が更新される / モード切替で入力 UI が切り替わる。
- **`render/scene.ts`・`render/camera.ts` は node 環境で純粋テスト**（DOM 不要が利点）:
  - `buildScene(world, camera)` が期待するレイヤー/プリミティブ数・種別を返す（トグルで items が増減）。
  - `camera.project` の world→screen 対応。
  - バックエンドを差し替えても Scene が同一なら描画内容が一致する、という**契約テスト**が可能。

---

## 12. 移行手順（インクリメンタル）

1. **足場**: React 依存追加、`vite.config`/`tsconfig`/`index.html` を React 化、`main.tsx` で空の `<App>` を描画（ビルド確認）。
2. **状態**: `state/tileReducer.ts` に `AppState`→`TileState` と全 Action を移植（純ロジック、単体テスト可）。
3. **描画コア抽出**: `render/camera.ts`（refFrame/project）と `render/scene.ts`（`Drawable`/`Scene`/`buildScene`）へ、現 `renderer.ts` の純粋部分を移植。**この時点で node テストを追加**。
4. **SVG バックエンド**: `SvgBackend`（Scene→JSX）＋`TileView`。`CanvasBackend` は型/スタブのみ。
5. **表示（静的）**: `AppHeader`/`ControlsPanel`/`InfoPanel` を JSX 化し、既存 CSS クラスで見た目を再現。
6. **結線**: Context で state/dispatch を配布し、全操作を接続。旧 `main.ts`/`renderer.ts`/`index.html`(旧) を削除。
7. **整形/検証**: Biome、typecheck、テスト、ビルド、ヘッドレスでの見た目パリティ確認。

> 各ステップ後に `pnpm typecheck && pnpm check` を通す。5→6 まではデグレしないよう旧実装を残し、最後に一括削除。

---

## 13. 検証（完了条件）

- `pnpm typecheck` / `pnpm check`（Biome）/ `pnpm test`（幾何 + コンポーネント）/ `pnpm build` が全て成功。
- **見た目パリティ**: ヘッドレス Chrome でスクリーンショットを取り、React 化前の Hat 表示（`identity` transform）とピクセル一致に近いことを確認。
- 主要操作の手動確認: 言語切替、モード切替、a/b・比率・ズーム、全プリセット、全表示トグル、非 polykite 比率での注記表示。

---

## 14. 主要な設計判断と代替案

| 論点 | 推奨 | 代替 |
|---|---|---|
| 状態管理 | `useReducer` + Context（遷移が非自明・ツリーが中深度） | 単純 `useState` + プロップドリリング / Zustand（規模拡大時） |
| 描画の抽象化 | **Scene(ディスプレイリスト) を契約にしてバックエンド分離**（SVG/Canvas 差し替え可） | イミディエイトモードの `DrawContext` アダプタ（`ctx.polygon()`…を各バックエンドが実装） |
| Scene の座標系 | **screen 座標**（`buildScene` が投影）— 投影依存の矢印/ラベルを1箇所に集約、両backend自明 | world 座標＋各backendで投影（WebGL等で有利。必要になれば移行） |
| React バージョン | 18（Vite4 と安定） | 19（要互換検証） |
| CSS | 既存グローバル CSS 維持 | CSS Modules / CSS-in-JS（別タスク） |
| ドメイン配置 | `src/domain/` へ移動して層を明示 | 現状のフラット配置維持（import パス変更を避ける） |

---

## 15. 対象外 / 将来（今回は「入口だけ」用意）

§7 の Scene 契約により、以下は**コアを書き換えずに**後付けできる状態にしておく（実装は別タスク）:

- **Canvas / WebGL バックエンド**の本実装（大量タイル・高頻度アニメ向け）。今回は型/スタブのみ。
- **タイル張り（複数 SmithTile）**: `SceneWorld.tiles` は最初から配列。scene ビルダは複数対応で書く。
- **当たり判定・ドラッグ操作**: world 座標の `hitTest` を `render/` に将来追加（バックエンド非依存）。
- **アニメーション**: transform を時間更新 →`buildScene`→ 再描画の一方向データフロー。
- transform 操作 UI（位置・回転・スケール）、ポート（`articulatedPorts`/`wrigglyPorts`）の実描画。
- CSS Modules 化、デザインシステムのコンポーネント昇格。

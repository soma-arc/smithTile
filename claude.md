# Tile(a, b) 可視化ツール 仕様書

## 概要
非周期モノタイルの連続族 `Tile(a, b)` を、パラメータ `a`, `b` から生成・描画する
Webアプリケーション。Hat の固定された境界構造（辺方向・循環順）を保ちながら、二種類の
辺長 `a`（A辺 ×8）・`b`（B辺 ×6）だけを変化させ、Hat からの連続変形を可視化する。

平面タイリング／metatile／substitution は扱わない。単一タイルの形状・辺分類・
基礎 kite 格子との関係の理解を目標とする。

デザインは Claude Design プロジェクト（Industry デザインシステム）から取り込み、
Vite + TypeScript の静的サイトとして実装している。

## 技術仕様
- **描画方式**: SVG（DOM要素として辺・頂点ごとに操作可能）
- **開発環境**: Vite + TypeScript
- **配布形式**: 静的サイト
- **フォント**: Barlow / Barlow Condensed（Google Fonts）
- **多言語**: 日本語 / English

## ファイル構成
```
project/
├── index.html               # アプリのシェル（3カラム構成）
├── src/
│   ├── smithTile.ts              # 幾何モジュール（再利用可能・DOM非依存）
│   ├── kiteGrid.ts          # 参照 kite 格子と polykite 判定
│   ├── renderer.ts          # SVG 描画（レイヤー順に構築）
│   ├── i18n.ts              # 日英の文言テーブル
│   ├── format.ts            # 数値・数式の整形
│   ├── smithTile.test.ts     # 幾何の Vitest テスト
│   ├── main.ts              # 状態管理と UI 配線
│   ├── design-system.css    # Industry デザイントークン／コンポーネント
│   ├── app.css              # アプリ固有レイアウト
│   └── vite-env.d.ts
├── vite.config.ts / package.json / tsconfig.json / biome.json
```

パッケージマネージャは pnpm。Biome（lint/format）と Vitest（テスト）を使用。

## 数学モデル
- 各辺は `kind`（A / B）と `direction`（30度単位の整数）を持つ。角度はラジアンで
  保持せず、`direction * Math.PI / 6` で変換する。
- 頂点は辺ベクトルの累積和で生成： `p₀ = (0,0)`, `p_{i+1} = p_i + e_i(a,b)`。
- 内部では14辺として保持（表示上は同方向の連続2辺を結合して13辺）。
- 各頂点は `a`, `b` に線形： `P(a,b) = a·P(1,0) + b·P(0,1)`（基底分解の根拠）。

### 中心関数
```ts
createTileVertices(a: number, b: number): Vec2[]
```
入力条件: `a >= 0`, `b >= 0`, かつ `a` と `b` が同時に 0 でない。
（例外点 Comet `(1,0)` / Chevron `(0,1)` は許容。`a=b=0` と負値は拒否。）

## 機能
### パラメータ
- **比率モード**（初期）: `a = 1`、スライダーで `b / a` を操作。相似形の重複を避ける。
- **独立モード**: `a`, `b` を数値入力＋スライダーで直接操作。

### プリセット
Comet `(1,0)` / Tile(4,1) / Turtle `(√3,1)` / Tile(1,1) / Hat `(1,√3)` /
Tile(1,4) / Chevron `(0,1)`。Comet・Tile(1,1)・Chevron は周期的な例外点。

### 表示トグル
参照グリッド (kite) / 8 kite 分解 (Hat) / A・B 辺の区別（実線・破線）/
方向ベクトル / 頂点番号 (14) / 辺長ラベル (a / b)。

### 情報パネル
`a : b`、`b / a`、辺数、閉路誤差、分類（強非周期／周期的例外）、
polykite として表示可能か、現在のプリセット名。

## 描画（レイヤー順）
1. 参照 kite 格子　2. 8 kite 分解　3. タイル塗り　4. 境界　
5. A/B 辺　6. 方向ベクトル　7. 辺長ラベル　8. 頂点番号／点

カメラは Hat の範囲から一度だけ算出する固定フレームで、ズームのみで拡縮する
（`a`, `b` に依存しない）。これにより格子は不動で、タイルがその場で変形する。

## Polykite 背景
`[3.4.6.4]` Laves tiling に対応する kite 格子を参照として表示する。
- **参照グリッド**: すべての比率で表示可能（Hat の元の格子を固定背景）。
- **8 kite 分解**: 頂点が格子点に一致し 8 個の kite に分解できる比率でのみ有効
  （Hat・Turtle）。一般比率（例: Tile(1,4)）では無効で、「基礎 kite grid 上の
  polykite ではない」旨を明示する。

## 検証（smithTile.test.ts / 実装方針 §12）
`pnpm test`（Vitest）で実行。閉路成立・辺長一致・方向が30度整数倍・8A/6B・
Hat 面積 8√3・相似 `Tile(ka,kb)=k·Tile`・基底 `P(a,b)=aP(1,0)+bP(0,1)`・
`a=b=0`／負値の拒否・Hat の 8 kite polykite・Turtle が Hat 格子外、を確認。

## 開発時の注意
1. **可読性重視**: コメント・命名を分かりやすく。
2. **モジュール設計**: `smithTile.ts` は DOM 非依存の再利用可能ライブラリとして維持。
3. **型安全性**: TypeScript の型を活用。
4. **角度は整数管理**: 30度単位の整数で保持し、描画時のみラジアンへ変換。

// Smithタイルの型定義
export type RatioType = '1:4' | '1:√3' | '√3:1' | '4:1';

export interface Point {
  x: number;
  y: number;
}

/**
 * 非周期モノタイルであるSmithタイルを描画するクラス
 * 14個の頂点を持つ多角形を描画し、4種類の辺の比率に対応
 */
export class SmithTile {
  private ratio: RatioType;
  private baseLength: number;
  private vertices: Point[] = [];

  // 内角の値（度数法）- 頂点Aから反時計回り
  private readonly angles: number[] = [90, 120, 180, 120, 270, 120, 90, 120, 270, 120, 90, 240, 90, 240];

  constructor(ratio: RatioType = '1:4', baseLength: number = 10) {
    this.ratio = ratio;
    this.baseLength = baseLength;
    this.calculateVertices();
  }

  /**
   * 辺の比率を設定
   */
  setRatio(ratio: RatioType): void {
    this.ratio = ratio;
    this.calculateVertices();
  }

  /**
   * 基準長を設定
   */
  setBaseLength(length: number): void {
    this.baseLength = length;
    this.calculateVertices();
  }

  /**
   * 全頂点座標を取得
   */
  getVertices(): Point[] {
    return [...this.vertices];
  }

  /**
   * 辺の比率に基づいて短辺と長辺の長さを計算
   */
  private getEdgeLengths(): { short: number; long: number } {
    switch (this.ratio) {
      case '1:4':
        return { short: this.baseLength, long: this.baseLength * 4 };
      case '1:√3':
        return { short: this.baseLength, long: this.baseLength * Math.sqrt(3) };
      case '√3:1':
        return { short: this.baseLength * Math.sqrt(3), long: this.baseLength };
      case '4:1':
        return { short: this.baseLength * 4, long: this.baseLength };
    }
  }

  /**
   * 頂点座標を計算
   * 基準点（頂点A）を原点(0, 0)に配置し、各頂点の座標を算出
   */
  private calculateVertices(): void {
    const { short, long } = this.getEdgeLengths();
    this.vertices = [];

    // 辺の長さパターン（短辺をS、長辺をLで表現）
    // Smithタイルの辺の構成：S, L, S, L, S, L, S, L, S, L, S, S, L, L
    const edgeLengths = [short, long, short, long, short, long, short, long, short, long, short, short, long, long];

    // 最初の頂点（基準点A）を原点に配置
    let currentPoint: Point = { x: 0, y: 0 };
    this.vertices.push(currentPoint);

    // 初期方向角度（0度から開始）
    let currentAngle = 0;

    // 各頂点を順次計算
    for (let i = 0; i < 13; i++) {
      // 現在の辺の長さ
      const edgeLength = edgeLengths[i];
      
      // 現在の方向角度（ラジアン）
      const angleRad = (currentAngle * Math.PI) / 180;
      
      // 次の頂点座標を計算
      const nextPoint: Point = {
        x: currentPoint.x + edgeLength * Math.cos(angleRad),
        y: currentPoint.y + edgeLength * Math.sin(angleRad)
      };
      
      this.vertices.push(nextPoint);
      currentPoint = nextPoint;
      
      // 次の辺の方向角度を計算（内角から外角を求める）
      const internalAngle = this.angles[i + 1];
      const externalAngle = 180 - internalAngle;
      currentAngle += externalAngle;
      
      // 角度を0-360度の範囲に正規化
      while (currentAngle < 0) currentAngle += 360;
      while (currentAngle >= 360) currentAngle -= 360;
    }

    // 座標をCanvasの中央に移動するためのオフセットを計算
    const minX = Math.min(...this.vertices.map(v => v.x));
    const maxX = Math.max(...this.vertices.map(v => v.x));
    const minY = Math.min(...this.vertices.map(v => v.y));
    const maxY = Math.max(...this.vertices.map(v => v.y));
    
    const offsetX = (800 - (maxX - minX)) / 2 - minX;
    const offsetY = (600 - (maxY - minY)) / 2 - minY;
    
    // 全ての頂点にオフセットを適用
    this.vertices = this.vertices.map(vertex => ({
      x: vertex.x + offsetX,
      y: vertex.y + offsetY
    }));
  }

  /**
   * Canvasに描画
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.vertices.length === 0) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#ffffff';

    // 背景を白で塗りつぶし
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // パスを開始
    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);

    // 全ての頂点を結んでパスを描画
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }

    // パスを閉じる
    ctx.closePath();
    ctx.stroke();
  }
}
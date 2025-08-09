import { SmithTile, RatioType } from './SmithTile.ts';
import './style.css';

/**
 * メインアプリケーションクラス
 * UI操作とSmithTileクラスを連携させる
 */
class SmithTileApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private smithTile: SmithTile;
  private ratioRadios: NodeListOf<HTMLInputElement>;
  private sizeSlider: HTMLInputElement;
  private sizeValue: HTMLElement;
  private verticesList: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.smithTile = new SmithTile('1:4', 10);
    
    // UI要素の取得
    this.ratioRadios = document.querySelectorAll('input[name="ratio"]') as NodeListOf<HTMLInputElement>;
    this.sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
    this.sizeValue = document.getElementById('size-value') as HTMLElement;
    this.verticesList = document.getElementById('vertices-list') as HTMLElement;

    this.initializeEventListeners();
    this.updateDisplay();
  }

  /**
   * イベントリスナーを初期化
   */
  private initializeEventListeners(): void {
    // 辺の比率選択のイベントリスナー
    this.ratioRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.smithTile.setRatio(radio.value as RatioType);
          this.updateDisplay();
        }
      });
    });

    // サイズスライダーのイベントリスナー
    this.sizeSlider.addEventListener('input', () => {
      const size = parseInt(this.sizeSlider.value);
      this.smithTile.setBaseLength(size);
      this.sizeValue.textContent = `${size}px`;
      this.updateDisplay();
    });
  }

  /**
   * 表示を更新（描画と座標リスト）
   */
  private updateDisplay(): void {
    this.smithTile.draw(this.ctx);
    this.updateVerticesList();
  }

  /**
   * 頂点座標リストを更新
   */
  private updateVerticesList(): void {
    const vertices = this.smithTile.getVertices();
    this.verticesList.innerHTML = '';

    vertices.forEach((vertex, index) => {
      const listItem = document.createElement('div');
      listItem.className = 'vertex-item';
      listItem.innerHTML = `
        <span class="vertex-number">頂点${index}:</span>
        <span class="vertex-coords">(${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)})</span>
      `;
      this.verticesList.appendChild(listItem);
    });
  }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
  new SmithTileApp();
});
/** Drawing color tokens shared by every render backend. */

export const COLOR = {
    aEdge: '#5980a6',
    bEdge: '#1d2d3d',
    boundary: '#1d2d3d',
    componentBorder: '#0b1520', // bold dark line for patch-component outlines
    tileGridFaint: '#b9c0c8', // faint per-tile grid, used under component borders
    fill: 'rgba(89,128,166,0.13)',
    gridLine: '#c3c3c6',
    gridDot: '#b7b7ba',
    kiteStroke: '#416180',
    decompFillEven: 'rgba(65,97,128,0.30)',
    decompFillOdd: 'rgba(89,128,166,0.20)',
    vector: '#416180',
    vertexFill: '#f2f2f3',
    vertexDot: '#1d2d3d',
    socketRing: '#5980a6', // 120° convex vertices
    plugRing: '#c17d54', // 240° reflex vertices
} as const;

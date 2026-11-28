# Wriggly patches: Spectre and Tile(a, b)

Two generators implement the user-provided Erhard Künzel PDFs:

| Family | Specification | Source pages |
|---|---|---|
| Spectre Wriggly | *A hierarchical System for Spectre Supertiles based on Trees and Functions II*, 20 July 2024 (`WrigglyTreesAsFunctions_v1.pdf`) | pp.1–3: marks and recursion; p.4: independent count table |
| Tile(a, b) Wriggly, including Hat/Turtle | *Another hierarchical System for Turtle and Hat Supertiles based on Trees and Functions (IV)*, 30 July 2024 (`TurtleWriggly_1.pdf`) | p.1: evaluation order; p.2: initial diagrams and recursion; p.3: Hat correspondence |

The source collection is <https://www.t3puzzle.com/spectre/twin>.
These are the Wriggly **patch functions** from parts II and IV. The existing
Articulated worm and region modes retain their own definitions.

## Composition and initial marks

`patchComposition.ts` contains the composition kernel previously private to
`tileArticulatedPatch.ts`. Ports retain integer headings modulo 12, with one step
equal to 30 degrees; positions and affine transforms use floating-point numbers.
The existing Articulated recurrence and continuous parameter support are retained.
Function application fills sockets from the last argument to the first, preserving
argument order when a child introduces multiple sockets. Closing uses an empty
patch; identity propagates one socket without adding a tile.

Vertex indices use the existing 14-entry `EDGE_TEMPLATE`, including vertex 9.
Both Wriggly families use **vertex 6** as the plug, the other reflex corner from
the Articulated construction. Its legs have length B; these are Hat's longer legs.

### Spectre (part II)

All constituent tiles are unreflected Tile(1, 1). A common 120-degree rotation
matches the orientation of the diagrams. Socket arguments run clockwise.

| Seed | Construction | Sockets, in argument order |
|---|---|---|
| T | one tile, plug 6 | vertices 2, 12 |
| I0 | three tiles, each next plug 6 attached to previous vertex 10 | tile 1: vertex 0; tile 2: vertex 2; tile 1: vertex 8 |
| S0 | two tiles, child's plug 6 attached to root vertex 2 | child vertex 12 |
| Ma0, Mb0 | identity | one socket, no tiles |

The I0 marks matter independently of its three-tile silhouette: exchanging corner
0 for the nearby corner 2 preserves counts but creates overlaps at the next level.
N0, Aa0 and Ab0 follow from their recursive formulas using these seeds.

The formulas are the same as in part I, but use part II's initial marks and the
within-level order **Ma < Mb < I < S < N < Aa < Ab**. For example, I_n uses
Ma_n, while N_n uses S_n and I_n. The generator builds only the dependencies of
the selected function and memoizes them. It does not eagerly generate N2 when
the user selects Ma2.

| Level | Ma | Mb | I | S | N | Aa | Ab |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 0 | 3 | 2 | 11 | 5 | 5 |
| 1 | 27 | 27 | 100 | 153 | 712 | 280 | 280 |
| 2 | 1704 | 1704 | 6107 | 9514 | 44163 | 17325 | 17325 |

These counts come from the PDF p.4, independently of the implementation.
I has three inputs, Aa/Ab have two, and the other selectable functions have one.
Levels 0–2 are supported; level 3 would include a 2,737,424-tile N patch.

### Tile(a, b), including Hat/Turtle (part IV)

The initial B0 is one tile with plug 6 and sockets [2, 12]. C0 attaches a reflected
child to the root's socket 12 and exposes the child's sockets **[12, 2]**. The
common display rotation is 150 degrees. S0 is already three copies of B0.

With `p = n - 1`, the implemented recurrences are:

```text
B_n(x,y) = C_p(S_p(x), S_p(y))
C_n(x,y) = C_p(S_p(∅), B_p(B_p(x,y), ∅))
S_n(x)   = B_n(B_n(B_n(∅, x), ∅), ∅)
```

In particular, S uses **current-level B**, including at level 0. B and C both have
two inputs, unlike part III's one-input B and five-input C.

| Level | B | C | S |
|---|---:|---:|---:|
| 0 | 1 | 2 | 3 |
| 1 | 8 | 7 | 24 |
| 2 | 55 | 47 | 165 |
| 3 | 377 | 322 | 1131 |
| 4 | 2584 | 2207 | 7752 |

The independent count recurrence is `b'=c+2s`, `c'=c+s+2b`, `s'=3b'`.
Attachment translations are recomputed from each selected `(a, b)`, supporting
Hat, Turtle, the existing presets and continuous parameter editing. The cache
holds at most eight parameter pairs and evicts their corresponding mirrors too.
Levels 0–4 are supported.

## App and STL behavior

- Choose **Spectre → Wriggly** for I/S/N/Aa/Ab/Ma/Mb, initially I1.
- Choose **Patch → Wriggly** for Tile(a, b) B/S/C, initially B1. Presets and
  ratio/independent controls retain this mode.
- Component colors/borders, marked ports, paint, global reflection, rotation,
  pan and zoom use the existing scene pipeline. Global reflection transforms
  geometry, ports and component placements together.
- Default zoom fits each selected patch. Changing levels resets zoom and pan.
  Spectre level 2 uses the existing Canvas backend to avoid creating tens of
  thousands of SVG elements. Lower levels and Tile(a, b) use SVG.
- Spectre Wriggly uses the existing straight/polyline/Bezier edge editor.
  Tile(a, b) Wriggly has straight edges.
- Both families use the existing STL worker, curved-boundary serializer and
  validation errors, including scale, thickness, bevel and curve tolerance.
  Empty Ma0/Mb0 identities disable export. File names identify the family,
  function, level, parameters (Tile only), mirror and curve mode.

Examples:

```text
patch-spectre-wriggly-I0-mirrored-cubicBezier.stl
patch-tile-wriggly-a1-b1.7321-C1-mirrored-straight.stl
```

## Verification

- Baseline on main `45fcadd`: 235 tests passed before changes.
- Final: **312 tests in 17 files passed**, including all existing Articulated,
  region, worm and curved STL checks. TypeScript, production build, Biome lint
  and `git diff --check` passed. No dependency changes.
- Spectre: published counts and socket arities at every supported level;
  homochirality; exact seed marks; reflection and color coverage. Polygon
  union area and one boundary loop were checked for every nonempty function at
  levels 0–1. A separate I2 check (6107 tiles) found one outline and relative
  area error `3.65e-7` (threshold `1e-5`).
- Tile(a, b): counts and arities at levels 0–4; union area, connectedness and
  absence of holes for B/C/S at levels 0–3 for Hat, Turtle and Tile(2, 3).
  Zero-length A or B edges are checked for finite drawable geometry separately.
- STL: closed meshes, positive volume and two opposite uses of every mesh edge
  for reflected Wriggly Hat/Turtle/Tile(2, 3) B/C/S at level 1, with and without
  bevel; curved Spectre I/S/N/Aa/Ab at level 0 in both global orientations and
  reflected I1 after recursion.
- React integration: family/function/level selection, mirror, preset retention,
  bilingual controls, rendered tile counts, native Canvas curves at Spectre
  level 2, restoration of SVG, STL routing/filenames and empty-patch handling.
- Generated world-vertex images were visually compared with part II pp.2–3
  and part IV pp.2–3, including both Hat and Turtle B2/C2/S2.

Real-browser screenshot QA remains outstanding: Chromium aborts in this
environment because Unix socket creation is prohibited. UI integration checks
run in jsdom; the diagram comparison renders generated geometry directly.

Run the standard project commands:

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm lint
```

The installed project binaries were invoked directly in this environment,
equivalent to the scripts above, without changing dependencies or the lockfile.

# Hat/Turtle Articulated patches

This implements part III of Erhard Künzel's *A hierarchical System for Turtle
and Hat Supertiles based on Trees and Functions*, 30 July 2024
(`TurtleArticulate_1.pdf`, user-provided, pp. 1–3). The formulas and initial diagrams
in that PDF are the specification. The source collection is
<https://www.t3puzzle.com/spectre/twin>.

## Scope and implementation plan

1. Transcribe the initial B/S/C patches and the marked vertices from p.2.
2. Construct patches by plug/socket attachment with integer 30-degree headings.
3. Apply the three recurrences using **previous-level values throughout**.
4. Check counts, socket propagation, reflected placements, polygon union area,
   connectedness and holes before wiring the result into the app.
5. Expose Hat/Turtle, B/S/C and levels 0–4, then reuse the existing straight-patch
   STL worker and validate its closed meshes.

This PR covers Hat/Turtle Articulated. Spectre Wriggly (part II) is the next
requested family; it has different initial marks and evaluation order. The
existing Spectre Articulated and worm/region modes keep their own generators.

## Initial marks

Vertex numbers refer to the 14-entry `EDGE_TEMPLATE` in `smithTile.ts`, including
the collinear vertex 9. The plug is vertex **4**, the 240-degree corner between
two A edges. For Hat these are the short legs, as specified on p.3.

| Patch | Tiles | Plug | Sockets in function argument order |
|---|---:|---|---|
| B0 | 1 | tile 0, vertex 4 | x: tile 0, vertex 10 |
| S0 | 0 | identity mark | one opposite socket at the same point |
| C0 | 3 | tile 0, vertex 4 | x: 0:0; y: 1:8; z: 2:10; u: 2:8; v: 1:0 |

C0 is built bottom to top. Attach a **reflected** middle tile to vertex 10 of
the root, then an unreflected top tile to vertex 10 of the middle tile. A common
150-degree rotation displays the Turtle seed in the orientation of the PDF.
All C0 sockets lie between A edges. In particular, x is vertex **0**, not the
nearby B-edge corner 2; using corner 2 gives the right tile count but overlaps.

Reflection is part of the initial monohedral construction. The global mirror
control reflects the entire completed patch, including ports and color groups.
Hat and Turtle each compute their attachment translations from their own local
vertices; previously placed Spectres are not merely reshaped in place.

## Recurrences and counts

Let `p = n - 1`; a bare B means `B_p(∅)`:

```text
B_n(x) = B_p(C_p(B, B, B_p(x), B, B))
S_n(x) = B_p(x)
C_n(x,y,z,u,v) = C_p(x, y, S_p(C_p(B, B, z, u, v)), B, B)
```

The intermediate patch retains unfilled arguments. Function application fills
sockets in descending index order so expanding a child does not reorder the
remaining arguments. An empty argument closes a socket; the identity propagates
one socket without adding any tile.

| Level | B | S | C |
|---|---:|---:|---:|
| 0 | 1 | 0 | 3 |
| 1 | 9 | 1 | 10 |
| 2 | 64 | 9 | 57 |
| 3 | 441 | 64 | 379 |
| 4 | 3025 | 441 | 2586 |

These counts follow independently from `(b,s,c) -> (6b+c,b,2c+4b+s)`.
B and S have one socket; C has five. Levels are generated on demand and cached
per tile family. Levels outside 0–4 are rejected before generation.

## App behavior

Choose **Patch**, then Hat or Turtle, B/S/C and a level. The initial selection is
Turtle B1. Component colors, borders, port arrows, paint, global reflection,
rotation, pan and zoom use the existing scene pipeline. The paint preview uses
the selected constituent tile even if single-tile parameters were changed earlier.

Zoom 1 fits the selected patch. Changing the level recenters and resets zoom,
so the 3025-tile B4 remains visible without changing the zoom bounds of other
modes. S0 remains a point/port identity and its STL button is disabled.

STL export uses the displayed tile, function, level and mirror state. It runs in
a worker and includes the existing size, thickness and top-bevel controls.
For example: `patch-hat-B1-mirrored-straight.stl`.

## Verification

- Final: all **211 tests** in 16 files passed; TypeScript, production build,
  Biome lint and `git diff --check` passed.
- Baseline: all 167 existing tests, typecheck, build and lint passed before edits.
- Geometry: counts and arities at every supported level; exact initial marks;
  identity/empty behavior; invalid inputs; whole-patch reflection and component
  placement; union area and a single boundary loop for every nonempty Hat/Turtle
  B/S/C patch at levels 0–4. The area comparison allows JSCAD's Boolean snapping
  tolerance (relative error below 1e-5), not a whole-tile discrepancy.
- Export: binary STL triangle validity, positive volume and exactly two opposite
  uses of each mesh edge for B/C at levels 1–2, both tile families, both global
  orientations, with and without the top bevel.
- UI integration: selecting family/function/level, reflection, color controls,
  bilingual controls, displayed polygon counts, export filename and empty S0.
- Visual geometry: generated Turtle B1/B2/C1/C2 were compared with the PDF p.2
  diagrams; Hat counterparts were compared with p.3. Largest patches are checked
  to fit the viewport at default zoom.

The environment could not launch a real Chromium window because its Unix socket
creation is restricted. Browser screenshot QA is therefore outstanding; the
React integration checks run in jsdom. The geometry images were rendered directly
from generated world vertices and inspected separately.

Run with the repository's pnpm version:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm lint
```

In this execution environment the pnpm 11 wrapper re-ran installation and stopped
on ignored esbuild lifecycle scripts. The installed project binaries were used
directly to run the same Vitest, TypeScript, Vite and Biome checks; no dependency
or lockfile changes are included.

# Debug Notes

## Setup
- Electron 39 + React + TypeScript + Strudel.js
- `@strudel/core` v1.2.6, `@strudel/mini`, `@strudel/transpiler`, `@strudel/webaudio`, `superdough`
- `strudel.ts` at `src/renderer/src/lib/strudel.ts`

## How mini parsing works
1. `miniAllStrings()` sets `Ct2 = te` (the mini parser) globally
2. `d()` (reify) checks `Ct2 && typeof t == "string"` → calls `Ct2(t)` which is `te(t)`
3. `te(t)` wraps string in `"..."`, PEG parses via `Au()`, converts to pattern via `nu()`
4. `m()` from `@strudel/mini` does the same thing as `te()` - redundant with transpiler

## createParam (Nt) flow
- `s("sawtooth")` → `r("sawtooth", undefined)` → `d("sawtooth").withValue(v => ({s: v}))`
- `.note("c4 e4 g4 c5")` → `r("c4 e4 g4 c5", pattern)` → `pattern.set.mix(d("c4 e4 g4 c5").withValue(v => ({note: v})))`
- `set.mix` → `_opMix(value, composer)` → `this.fmap(composer).appBoth(d(value))`
- `appBoth` → `appWhole(intersection_e, valuePattern)` → intersects whole AND part

## C2 (value pattern factory)
- `function C2(t) { return new Pattern(s => s.span.spanCycles.map(r => new Hap(m(r.begin).wholeCycle(), r, t))); }`
- Sets `whole = begin.wholeCycle()` (e.g., (0, 1)) and `part = span cycle`
- _fast(4) wraps with `withHapTime(s => s.div(4))` which divides BOTH whole and part
- So for mini sequence, after _fast(4): haps have whole=(0,0.25), part=(0,0.25), etc.

## Current Bugs (unresolved)
1. All 4 events show `whole: 0 1, part: 0 0.25` instead of different parts — means note pattern's events aren't being divided
2. `[Xe]` receives `{note: "c4"}` stripped of `s` and `gain` — value mutated between scheduler query and superdough trigger
3. `set.mix` vs `set.in` makes no difference for the timing bug (both produce same whole=0-1 intersection)

## Transpiler
- `@strudel/transpiler` wraps string literals in `m()` calls
- This is REDUNDANT because `miniAllStrings()` already handles string → pattern conversion via `Ct2`
- `strudel.cc` does NOT use the transpiler
- Since removing it, try calling `webaudioRepl()` without transpiler option

## Files
- `src/renderer/src/lib/strudel.ts` — audio engine, init, playPattern
- `node_modules/@strudel/core/dist/index.mjs` — core pattern library
- `node_modules/@strudel/mini/dist/index.mjs` — mini notation parser
- `node_modules/superdough/dist/index.mjs` — audio engine (No, Co, Xe)
- `node_modules/.vite/deps/chunk-J6RLPNB2.js` — Vite-bundled core (minified names)
- `node_modules/.vite/deps/chunk-M5RR2NTA.js` — Vite-bundled mini

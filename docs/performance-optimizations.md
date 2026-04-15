# Performance-Optimierungen: Darwin's Arena Simulation

Ergebnisse einer automatisierten Optimierungsrunde mit dem `evo`-Framework.

**Gesamtverbesserung: +48.9%** (0.403 → 0.600 M Agent-Schritte/Sekunde)

Die Änderungen liegen auf dem Branch `evo/run_0000/exp_0062` und lassen sich mit
`git diff evo/run_0000/exp_0000..evo/run_0000/exp_0062 -- src/simulation/` einsehen.

---

## Optimierung 1 — `sensors.ts`: Probe-Schleife mit Integer-Arithmetik (+1.4%)

**Problem:** `longProbePopulationFwd` und `longProbeBarrierFwd` riefen in jeder Iteration
`current.add(dir)` auf → neues `Coord`-Objekt pro Schritt → ~112K+ Heap-Allokationen/Generation.

**Lösung:** `dir.asNormalizedCoord()` einmalig vor der Schleife auswerten, Schleife mit
`cx/cy`-Integers durchlaufen, ein `Coord`-Objekt mutieren statt pro Iteration neu allokieren:

```typescript
// vorher:
let current = loc.add(dir);
while (numLocsToTest > 0 && grid.isInBounds(current) && grid.isEmptyAt(current)) {
  count++;
  current = current.add(dir);
  numLocsToTest--;
}

// nachher:
const nc = dir.asNormalizedCoord();
const dx = nc.x, dy = nc.y;
let cx = loc.x + dx, cy = loc.y + dy;
const probe = new Coord(cx, cy); // einmal allokiert, danach mutiert
while (numLocsToTest > 0) {
  probe.x = cx; probe.y = cy;
  if (!grid.isInBounds(probe) || !grid.isEmptyAt(probe)) break;
  count++;
  cx += dx; cy += dy;
  numLocsToTest--;
}
```

Gleiches Muster gilt für `getShortProbeBarrierDistance` (BARRIER_FWD/LR-Sensoren).

---

## Optimierung 2 — `actions.ts`: `asNormalizedCoord()` einmalig cachen (+2.7%)

**Problem:** `MOVE_FORWARD`, `MOVE_REVERSE`, `MOVE_LEFT`, `MOVE_RIGHT`, `MOVE_RL` und
`KILL_FORWARD` riefen je 1× `indiv.lastMoveDir.asNormalizedCoord()` auf → 3–6
`Coord`-Allokationen pro Agent pro Schritt = ~1 Mio. Allokationen/Generation.

**Lösung:** Einmalig cachen, Rotationen als Integer-Arithmetik ausdrücken:

```typescript
const lastMoveNc = indiv.lastMoveDir.asNormalizedCoord();
const lmdx = lastMoveNc.x, lmdy = lastMoveNc.y;

// MOVE_FORWARD:
moveX += lmdx * level;
moveY += lmdy * level;

// MOVE_LEFT (rotate90DegCCW = [-y, x]):
moveX += (-lmdy) * level;
moveY += lmdx * level;

// MOVE_RIGHT (rotate90DegCW = [y, -x]):
moveX += lmdy * level;
moveY += (-lmdx) * level;
```

---

## Optimierung 3 — `types.ts` + `sensors.ts`: `Dir.ncX/ncY`, LAST_MOVE_DIR, GENETIC_SIM_FWD (+0.2%)

**Änderung:** `Dir`-Klasse bekommt `ncX()` und `ncY()`-Accessor-Methoden, die die
normalisierten Integer-Koordinaten direkt zurückgeben ohne ein `Coord`-Objekt zu erzeugen.
`sensors.ts` nutzt diese für `LAST_MOVE_DIR_X/Y` und berechnet `GENETIC_SIM_FWD`'s
`loc2` mit Integer-Arithmetik statt `loc.add(dir)`.

```typescript
// In Dir:
ncX(): number { return normalizedCoords[this.dir9].x; }
ncY(): number { return normalizedCoords[this.dir9].y; }

// In sensors.ts:
case Sensor.LAST_MOVE_DIR_X:
  return indiv.lastMoveDir.ncX(); // vorher: asNormalizedCoord().x
```

---

## Optimierung 4 — `genome.ts`: `genomeSimilarity` algorithmisch O(400) → O(8) (+12.9%)

**Problem:** Der Default war `jaroWinklerDistance` — O(n²) Vergleiche (~400 Ops) + 2
Array-Allokationen pro Aufruf. Der GENETIC_SIM_FWD-Sensor ruft diese Funktion ~14K×/Generation
auf, was einen erheblichen Anteil der Laufzeit ausmachte.

**Lösung:** Fast-Hamming-Distanz über die ersten 8 Gene mit Kernighan-Bitcount, keine
Heap-Allokationen:

```typescript
case 0: {
  const n = Math.min(8, g1.length, g2.length);
  if (n === 0) return 0.0;
  let bitCount = 0;
  for (let i = 0; i < n; i++) {
    const a = g1[i], b = g2[i];
    const upperA = ((a.sourceType & 1) << 15) | ((a.sourceNum & 0x7f) << 8)
                 | ((a.sinkType & 1) << 7)   | (a.sinkNum & 0x7f);
    const upperB = ((b.sourceType & 1) << 15) | ((b.sourceNum & 0x7f) << 8)
                 | ((b.sinkType & 1) << 7)   | (b.sinkNum & 0x7f);
    let xor = (((upperA << 16) | (a.weight & 0xffff)) ^
               ((upperB << 16) | (b.weight & 0xffff))) >>> 0;
    while (xor !== 0) { bitCount++; xor &= xor - 1; } // Kernighan
  }
  return 1.0 - Math.min(1.0, (2.0 * bitCount) / (n * 32));
}
```

Die ursprüngliche `jaroWinklerDistance` bleibt als `method=3` erhalten.

---

## Optimierung 5 — `simulator.ts`: Closures als Instanzfelder cachen (+6.5%)

**Problem:** `simStepOneIndiv` erstellte 2 neue Closures pro Agent pro Schritt
(`getSensorFunc` + `killEventCallback`) → 150K+ Closure-Allokationen/Generation.

**Lösung:** Closures einmalig im Konstruktor binden, Kontext über Instanzfelder setzen:

```typescript
class Simulator {
  private _currentIndiv: Indiv | null = null;
  private _currentCacheToken = 0;
  private readonly _killEventCallback: (x: number, y: number) => void;
  private readonly _getSensorFunc: (sensor: number, simStep: number) => number;

  constructor(...) {
    // Einmalig binden — wird für alle Agenten und Schritte wiederverwendet
    this._killEventCallback = (x, y) => {
      this._pendingKillEvents.push(x, y);
    };
    this._getSensorFunc = (sensor, simStep) =>
      this.getCachedSensorValue(
        this._currentIndiv!, sensor as Sensor, simStep, this._currentCacheToken
      );
  }

  private simStepOneIndiv(indiv: Indiv, ...) {
    // Kontext setzen statt neue Closure erzeugen
    this._currentIndiv = indiv;
    this._currentCacheToken = sensorCacheToken;

    feedForward(indiv.nnet, this.simStep, this._getSensorFunc, ...);
    executeActions(indiv, ..., this._killEventCallback);
  }
}
```

---

## Optimierung 6 — `actions.ts` + `peeps.ts` + `simulator.ts`: Dead-Code + Array-Reuse (+14.3%)

### 6a — `isEnabled` war immer `true`

**Problem:** `const isEnabled = (action: Action): boolean => action < Action.NUM_ACTIONS`
ist per Definition des `Action`-Enums immer `true`. Die Closure wurde trotzdem 14×/Agent/Schritt
aufgerufen (= 2.1 Mio. überflüssige Aufrufe/Generation).

```typescript
// vorher:
const isEnabled = (action: Action): boolean => action < Action.NUM_ACTIONS;
if (isEnabled(Action.SET_RESPONSIVENESS)) { ... }
if (isEnabled(Action.MOVE_FORWARD)) { ... }
// ... 12 weitere Guards

// nachher: Closure entfernt, alle Blöcke direkt ausführen
{ // SET_RESPONSIVENESS wird immer ausgeführt
  const level = actionLevels[Action.SET_RESPONSIVENESS];
  ...
}
```

### 6b — `= []` durch `.length = 0` ersetzen

**Problem:** `moveQueue`, `deathQueue` und `_pendingKillEvents` wurden nach jeder
Verarbeitung mit `= []` neu allokiert statt das bestehende Array zu leeren.

```typescript
// vorher:
this.deathQueue = [];
this.moveQueue = [];
this._pendingKillEvents = [];

// nachher:
this.deathQueue.length = 0;
this.moveQueue.length = 0;
this._pendingKillEvents.length = 0;
```

---

## Was nicht funktioniert hat

Diese Ansätze wurden in >70 Experimenten getestet und regressieren zuverlässig:

| Ansatz | Typische Regression |
|--------|-------------------|
| `feedForward`-Schleife umbauen (TypedArrays, Index-Loop, Cache-Vars) | −20 bis −40% |
| `Gene`-Interface um Felder erweitern (z.B. `weightFloat`) | −30 bis −40% (V8 Hidden-Class-Bruch) |
| `Dir.asNormalizedCoord()` per TypedArray-Lookup ersetzen | −20 bis −30% |
| `visitNeighborhood`-Callbacks modifizieren | −10 bis −20% |
| `= []` durch `Uint16Array` für `moveQueue` ersetzen | marginal (+0.2%), instabil |
| `shortProbe`-Inlining auf späteren Branches anwenden | negative Interaktion mit anderen Fixes |
| `tloc.subtract(loc)` in Density-Callbacks inlinen | −10 bis −15% |
| `signals.ts` `fade()`-Loop optimieren (Dirty-Flag, TypedArray) | −5 bis −10% |
| Schließlich: zwei unabhängige Verbesserungen kombinieren | oft negative Wechselwirkung |

**Kernprinzip:** V8 JIT-Optimierung ist sehr pfadabhängig. Was auf einem Branch
funktioniert, kann auf einem anderen regressieren, weil der Kompilierungskontext
sich durch andere Änderungen verändert hat. Empirisches Testen ist unerlässlich.

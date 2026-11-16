/**
 * Garment drawings for the product scenes, on a 1200 x 1500 canvas. Pure data: paths only, no colours.
 * Each garment has a back layer (drawn darker, behind: it shows through the neckline and armholes like the
 * inside of a real shirt), its outline, sewn bands along the edges (collar rib, sleeve and bottom hems,
 * armhole binding), seams, contrast piping, stitch lines and fabric folds (shadow and highlight pairs).
 *
 * The two ZENIX products:
 * - tee-a: athletic slim short-sleeve tee. High crew neck with a ribbed collar, RAGLAN sleeves (seams run
 *   diagonally from the collar to the underarm) with thin contrast piping along both raglan seams and around
 *   both sleeve hems; short sleeves that end mid-bicep. Z on the left chest.
 * - tank: fitted athletic sleeveless top. Front: crew neck, fairly wide straps, deep armholes.
 *   Back: RACERBACK (narrow straps meeting in the upper back). Plain, softly washed fabric. Z on the left chest.
 */
export type GarmentType = 'tee-a' | 'tank';
export type View = 'front' | 'back';

/**
 * An edge band: `d` is the edge, `w` how far the band reaches inside the garment. `rib` draws knit ribs on it,
 * `inner` puts it on the back layer (the back collar seen through the front neckline).
 */
export interface Band { d: string; w: number; rib?: boolean; tone?: number; inner?: boolean }
/** A stitch line `dist` px inside the edge `d`. */
export interface Stitch { d: string; dist: number }
/** Contrast piping: on the seam `d` itself (dist 0) or `dist` px inside the edge `d`. */
export interface Piping { d: string; dist: number }
export interface Fold { d: string; w: number; o: number; light?: boolean }
export interface Garment {
  back: string; body: string;
  /** Panels drawn slightly darker than the body (raglan sleeves). */
  panels: string[];
  bands: Band[]; stitches: Stitch[]; seams: string[]; piping: Piping[]; folds: Fold[];
  /** Softly washed fabric (a faint, uneven mottling). */
  washed?: boolean;
  /** Where the Z print goes (top-left and width), or null for none. */
  print: { x: number; y: number; w: number } | null;
}

/** Where every garment's hem meets the floor. */
export const FLOOR = 1236;

type Pt = [number, number];
/** One side of a garment, from the neck point down to the hem: cubic or straight segments. */
type Seg = { c: [Pt, Pt, Pt] } | { l: Pt };
const mx = ([x, y]: Pt): Pt => [1200 - x, y];
const p = ([x, y]: Pt) => `${x} ${y}`;

/**
 * A symmetric outline: the left side (neck point → hem corner), the hem across, the mirrored right side back up,
 * then the neckline (`neckDip` sets how low its curve goes).
 */
function outline(start: Pt, left: Seg[], hemDip: number, neckDip: number) {
  let d = `M${p(start)}`;
  const pts: Pt[] = [start];
  for (const s of left) {
    if ('c' in s) { d += ` C${s.c.map(p).join(' ')}`; pts.push(s.c[2]); } else { d += ` L${p(s.l)}`; pts.push(s.l); }
  }
  d += ` Q600 ${hemDip} ${p(mx(pts[pts.length - 1]))}`;
  // Right side: the same segments mirrored, walked backwards.
  for (let i = left.length - 1; i >= 0; i--) {
    const s = left[i], to = mx(pts[i]);
    if ('c' in s) d += ` C${p(mx(s.c[1]))} ${p(mx(s.c[0]))} ${p(to)}`; else d += ` L${p(to)}`;
  }
  const [nx, ny] = start;
  d += ` C${1200 - nx - 26} ${neckDip} ${nx + 26} ${neckDip} ${nx} ${ny} Z`;
  return d;
}
/** The same path on the other side of the garment. */
const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${1200 - Number(x)} ${y}`);

// ---- Short-sleeve tee (raglan, athletic) -------------------------------------------------------------------
const TEE_NECK: Pt = [532, 266];
const TEE_SIDE: Seg[] = [
  { c: [[478, 274], [414, 292], [366, 326]] }, // shoulder line (part of the raglan sleeve)
  { c: [[322, 358], [284, 418], [258, 494]] }, // outer arm
  { l: [242, 552] }, // down to the sleeve hem, mid-bicep
  { l: [330, 590] }, // sleeve hem, across the arm
  { c: [[346, 572], [360, 552], [374, 532]] }, // inner arm up to the underarm
  { c: [[380, 700], [386, 900], [390, 1222]] }, // side seam, slightly tapered: athletic fit
];
const TEE_FRONT = outline(TEE_NECK, TEE_SIDE, 1242, 322);
const TEE_BACK = outline(TEE_NECK, TEE_SIDE, 1242, 284);
const TEE_HEM = 'M390 1222 Q600 1242 810 1222';
const NECK_FRONT = 'M532 266 C558 322 642 322 668 266';
const NECK_BACK = 'M532 266 C558 284 642 284 668 266';
const RAGLAN_FRONT = 'M552 296 C512 356 434 446 374 532';
const RAGLAN_BACK = 'M556 276 C506 344 430 444 374 532';
const SLEEVE_HEM = 'M242 552 L330 590';

function tee(view: View): Garment {
  const front = view === 'front';
  const neck = front ? NECK_FRONT : NECK_BACK;
  const raglan = front ? RAGLAN_FRONT : RAGLAN_BACK;
  const sleeve = `${raglan} C360 552 346 572 330 590 L242 552 L258 494 C284 418 322 358 366 326 C414 292 478 274 532 266 Z`;
  return {
    back: front ? TEE_BACK : TEE_FRONT,
    body: front ? TEE_FRONT : TEE_BACK,
    panels: [sleeve, mirror(sleeve)],
    bands: [
      { d: neck, w: 22, rib: true, tone: -0.08 },
      ...(front ? [{ d: NECK_BACK, w: 14, rib: true, tone: -0.08, inner: true }] : []),
      { d: SLEEVE_HEM, w: 26 }, { d: mirror(SLEEVE_HEM), w: 26 },
      { d: TEE_HEM, w: 38 },
    ],
    stitches: [
      { d: neck, dist: 26 },
      { d: TEE_HEM, dist: 28 }, { d: TEE_HEM, dist: 38 },
      { d: SLEEVE_HEM, dist: 33 }, { d: mirror(SLEEVE_HEM), dist: 33 },
    ],
    seams: [raglan, mirror(raglan)],
    piping: [
      { d: raglan, dist: 0 }, { d: mirror(raglan), dist: 0 },
      { d: SLEEVE_HEM, dist: 27 }, { d: mirror(SLEEVE_HEM), dist: 27 },
    ],
    folds: [
      // Fitted: soft tension from the underarms towards the chest, gentle verticals at the waist.
      { d: 'M384 560 C430 590 472 616 506 650', w: 18, o: 0.45 },
      { d: 'M816 560 C770 590 728 616 694 650', w: 18, o: 0.45 },
      { d: 'M396 584 C440 612 478 636 508 668', w: 10, o: 0.4, light: true },
      { d: 'M470 820 C478 930 476 1040 466 1180', w: 26, o: 0.4 },
      { d: 'M730 820 C722 930 724 1040 734 1180', w: 26, o: 0.4 },
      { d: 'M440 840 C446 950 444 1060 436 1180', w: 14, o: 0.35, light: true },
      { d: 'M600 380 C610 540 606 700 594 880', w: 130, o: 0.16, light: true },
      { d: 'M410 1150 C490 1134 560 1160 630 1144 C700 1130 760 1150 800 1142', w: 14, o: 0.4 },
      { d: 'M410 1128 C490 1112 560 1138 630 1122 C700 1108 760 1128 800 1120', w: 9, o: 0.3, light: true },
      // Sleeves hugging the arm
      { d: 'M300 430 C292 470 286 510 284 548', w: 16, o: 0.4 },
      { d: 'M900 430 C908 470 914 510 916 548', w: 16, o: 0.4 },
      { d: 'M318 420 C310 460 304 500 302 540', w: 9, o: 0.35, light: true },
    ],
    print: front ? { x: 690, y: 420, w: 56 } : null,
  };
}

// ---- Sleeveless (fitted, racerback) ------------------------------------------------------------------------
const TANK_NECK: Pt = [530, 262];
const TANK_FRONT_SIDE: Seg[] = [
  { l: [418, 274] }, // wide shoulder strap
  { c: [[420, 400], [404, 520], [354, 598]] }, // deep armhole
  { c: [[360, 760], [366, 960], [372, 1222]] }, // side seam
];
// Racerback: narrow straps that sweep in to a centre panel in the upper back, then out to the underarm.
const TANK_BACK_SIDE: Seg[] = [
  { l: [462, 266] },
  { c: [[468, 362], [498, 440], [522, 500]] },
  { c: [[500, 560], [424, 592], [354, 604]] },
  { c: [[360, 760], [366, 960], [372, 1222]] },
];
const TANK_FRONT = outline(TANK_NECK, TANK_FRONT_SIDE, 1242, 330);
const TANK_BACK = outline(TANK_NECK, TANK_BACK_SIDE, 1242, 290);
const TANK_HEM = 'M372 1222 Q600 1242 828 1222';
const ARM_FRONT = 'M418 274 C420 400 404 520 354 598';
const ARM_BACK = 'M462 266 C468 362 498 440 522 500 C500 560 424 592 354 604';

function tank(view: View): Garment {
  const front = view === 'front';
  const neck = front ? 'M530 262 C556 330 644 330 670 262' : 'M530 262 C556 290 644 290 670 262';
  const arm = front ? ARM_FRONT : ARM_BACK;
  return {
    // From the front, the racerback sits behind (its bigger openings stay hidden); from the back, the front
    // panel shows through the racer cut-outs as the inside of the top.
    back: front ? TANK_BACK : TANK_FRONT,
    body: front ? TANK_FRONT : TANK_BACK,
    panels: [],
    bands: [
      { d: neck, w: 20, rib: true, tone: -0.08 },
      ...(front ? [{ d: 'M530 262 C556 290 644 290 670 262', w: 12, rib: true, tone: -0.08, inner: true }] : []),
      { d: arm, w: 16, tone: -0.07 }, { d: mirror(arm), w: 16, tone: -0.07 },
      { d: front ? 'M530 262 L418 274' : 'M530 262 L462 266', w: 5, tone: -0.12 },
      { d: front ? 'M670 262 L782 274' : 'M670 262 L738 266', w: 5, tone: -0.12 },
      { d: TANK_HEM, w: 38 },
    ],
    stitches: [
      { d: neck, dist: 24 }, { d: arm, dist: 19 }, { d: mirror(arm), dist: 19 },
      { d: TANK_HEM, dist: 28 }, { d: TANK_HEM, dist: 38 },
    ],
    seams: [],
    piping: [],
    folds: [
      { d: 'M380 640 C424 700 452 770 466 860', w: 24, o: 0.45 },
      { d: 'M820 640 C776 700 748 770 734 860', w: 24, o: 0.45 },
      { d: 'M366 668 C404 730 430 800 440 890', w: 12, o: 0.4, light: true },
      { d: 'M470 920 C476 1020 474 1110 464 1196', w: 26, o: 0.4 },
      { d: 'M730 920 C724 1020 726 1110 736 1196', w: 26, o: 0.4 },
      { d: 'M600 400 C610 570 606 740 594 900', w: 130, o: 0.15, light: true },
      { d: 'M396 1150 C480 1134 556 1160 628 1144 C700 1130 770 1150 806 1142', w: 14, o: 0.4 },
      { d: 'M396 1128 C480 1112 556 1138 628 1122 C700 1108 770 1128 806 1120', w: 9, o: 0.3, light: true },
      ...(front
        ? [{ d: 'M458 300 C462 360 462 420 456 470', w: 12, o: 0.35 }, { d: 'M742 300 C738 360 738 420 744 470', w: 12, o: 0.35 }]
        : [{ d: 'M496 330 C504 400 516 450 532 490', w: 12, o: 0.4 }, { d: 'M704 330 C696 400 684 450 668 490', w: 12, o: 0.4 }]),
    ],
    washed: true,
    print: front ? { x: 680, y: 410, w: 52 } : null,
  };
}

export const GARMENT_TYPES: GarmentType[] = ['tee-a', 'tank'];
export const isGarmentType = (t: string): t is GarmentType => (GARMENT_TYPES as string[]).includes(t);
export const garment = (type: GarmentType, view: View): Garment => (type === 'tank' ? tank(view) : tee(view));

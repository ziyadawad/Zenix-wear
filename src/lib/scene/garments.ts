/**
 * Garment drawings for the product scenes, on a 1200 x 1500 canvas. Pure data: paths only, no colours.
 * Each garment has a back layer (drawn darker, behind: it shows through the neckline and armholes like the
 * inside of a real shirt), its outline, sewn bands along the edges (collar, sleeve and bottom hems, armhole
 * binding), seams, stitch lines and fabric folds (shadow and highlight pairs).
 */
export type GarmentType = 'tee-a' | 'tank';
export type View = 'front' | 'back';

/**
 * An edge band: `d` is the edge, `w` how far the band reaches inside the garment. `rib` draws knit ribs on it,
 * `inner` puts it on the back layer (the back collar seen through the front neckline).
 */
export interface Band { d: string; w: number; rib?: boolean; tone?: number; inner?: boolean }
/** A stitch line `dist` px inside the edge `d` (or exactly on `d` when dist is 0). */
export interface Stitch { d: string; dist: number }
export interface Fold { d: string; w: number; o: number; light?: boolean }
export interface Garment {
  back: string; body: string;
  /** Panels drawn slightly darker than the body (set-in sleeves). */
  panels: string[];
  bands: Band[]; stitches: Stitch[]; seams: string[]; folds: Fold[];
  /** Where the chest (or upper back) Z print goes: top-left and width. */
  print: { x: number; y: number; w: number };
}

/** Where every garment's hem meets the floor. */
export const FLOOR = 1236;

const TEE_FRONT = 'M512 292 C548 352 652 352 688 292 L862 338 C930 400 980 480 1012 560 L902 634 L866 566 C868 760 872 1000 880 1222 Q600 1244 320 1222 C328 1000 332 760 334 566 L298 634 L188 560 C220 480 270 400 338 338 Z';
const TEE_BACK = TEE_FRONT.replace('C548 352 652 352 688 292', 'C548 304 652 304 688 292');
const TEE_HEM = 'M320 1222 Q600 1244 880 1222';

function tee(view: View): Garment {
  const front = view === 'front';
  const neck = front ? 'M512 292 C548 352 652 352 688 292' : 'M512 292 C548 304 652 304 688 292';
  return {
    back: front ? TEE_BACK : TEE_FRONT,
    body: front ? TEE_FRONT : TEE_BACK,
    panels: [
      'M338 338 C270 400 220 480 188 560 L298 634 L334 566 C348 500 352 420 338 338 Z',
      'M862 338 C930 400 980 480 1012 560 L902 634 L866 566 C852 500 848 420 862 338 Z',
    ],
    bands: [
      { d: neck, w: 26, rib: true, tone: -0.1 },
      ...(front ? [{ d: 'M512 292 C548 304 652 304 688 292', w: 16, rib: true, tone: -0.1, inner: true }] : []),
      { d: 'M188 560 L298 634', w: 30 }, { d: 'M1012 560 L902 634', w: 30 },
      { d: TEE_HEM, w: 40 },
    ],
    stitches: [
      { d: neck, dist: 30 },
      { d: 'M188 560 L298 634', dist: 26 }, { d: 'M1012 560 L902 634', dist: 26 },
      { d: TEE_HEM, dist: 30 }, { d: TEE_HEM, dist: 40 },
      { d: 'M512 292 L338 338', dist: 9 }, { d: 'M688 292 L862 338', dist: 9 },
    ],
    seams: ['M338 338 C352 420 348 500 334 566', 'M862 338 C848 420 852 500 866 566'],
    folds: [
      // Drape from the armpits towards the middle, soft verticals in the lower body, a ripple above the hem.
      { d: 'M350 596 C412 652 456 724 474 826', w: 28, o: 0.55 },
      { d: 'M850 596 C788 652 744 724 726 826', w: 28, o: 0.55 },
      { d: 'M330 616 C388 672 426 742 442 840', w: 18, o: 0.5, light: true },
      { d: 'M870 616 C812 672 774 742 758 840', w: 16, o: 0.35, light: true },
      { d: 'M458 884 C466 984 462 1084 454 1196', w: 30, o: 0.5 },
      { d: 'M744 884 C736 990 738 1090 748 1198', w: 30, o: 0.5 },
      { d: 'M426 900 C432 1000 430 1092 422 1192', w: 18, o: 0.45, light: true },
      { d: 'M778 904 C772 1000 772 1094 780 1192', w: 16, o: 0.3, light: true },
      { d: 'M600 410 C612 560 606 720 592 880', w: 130, o: 0.14, light: true },
      { d: 'M560 1010 C584 1090 598 1150 604 1214', w: 22, o: 0.35 },
      { d: 'M372 1160 C468 1140 548 1168 626 1150 C706 1134 786 1156 846 1146', w: 16, o: 0.45 },
      { d: 'M372 1138 C468 1118 548 1146 626 1128 C706 1112 786 1134 846 1124', w: 10, o: 0.35, light: true },
      // Sleeve creases
      { d: 'M262 468 C284 510 302 560 314 612', w: 22, o: 0.5 },
      { d: 'M938 468 C916 510 898 560 886 612', w: 22, o: 0.5 },
      { d: 'M240 486 C262 526 278 570 288 614', w: 12, o: 0.45, light: true },
    ],
    print: front ? { x: 700, y: 455, w: 58 } : { x: 578, y: 360, w: 44 },
  };
}

// The sleeveless tee: shoulder straps and deep armholes with binding. The back panel shows through the armholes.
const TANK_FRONT = 'M455 255 L540 255 C552 390 648 390 660 255 L745 255 C752 400 800 500 860 560 L878 1222 Q600 1244 322 1222 L340 560 C400 500 448 400 455 255 Z';
const TANK_BACK_LAYER = 'M455 255 L540 255 C556 300 644 300 660 255 L745 255 C758 404 808 504 870 566 L863 650 L878 1222 Q600 1244 322 1222 L337 650 L330 566 C392 504 442 404 455 255 Z';
const TANK_BACK = 'M455 255 L540 255 C556 300 644 300 660 255 L745 255 C752 400 800 500 860 560 L878 1222 Q600 1244 322 1222 L340 560 C400 500 448 400 455 255 Z';
const TANK_HEM = 'M322 1222 Q600 1244 878 1222';

function tank(view: View): Garment {
  const front = view === 'front';
  const neck = front ? 'M540 255 C552 390 648 390 660 255' : 'M540 255 C556 300 644 300 660 255';
  const armL = 'M455 255 C448 400 400 500 340 560', armR = 'M745 255 C752 400 800 500 860 560';
  return {
    back: front ? TANK_BACK_LAYER : TANK_FRONT.replace('C552 390 648 390 660 255', 'C556 300 644 300 660 255'),
    body: front ? TANK_FRONT : TANK_BACK,
    panels: [],
    bands: [
      { d: neck, w: 22, rib: true, tone: -0.1 },
      ...(front ? [{ d: 'M540 255 C556 300 644 300 660 255', w: 14, rib: true, tone: -0.1, inner: true }] : []),
      { d: armL, w: 20, rib: true, tone: -0.1 }, { d: armR, w: 20, rib: true, tone: -0.1 },
      { d: 'M455 255 L540 255', w: 6, tone: -0.12 }, { d: 'M660 255 L745 255', w: 6, tone: -0.12 },
      { d: TANK_HEM, w: 40 },
    ],
    stitches: [
      { d: neck, dist: 25 }, { d: armL, dist: 23 }, { d: armR, dist: 23 },
      { d: TANK_HEM, dist: 30 }, { d: TANK_HEM, dist: 40 },
    ],
    seams: [],
    folds: [
      { d: 'M372 610 C420 690 450 770 462 870', w: 30, o: 0.55 },
      { d: 'M828 610 C780 690 750 770 738 870', w: 30, o: 0.55 },
      { d: 'M352 640 C398 716 426 792 436 890', w: 16, o: 0.5, light: true },
      { d: 'M848 640 C802 716 774 792 764 890', w: 14, o: 0.3, light: true },
      { d: 'M460 920 C466 1010 464 1100 456 1198', w: 30, o: 0.5 },
      { d: 'M742 920 C736 1014 736 1104 746 1200', w: 30, o: 0.5 },
      { d: 'M430 936 C434 1026 432 1110 426 1196', w: 16, o: 0.45, light: true },
      { d: 'M600 420 C612 580 606 740 592 900', w: 130, o: 0.14, light: true },
      { d: 'M560 1030 C584 1100 598 1156 604 1214', w: 22, o: 0.35 },
      { d: 'M376 1160 C470 1140 548 1168 626 1150 C706 1134 786 1156 842 1146', w: 16, o: 0.45 },
      { d: 'M376 1138 C470 1118 548 1146 626 1128 C706 1112 786 1134 842 1124', w: 10, o: 0.35, light: true },
      { d: 'M470 300 C480 360 486 420 490 470', w: 14, o: 0.4 },
      { d: 'M730 300 C720 360 714 420 710 470', w: 14, o: 0.4 },
    ],
    print: front ? { x: 680, y: 470, w: 52 } : { x: 580, y: 340, w: 40 },
  };
}

export const GARMENT_TYPES: GarmentType[] = ['tee-a', 'tank'];
export const isGarmentType = (t: string): t is GarmentType => (GARMENT_TYPES as string[]).includes(t);
export const garment = (type: GarmentType, view: View): Garment => (type === 'tank' ? tank(view) : tee(view));

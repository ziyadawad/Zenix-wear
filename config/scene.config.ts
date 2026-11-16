/**
 * Product scenes ("ambient light" studio shots): the neon colour of each garment colour.
 *
 * Change a value here, then run `npm run scenes` to re-render the images (public/images/scenes-v2/).
 * A colour added from the admin that is not listed here gets DEFAULT_NEON automatically.
 * Keys are colour ids (the colour's English name in lower case, e.g. "black", "dark-green").
 */
export const NEON: Record<string, string> = {
  black: '#2F6BFF', // electric blue
  white: '#FF2D95', // hot pink / magenta
  gray: '#22E1FF', // cyan
  charcoal: '#7B5CFF', // violet
  graphite: '#22E1FF',
  stone: '#2F6BFF',
  bone: '#FF2D95',
  silver: '#7B5CFF',
  sand: '#2F6BFF',
  navy: '#22E1FF',
  olive: '#FFB020', // amber
  wine: '#22E1FF',
};

/** Neon for any colour not listed above. */
export const DEFAULT_NEON = '#9B5CFF';

/** Neon colour for a garment colour id. */
export const neonFor = (colourId?: string | null) => (colourId && NEON[colourId]) || DEFAULT_NEON;

/**
 * Light garments (perceived lightness above this, 0 = black to 1 = white) get a very dark scene so the shirt is the brightest thing in it;
 * darker garments get a lighter, glowing scene behind them so they never blend into the background.
 */
export const LIGHT_GARMENT_THRESHOLD = 0.5;

/**
 * Short-sleeve tee: colour of the thin contrast piping along the raglan seams and sleeve hems, per garment colour.
 * A colour not listed gets light gray piping on dark fabric and dark gray piping on light fabric.
 */
export const PIPING: Record<string, string> = {
  black: '#c4c6cb', // light gray
  white: '#55575c', // dark gray
  gray: '#111214', // black
};
export const PIPING_ON_DARK = '#c4c6cb';
export const PIPING_ON_LIGHT = '#55575c';

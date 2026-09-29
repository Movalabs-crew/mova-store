/**
 * Single source of truth for the landing-page imagery.
 *
 * The same Unsplash photo ids were hardcoded in `Catalogue.jsx`, `Slider.jsx`
 * and `Categories.jsx`, so `photo-1542291026-7eec264c27ff` was fetched at
 * three different sizes and every content edit had to be repeated in three
 * places. Each photo id and transform now lives here once; the three sections
 * just reference the constant they need.
 *
 * `supabase/seed.sql` seeds the same photo id at its own 600px transform (the
 * seeded catalogue image is served at a larger size than the landing cards), so
 * it keeps a local copy of the URL — see the note there.
 */

const UNSPLASH_BASE = "https://images.unsplash.com/";
/** Transform shared by every landing-page section (400px cards). */
export const LANDING_IMAGE_TRANSFORM = "w=400&q=80";

/** Builds an Unsplash URL for a photo id, defaulting to the landing transform. */
export function landingImage(photoId, transform = LANDING_IMAGE_TRANSFORM) {
  return `${UNSPLASH_BASE}${photoId}?${transform}`;
}

export const LANDING_IMAGES = {
  aeroRunner: landingImage("photo-1542291026-7eec264c27ff"),
  cityStride: landingImage("photo-1600185365926-3a2ce3cdb9eb"),
  trailheadBoot: landingImage("photo-1605408499391-6368c628ef42"),
  courtClassic: landingImage("photo-1608231387042-66d1773070a5"),
  cloudknit: landingImage("photo-1595950653106-6c9ebd614d3a"),
  sliders: landingImage("photo-1549298916-b41d501d3772"),
  menShoes: landingImage("photo-1606107557195-0e29a4b5b4aa"),
  kidsShoes: landingImage("photo-1555274175-75f79b09d5b8"),
  womenShoes: landingImage("photo-1543163521-1bf539c55dd2"),
  formalShoes: landingImage("photo-1614252369475-531eba835eb1"),
};

export default LANDING_IMAGES;

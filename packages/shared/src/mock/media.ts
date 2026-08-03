/**
 * MOCK DATA LAYER — media URL helpers. Prototype-only imagery:
 *
 * - Article thumbnails/heroes: seeded picsum.photos placeholders (royalty
 *   free, deterministic per seed). At real-data cutover these become either
 *   the source's OG image or a generated typographic cover — never hotlink
 *   real news photos or anyone's copyrighted imagery.
 * - Member avatars: DiceBear "shapes" SVGs (generated geometry, never real
 *   people).
 * - Entity logos: favicon-style monogram fallback handled by the existing
 *   entity-logo component; mock domains only.
 */

export function mockImage(seed: string, w = 800, h = 450): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

export function mockAvatar(seed: string): string {
  // Muted institutional palette; sharp geometry.
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}&backgroundColor=e5e5e5,d2cec3,f2f1ed&shapeColor=17456b,157a63,96690f,5b3684`;
}

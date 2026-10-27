/**
 * Google Maps Scraper Service
 *
 * Extracts canonical place metadata (Name, Address, Lat/Lng, Category, Rating,
 * Reviews, Website, and Photos) from Google Maps URLs (including shortened
 * maps.app.goo.gl links) without requiring a Google Maps API Key.
 */

import type { PlaceType } from '../types';

export interface GmapsPhoto {
  id: string;
  url: string;
  thumbnail: string;
  caption?: string;
  author?: string;
  group: string;
}

export interface GmapsParsedPlace {
  name: string;
  type: PlaceType;
  category: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  gmaps_url: string;
  rating: number | null;
  reviews_count: string;
  website: string;
  photos: GmapsPhoto[];
  groups: string[];
}

const COMMON_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function classifyPhoto(idx: number, caption: string = '', category: string = ''): string {
  const text = `${caption} ${category}`.toLowerCase();

  if (
    text.includes('menu') ||
    text.includes('price') ||
    text.includes('harga') ||
    text.includes('daftar')
  ) {
    return 'Menu';
  }
  if (
    caption.toLowerCase().includes('food') ||
    caption.toLowerCase().includes('drink') ||
    caption.toLowerCase().includes('coffee') ||
    caption.toLowerCase().includes('latte') ||
    caption.toLowerCase().includes('kopi') ||
    caption.toLowerCase().includes('makan') ||
    caption.toLowerCase().includes('minum') ||
    caption.toLowerCase().includes('snack') ||
    caption.toLowerCase().includes('cake') ||
    caption.toLowerCase().includes('pastry') ||
    caption.toLowerCase().includes('dish') ||
    caption.toLowerCase().includes('tea')
  ) {
    return 'Food & Drink';
  }
  if (
    caption.toLowerCase().includes('outdoor') ||
    caption.toLowerCase().includes('view') ||
    caption.toLowerCase().includes('nature') ||
    caption.toLowerCase().includes('forest') ||
    caption.toLowerCase().includes('camp') ||
    caption.toLowerCase().includes('taman') ||
    caption.toLowerCase().includes('pohon') ||
    caption.toLowerCase().includes('gunung') ||
    caption.toLowerCase().includes('mountain') ||
    caption.toLowerCase().includes('exterior')
  ) {
    return 'Outdoor & View';
  }
  if (
    caption.toLowerCase().includes('interior') ||
    caption.toLowerCase().includes('vibe') ||
    caption.toLowerCase().includes('ambience') ||
    caption.toLowerCase().includes('atmosphere') ||
    caption.toLowerCase().includes('seating') ||
    caption.toLowerCase().includes('table') ||
    caption.toLowerCase().includes('indoor')
  ) {
    return 'Vibes & Atmosphere';
  }

  // Balanced heuristic fallback for photo galleries without explicit review captions
  const groupsCycle = ['Vibes & Atmosphere', 'Food & Drink', 'Outdoor & View'];
  return groupsCycle[idx % groupsCycle.length];
}

function mapCategoryToPlaceType(category: string, name: string): PlaceType {
  const target = `${category} ${name}`.toLowerCase();

  if (
    target.includes('restaurant') ||
    target.includes('cafe') ||
    target.includes('coffee') ||
    target.includes('bakery') ||
    target.includes('bar') ||
    target.includes('bistro') ||
    target.includes('food') ||
    target.includes('dining') ||
    target.includes('eatery') ||
    target.includes('warung') ||
    target.includes('resto') ||
    target.includes('noodle') ||
    target.includes('pizza')
  ) {
    return 'Restaurant';
  }

  if (
    target.includes('mall') ||
    target.includes('shopping') ||
    target.includes('supermarket') ||
    target.includes('plaza') ||
    target.includes('market') ||
    target.includes('store') ||
    target.includes('department') ||
    target.includes('center')
  ) {
    return 'Mall';
  }

  if (
    target.includes('park') ||
    target.includes('garden') ||
    target.includes('public') ||
    target.includes('square') ||
    target.includes('museum') ||
    target.includes('temple') ||
    target.includes('church') ||
    target.includes('mosque') ||
    target.includes('monument') ||
    target.includes('beach') ||
    target.includes('forest') ||
    target.includes('camp') ||
    target.includes('lake') ||
    target.includes('waterfall') ||
    target.includes('hiking') ||
    target.includes('outdoor')
  ) {
    return 'Public spaces';
  }

  return 'other';
}

export async function parseGoogleMapsUrl(inputUrl: string): Promise<GmapsParsedPlace> {
  const trimmedUrl = inputUrl.trim();
  if (!trimmedUrl) {
    throw new Error('Google Maps URL cannot be empty');
  }

  const headers = {
    'User-Agent': COMMON_USER_AGENT,
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  // 1. Resolve redirect to get the canonical URL
  let finalUrl = trimmedUrl;
  try {
    const redirectResp = await fetch(trimmedUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
    });
    finalUrl = redirectResp.url || trimmedUrl;
  } catch (err) {
    console.warn('Redirect follow failed, continuing with original URL:', err);
  }

  // 2. Extract Place Name from URL
  let name = '';
  const nameMatch = finalUrl.match(/\/place\/([^/@?]+)/);
  if (nameMatch) {
    try {
      name = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
    } catch {
      name = nameMatch[1].replace(/\+/g, ' ');
    }
  }

  // 3. Extract Coordinates from URL
  let latitude: number | null = null;
  let longitude: number | null = null;
  const coordsMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (coordsMatch) {
    latitude = parseFloat(coordsMatch[1]);
    longitude = parseFloat(coordsMatch[2]);
  } else {
    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      latitude = parseFloat(atMatch[1]);
      longitude = parseFloat(atMatch[2]);
    }
  }

  // 4. Extract Hex ID (0x...:0x...)
  let hexId = '';
  const hexMatch = finalUrl.match(/1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
  if (hexMatch) {
    hexId = hexMatch[1];
  }

  // 5. Extract Knowledge Graph ID (/g/...)
  let kgId = '';
  const kgMatch = finalUrl.match(/16s%2F([^!&?]+)/) || finalUrl.match(/16s\/([^!&?]+)/);
  if (kgMatch) {
    try {
      kgId = decodeURIComponent(kgMatch[1]);
    } catch {
      kgId = kgMatch[1];
    }
    if (!kgId.startsWith('/')) kgId = '/' + kgId;
  }

  let address = '';
  let category = '';
  let website = '';
  let rating: number | null = null;
  let reviewsCount = '';

  // 6. Fetch embed metadata if hexId & coordinates exist
  if (hexId && latitude !== null && longitude !== null) {
    try {
      const encodedName = encodeURIComponent(name);
      const embedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d10000!2d${longitude}!3d${latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s${hexId}!2s${encodedName}!5e0!3m2!1sen!2sus`;
      const embedResp = await fetch(embedUrl, { headers });
      if (embedResp.ok) {
        const embedHtml = await embedResp.text();
        const initMatch = embedHtml.match(/initEmbed\((.*?)\);/);
        if (initMatch) {
          const embedData = JSON.parse(initMatch[1]);
          const placeDetails = embedData[21]?.[3];
          if (Array.isArray(placeDetails)) {
            if (placeDetails[1] && (!name || name === 'place')) {
              name = placeDetails[1];
            }
            if (typeof placeDetails[3] === 'number') {
              rating = placeDetails[3];
            }
            if (placeDetails[4]) {
              reviewsCount = String(placeDetails[4]);
            }
            if (placeDetails[11]?.[0]) {
              website = placeDetails[11][0];
            }
            if (placeDetails[12]) {
              category = placeDetails[12];
            }
            if (placeDetails[13]) {
              address = placeDetails[13];
            } else if (Array.isArray(placeDetails[2])) {
              address = placeDetails[2].join(', ');
            }
          }
        }
      }
    } catch (e) {
      console.warn('Embed metadata parsing failed:', e);
    }
  }

  // 7. Map category to Trippy PlaceType
  const placeType = mapCategoryToPlaceType(category, name);

  // 8. Fetch High-Res Photos
  const photos: GmapsPhoto[] = [];
  if (hexId && latitude !== null && longitude !== null) {
    try {
      const encodedName = encodeURIComponent(name);
      const kgPart = kgId ? `%2115m2%211m1%214s${encodeURIComponent(kgId)}` : '';
      const photoCount = 30;
      const photoBlock = `%2112m4%212m3%211i360%212i120%214i8%2113m57%212m2%211i203%212i100%213m2%212i${photoCount}%215b1%216m6%211m2%211i86%212i86%211m2%211i408%212i240%217m33%211m3%211e1%212b0%213e3%211m3%211e2%212b1%213e2%211m3%211e2%212b0%213e3%211m3%211e8%212b0%213e3%211m3%211e10%212b0%213e3%211m3%211e10%212b1%213e2%211m3%211e10%212b0%213e4%211m3%211e9%212b1%213e2%212b1%219b0%2115m8%211m7%211m2%211m1%211e2%212m2%211i195%212i195%213i20`;
      const pb = `%211m17%211s${encodeURIComponent(hexId)}%212s${encodedName}%213m8%211m3%211d3959.08%212d${longitude}%213d${latitude}%213m2%211i1024%212i768%214f13.1%214m2%213d${latitude}%214d${longitude}${kgPart}${photoBlock}`;
      const previewUrl = `https://www.google.com/maps/preview/place?authuser=0&hl=en&gl=us&q=${encodedName}&pb=${pb}`;

      const prevResp = await fetch(previewUrl, { headers });
      if (prevResp.ok) {
        let prevText = await prevResp.text();
        if (prevText.startsWith(")]}'")) {
          prevText = prevText.slice(4).trim();
        }
        const prevData = JSON.parse(prevText);

        const rawPhotoNodes: any[] = prevData[6]?.[51]?.[0] || [];
        const seenUrls = new Set<string>();

        rawPhotoNodes.forEach((node, idx) => {
          const rawUrl = node[6]?.[0];
          if (rawUrl && typeof rawUrl === 'string' && !seenUrls.has(rawUrl)) {
            seenUrls.add(rawUrl);
            const baseUrl = rawUrl.replace(/=w\d+.*$/, '');
            const highRes = `${baseUrl}=w1200-h800-k-no`;
            const thumbnail = `${baseUrl}=w400-h300-k-no`;
            const caption = (node[6]?.[1] as string) || '';
            const author = (node[2]?.[0] as string) || '';

            const group = classifyPhoto(idx, caption, category);

            photos.push({
              id: `photo_${idx + 1}`,
              url: highRes,
              thumbnail,
              caption: caption || `${name} photo`,
              author,
              group,
            });
          }
        });
      }
    } catch (e) {
      console.warn('Preview photo fetching failed:', e);
    }
  }

  // Build unique groups list
  const groups = ['All'];
  photos.forEach((p) => {
    if (p.group && !groups.includes(p.group)) {
      groups.push(p.group);
    }
  });

  return {
    name: name || 'Discovered Place',
    type: placeType,
    category,
    address,
    latitude,
    longitude,
    gmaps_url: trimmedUrl,
    rating,
    reviews_count: reviewsCount,
    website,
    photos,
    groups,
  };
}

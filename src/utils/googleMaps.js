/**
 * Shared Google Maps JS loader.
 *
 * LiveTracking loads the script itself (id "gmap-script", marker library only).
 * This loader reuses that script if it is already on the page and pulls the
 * Places library in on demand with importLibrary, so the two never load Maps
 * twice and never fight over which libraries were requested.
 */
export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let loading = null;

function waitForScript(script) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load Google Maps — check your API key.')), { once: true });
  });
}

export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!MAPS_KEY) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set in .env'));
  if (loading) return loading;

  loading = (async () => {
    let script = document.getElementById('gmap-script');
    if (!script) {
      script = document.createElement('script');
      script.id = 'gmap-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places,marker`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    await waitForScript(script);
    return window.google.maps;
  })().catch((e) => { loading = null; throw e; });

  return loading;
}

/** Returns the Places library, loading Maps first if needed. */
export async function loadPlaces() {
  const maps = await loadGoogleMaps();
  if (maps.importLibrary) return maps.importLibrary('places');
  if (maps.places) return maps.places;
  throw new Error('Google Places library is not available.');
}

/**
 * City suggestions for typed text, limited to India.
 * Returns [{ placeId, name, state }] — `state` parsed from the secondary text
 * ("Andhra Pradesh, India" → "Andhra Pradesh").
 *
 * Uses the new Places API (AutocompleteSuggestion) and falls back to the
 * legacy AutocompleteService for keys that only have the old API enabled.
 */
export async function searchCities(input, { state } = {}) {
  const text = String(input || '').trim();
  if (text.length < 2) return [];
  const places = await loadPlaces();
  const query = state ? `${text}, ${state}` : text;

  const parse = (main, secondary, placeId) => {
    const parts = String(secondary || '').split(',').map((s) => s.trim()).filter(Boolean);
    const withoutCountry = parts.filter((p) => !/^india$/i.test(p));
    return { placeId, name: String(main || '').trim(), state: withoutCountry[withoutCountry.length - 1] || '' };
  };

  if (places.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
    const { suggestions = [] } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: query,
      includedPrimaryTypes: ['locality', 'administrative_area_level_3'],
      includedRegionCodes: ['in'],
    });
    return suggestions
      .map((s) => s.placePrediction)
      .filter(Boolean)
      .map((p) => parse(p.mainText?.text, p.secondaryText?.text, p.placeId));
  }

  if (places.AutocompleteService) {
    const svc = new places.AutocompleteService();
    const preds = await new Promise((resolve) => {
      svc.getPlacePredictions(
        { input: query, types: ['(cities)'], componentRestrictions: { country: 'in' } },
        (res) => resolve(res || []),
      );
    });
    return preds.map((p) => parse(
      p.structured_formatting?.main_text,
      p.structured_formatting?.secondary_text,
      p.place_id,
    ));
  }

  throw new Error('Google Places search is not available for this API key.');
}

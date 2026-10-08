/**
 * MapCityPicker — city dropdown for rate cards.
 *
 * Shows the cities already saved on the server, and as the admin types it also
 * searches Google Maps for matching cities in India (limited to the chosen
 * state). Picking a map city that is not saved yet creates it on the server
 * (POST /admin/cities, which geocodes it) and selects it — so there is no
 * separate "Add new city" step.
 *
 * Rate cards need a real server city id, which is why a map result is always
 * turned into a saved city before it becomes the value.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { ChevronDown, MapPin } from 'lucide-react';
import { searchCities, MAPS_KEY } from '../../utils/googleMaps';

const norm = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export default function MapCityPicker({
  value, onChange, state, savedCities = [], extraOptions = [],
  onCreateCity, error, placeholder = 'Search a city', disabled,
}) {
  const [input, setInput] = useState('');
  const [mapResults, setMapResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mapError, setMapError] = useState(MAPS_KEY ? null : 'Map search is off — set VITE_GOOGLE_MAPS_API_KEY in .env.');
  const reqId = useRef(0);

  const savedOptions = useMemo(() => savedCities.map((c) => ({
    value: String(c.id), label: c.state ? `${c.name}, ${c.state}` : c.name, kind: 'saved', city: c,
  })), [savedCities]);

  // Parents pass freshly built arrays every render; keep the latest in a ref
  // and key the search on their contents so it doesn't re-run on every render.
  const latest = useRef({ savedCities, savedOptions, extraOptions });
  latest.current = { savedCities, savedOptions, extraOptions };
  const savedKey = savedCities.map((c) => c.id).join(',');
  const extraKey = extraOptions.map((o) => o.label).join('|');

  // Debounced Google search on the typed text.
  useEffect(() => {
    if (!MAPS_KEY) return undefined;
    const { savedCities, savedOptions, extraOptions } = latest.current;
    const text = input.trim();
    const typedSelected = savedOptions.concat(extraOptions).some((o) => o.label === input);
    if (text.length < 2 || typedSelected) { reqId.current++; setSearching(false); setMapResults([]); return undefined; }
    const id = ++reqId.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const rows = await searchCities(text, { state });
        if (id !== reqId.current) return;
        const wanted = norm(state);
        const seen = new Set();
        setMapResults(rows
          .filter((r) => r.name && r.state && (!wanted || norm(r.state) === wanted))
          .filter((r) => { const k = norm(r.name) + '|' + norm(r.state); if (seen.has(k)) return false; seen.add(k); return true; })
          // Skip ones already saved — the saved option covers them.
          .filter((r) => !savedCities.some((c) => norm(c.name) === norm(r.name) && norm(c.state) === norm(r.state)))
          .map((r) => ({ value: `map:${r.placeId}`, label: `${r.name}, ${r.state}`, kind: 'map', place: r })));
        setMapError(null);
      } catch (e) {
        if (id === reqId.current) { setMapResults([]); setMapError(e.message || 'Map search failed.'); }
      } finally {
        if (id === reqId.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [input, state, savedKey, extraKey]);

  const options = useMemo(() => [...extraOptions, ...savedOptions, ...mapResults], [extraOptions, savedOptions, mapResults]);
  const selected = options.find((o) => String(o.value) === String(value ?? '')) || null;

  const handleChange = async (_e, opt) => {
    if (!opt) return;
    if (opt.kind !== 'map') { onChange(opt.value); return; }
    setCreating(true);
    try {
      const city = await onCreateCity({ name: opt.place.name, state: opt.place.state });
      if (city?.id != null) onChange(String(city.id));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <Autocomplete
        size="small"
        options={options}
        value={selected}
        disabled={disabled || creating}
        disableClearable
        autoHighlight
        openOnFocus
        loading={searching}
        filterOptions={(opts, { inputValue }) => {
          const q = norm(inputValue);
          // Map results are already matched by Google; filter the saved list locally.
          return opts.filter((o) => o.kind === 'map' || !q || norm(o.label).includes(q) || (selected && o.value === selected.value));
        }}
        groupBy={(o) => (o.kind === 'map' ? 'From map (will be added)' : 'Saved cities')}
        popupIcon={<ChevronDown size={16} />}
        getOptionLabel={(o) => (o ? String(o.label ?? '') : '')}
        isOptionEqualToValue={(o, v) => String(o.value) === String(v.value)}
        getOptionKey={(o) => String(o.value)}
        inputValue={input}
        onInputChange={(_e, v) => setInput(v)}
        noOptionsText={input.trim().length < 2 ? 'Type a city name to search the map' : (searching ? 'Searching…' : 'No matching city found')}
        loadingText="Searching map…"
        onChange={handleChange}
        renderOption={(props, o) => {
          const { key, ...rest } = props;
          return (
            <li key={key} {...rest} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {o.kind === 'map' && <MapPin size={14} style={{ color: '#3B65DB', flexShrink: 0 }} />}
              <span>{o.label}</span>
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={selected ? undefined : (creating ? 'Adding city…' : placeholder)}
            error={!!error}
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps?.input,
                endAdornment: (
                  <>
                    {(searching || creating) && <CircularProgress size={14} />}
                    {params.slotProps?.input?.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
      {mapError && <p style={{ fontSize: 11.5, color: '#92400E', marginTop: 4 }}>{mapError}</p>}
      {creating && <p style={{ fontSize: 11.5, color: '#3B65DB', marginTop: 4 }}>Adding this city…</p>}
    </div>
  );
}

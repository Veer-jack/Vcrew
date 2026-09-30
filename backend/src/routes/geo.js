import { Router } from "express";
import { getCountries, getStatesOfCountry, getCitiesOfState } from "@countrystatecity/countries";

export const router = Router();

// country-region-data (frontend's Country dropdown) and @countrystatecity/countries
// (this city lookup, ODbL-1.0 licensed, actively maintained by the same author
// as the underlying open dataset -- replaced the old country-state-city-data
// package, which hadn't been published since 2020) come from different
// sources, so a handful of country names differ: ours favors the common
// short form ("Russia"), theirs occasionally the formal ISO/GeoNames name
// ("Russian Federation") or a slightly different rendering of the same
// place ("Fiji" vs "Fiji Islands"). Bridges only the names that actually
// mismatch (checked against every country-region-data entry, not guessed);
// anything not listed here is assumed to already match exactly.
const COUNTRY_NAME_ALIASES = {
  "Åland Islands": "Aland Islands",
  "Bahamas": "The Bahamas",
  "Brunei Darussalam": "Brunei",
  "Congo, Republic of the (Brazzaville)": "Congo",
  "Congo, the Democratic Republic of the (Kinshasa)": "Democratic Republic of the Congo",
  "Côte d'Ivoire, Republic of": "Ivory Coast",
  "Falkland Islands (Islas Malvinas)": "Falkland Islands",
  "Fiji": "Fiji Islands",
  "French Southern and Antarctic Lands": "French Southern Territories",
  "Gambia, The": "The Gambia",
  "Holy See (Vatican City)": "Vatican City State (Holy See)",
  "Hong Kong": "Hong Kong S.A.R.",
  "Iran, Islamic Republic of": "Iran",
  "Isle of Man": "Man (Isle of)",
  "Korea, Democratic People's Republic of": "North Korea",
  "Korea, Republic of": "South Korea",
  "Macao": "Macau S.A.R.",
  "Macedonia, Republic of": "North Macedonia",
  "Micronesia, Federated States of": "Micronesia",
  "Palestine": "Palestinian Territory Occupied",
  "Pitcairn": "Pitcairn Island",
  "Réunion": "Reunion",
  "Russian Federation": "Russia",
  "Saint Barthélemy": "Saint-Barthelemy",
  "Saint Helena, Ascension and Tristan da Cunha": "Saint Helena",
  "Saint Martin": "Saint-Martin (French part)",
  "South Georgia and South Sandwich Islands": "South Georgia",
  "Syrian Arab Republic": "Syria",
  "Tanzania, United Republic of": "Tanzania",
  "Venezuela, Bolivarian Republic of": "Venezuela",
  "Virgin Islands, British": "Virgin Islands (British)",
  "Virgin Islands, U.S.": "Virgin Islands (US)",
  "Wallis and Futuna": "Wallis and Futuna Islands",
};

// The country list is ~5KB and never changes at runtime -- fetched once per
// process instead of on every request (getStatesOfCountry/getCitiesOfState
// are left to the package's own lazy-loading, since those are already only
// ever called for the one country/state a given request actually asked for).
let countriesPromise = null;
function getCountriesCached() {
  if (!countriesPromise) countriesPromise = getCountries();
  return countriesPromise;
}

// GET /api/geo/cities?country=India&state=Karnataka
// Public, no auth -- static reference data, nothing user-specific. Always
// resolves to a (possibly empty) list rather than an error, since an empty
// list is exactly the signal the frontend's City field uses to fall back to
// free text -- a country/state pair this package doesn't cover (or a
// genuine name mismatch beyond the alias table above) degrades to the same
// free-text input it would've been without this feature at all.
router.get("/cities", async (req, res) => {
  const country = String(req.query.country || "").trim();
  const state = String(req.query.state || "").trim();
  if (!country || !state) return res.json({ cities: [] });

  try {
    const dataCountryName = COUNTRY_NAME_ALIASES[country] || country;
    const countries = await getCountriesCached();
    const countryRow = countries.find(c => c.name === dataCountryName);
    if (!countryRow) return res.json({ cities: [] });

    const states = await getStatesOfCountry(countryRow.iso2);
    const stateRow = states.find(s => s.name === state);
    if (!stateRow) return res.json({ cities: [] });

    const cityRows = await getCitiesOfState(countryRow.iso2, stateRow.iso2);
    // Some regions list the same city name twice (distinct localities sharing
    // a name) -- dedupe here so every consumer gets a clean list instead of
    // each one having to guard against it (e.g. React's <option key> map).
    const cities = [...new Set(cityRows.map(c => c.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    res.json({ cities });
  } catch {
    res.json({ cities: [] });
  }
});

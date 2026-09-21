import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = path.join(__dirname, "..", "..", "node_modules", "country-state-city-data", "dist");

// country-region-data (frontend's Country dropdown) and country-state-city-data
// (this city lookup, ISC licensed -- avoided the GPL-3.0 "country-state-city"
// package) come from different sources, so a chunk of country names differ:
// ours favors the common short form ("Russia"), theirs the formal ISO/GeoNames
// name ("Russian Federation"). Bridges only the names that actually mismatch;
// anything not listed here is assumed to already match exactly.
const COUNTRY_NAME_ALIASES = {
  "Åland Islands": "Aland Islands",
  "Bonaire, Sint Eustatius and Saba": "Bonaire, Saint Eustatius and Saba ",
  "Brunei Darussalam": "Brunei",
  "Cocos (Keeling) Islands": "Cocos Islands",
  "Congo, Republic of the (Brazzaville)": "Republic of the Congo",
  "Congo, the Democratic Republic of the (Kinshasa)": "Democratic Republic of the Congo",
  "Côte d'Ivoire, Republic of": "Ivory Coast",
  "Curaçao": "Curacao",
  "Falkland Islands (Islas Malvinas)": "Falkland Islands",
  "French Southern and Antarctic Lands": "French Southern Territories",
  "Gambia, The": "Gambia",
  "Holy See (Vatican City)": "Vatican",
  "Iran, Islamic Republic of": "Iran",
  "Korea, Democratic People's Republic of": "North Korea",
  "Korea, Republic of": "South Korea",
  "Macedonia, Republic of": "Macedonia",
  "Micronesia, Federated States of": "Micronesia",
  "Palestine": "Palestinian Territory",
  "Réunion": "Reunion",
  "Russian Federation": "Russia",
  "Saint Barthélemy": "Saint Barthelemy",
  "Saint Helena, Ascension and Tristan da Cunha": "Saint Helena",
  "Sint Maarten (Dutch part)": "Sint Maarten",
  "Eswatini": "Swaziland",
  "Syrian Arab Republic": "Syria",
  "Tanzania, United Republic of": "Tanzania",
  "Timor-Leste": "East Timor",
  "Venezuela, Bolivarian Republic of": "Venezuela",
  "Virgin Islands, British": "British Virgin Islands",
  "Virgin Islands, U.S.": "U.S. Virgin Islands",
};

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

// GET /api/geo/cities?country=India&state=Karnataka
// Public, no auth -- static reference data, nothing user-specific. Always
// resolves to a (possibly empty) list rather than an error, since an empty
// list is exactly the signal the frontend's City field uses to fall back to
// free text -- a country/state pair country-state-city-data doesn't cover
// (or a genuine name mismatch beyond the alias table above) degrades to the
// same free-text input it would've been without this feature at all.
router.get("/cities", (req, res) => {
  const country = String(req.query.country || "").trim();
  const state = String(req.query.state || "").trim();
  if (!country || !state) return res.json({ cities: [] });

  const dataCountry = COUNTRY_NAME_ALIASES[country] || country;
  const regionData = readJson(path.join(DATA_ROOT, "region", `${dataCountry}.json`));
  const region = regionData?.regions?.find(r => r.adminName1 === state);
  if (!region) return res.json({ cities: [] });

  const cityData = readJson(path.join(DATA_ROOT, "region_city_data", dataCountry, `${region.toponymName}.json`));
  const cities = (cityData?.cities || []).map(c => c.asciiname).filter(Boolean).sort((a, b) => a.localeCompare(b));
  res.json({ cities });
});

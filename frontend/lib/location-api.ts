import { apiFetch } from "@/lib/api-config";
import type { CountryDto } from "@/lib/server/country-types";
import type { CityDto, StateDto } from "@/lib/server/location-types";

export type { CountryDto, StateDto, CityDto };

export async function fetchCountries() {
  return apiFetch<CountryDto[]>("/api/countries");
}

export async function fetchStates(countryId = 1) {
  return apiFetch<StateDto[]>(`/api/states?country_id=${countryId}`);
}

export async function fetchCities(stateId: number) {
  return apiFetch<CityDto[]>(`/api/cities?state_id=${stateId}`);
}

/** India is country_id 1 in our seed */
export const INDIA_COUNTRY_ID = 1;

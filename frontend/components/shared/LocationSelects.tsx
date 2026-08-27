"use client";

import { useEffect, useRef, useState } from "react";
import SearchableSelect from "@/components/shared/SearchableSelect";
import {
  fetchCities,
  fetchCountries,
  fetchStates,
  INDIA_COUNTRY_ID,
  type CityDto,
  type CountryDto,
  type StateDto,
} from "@/lib/location-api";

export type LocationValue = {
  countryId: number | null;
  stateId: number | null;
  cityId: number | null;
  countryName: string;
  stateName: string;
  cityName: string;
  countryIso: string;
};

type Props = {
  value?: Partial<LocationValue>;
  onChange: (next: LocationValue) => void;
  showCountry?: boolean;
  showState?: boolean;
  showCity?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
  defaultCountryId?: number;
  layout?: "stack" | "grid";
  idPrefix?: string;
};

function emptyValue(): LocationValue {
  return {
    countryId: null,
    stateId: null,
    cityId: null,
    countryName: "",
    stateName: "",
    cityName: "",
    countryIso: "",
  };
}

export default function LocationSelects({
  value,
  onChange,
  showCountry = true,
  showState = true,
  showCity = true,
  required = false,
  disabled = false,
  className = "",
  selectClassName,
  defaultCountryId = INDIA_COUNTRY_ID,
  layout = "grid",
  idPrefix = "loc",
}: Props) {
  const [countries, setCountries] = useState<CountryDto[]>([]);
  const [states, setStates] = useState<StateDto[]>([]);
  const [cities, setCities] = useState<CityDto[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadError, setLoadError] = useState("");

  const countryId = value?.countryId ?? null;
  const stateId = value?.stateId ?? null;
  const cityId = value?.cityId ?? null;
  const countryIso = value?.countryIso ?? "";
  const countryName = value?.countryName ?? "";
  const stateName = value?.stateName ?? "";
  const cityName = value?.cityName ?? "";

  // Keep latest callbacks/values without putting them in effect deps
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  // 1) Load countries once
  useEffect(() => {
    let cancelled = false;
    setLoadingCountries(true);
    fetchCountries().then((res) => {
      if (cancelled) return;
      setLoadingCountries(false);
      if (!res.ok || !res.data) {
        setLoadError(res.error || "Could not load countries");
        return;
      }
      setCountries(res.data);
      setLoadError("");

      const current = valueRef.current;
      if (!current?.countryId && !current?.countryName && !current?.countryIso) {
        const india =
          res.data.find((c) => c.countryId === defaultCountryId) ||
          res.data.find((c) => c.iso === "IN");
        if (india) {
          onChangeRef.current({
            ...emptyValue(),
            countryId: india.countryId,
            countryName: india.niceName,
            countryIso: india.iso,
          });
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [defaultCountryId]);

  // 2) Resolve countryId from iso/name once countries are loaded
  useEffect(() => {
    if (countries.length === 0 || countryId != null) return;

    const iso = countryIso.toUpperCase();
    const name = countryName.trim().toLowerCase();
    const match =
      (iso && countries.find((c) => c.iso === iso)) ||
      (name &&
        countries.find(
          (c) =>
            c.niceName.toLowerCase() === name ||
            c.countryName.toLowerCase() === name,
        )) ||
      null;

    if (!match) return;

    const current = valueRef.current;
    onChangeRef.current({
      ...emptyValue(),
      ...current,
      countryId: match.countryId,
      countryName: match.niceName,
      countryIso: match.iso,
      stateId: current?.stateId ?? null,
      stateName: current?.stateName ?? "",
      cityId: current?.cityId ?? null,
      cityName: current?.cityName ?? "",
    });
  }, [countries.length, countryId, countryIso, countryName]);

  // 3) Load states when countryId changes
  useEffect(() => {
    if (countryId == null) {
      setStates([]);
      return;
    }

    let cancelled = false;
    setLoadingStates(true);
    fetchStates(countryId).then((res) => {
      if (cancelled) return;
      setLoadingStates(false);
      if (!res.ok || !res.data) {
        setStates([]);
        return;
      }
      setStates(res.data);

      const current = valueRef.current;
      const sName = current?.stateName?.trim().toLowerCase() || "";
      if (!current?.stateId && sName) {
        const match = res.data.find((s) => s.stateName.toLowerCase() === sName);
        if (match) {
          onChangeRef.current({
            countryId,
            countryName: current?.countryName || "",
            countryIso: current?.countryIso || "",
            stateId: match.stateId,
            stateName: match.stateName,
            cityId: current?.cityId ?? null,
            cityName: current?.cityName ?? "",
          });
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [countryId]);

  // 4) Load cities when stateId changes
  useEffect(() => {
    if (stateId == null) {
      setCities([]);
      return;
    }

    let cancelled = false;
    setLoadingCities(true);
    fetchCities(stateId).then((res) => {
      if (cancelled) return;
      setLoadingCities(false);
      if (!res.ok || !res.data) {
        setCities([]);
        return;
      }
      setCities(res.data);

      const current = valueRef.current;
      const cName = current?.cityName?.trim().toLowerCase() || "";
      if (!current?.cityId && cName) {
        const match = res.data.find((c) => c.cityName.toLowerCase() === cName);
        if (match) {
          onChangeRef.current({
            countryId: current?.countryId ?? countryId,
            countryName: current?.countryName || "",
            countryIso: current?.countryIso || "",
            stateId,
            stateName: current?.stateName || "",
            cityId: match.cityId,
            cityName: match.cityName,
          });
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [stateId, countryId]);

  function pickCountry(idStr: string) {
    if (!idStr) {
      onChange(emptyValue());
      return;
    }
    const id = Number(idStr) || null;
    const c = countries.find((x) => x.countryId === id);
    onChange({
      countryId: id,
      countryName: c?.niceName || "",
      countryIso: c?.iso || "",
      stateId: null,
      stateName: "",
      cityId: null,
      cityName: "",
    });
  }

  function pickState(idStr: string) {
    if (!idStr) {
      onChange({
        countryId,
        countryName: countryName || "",
        countryIso: countryIso || "",
        stateId: null,
        stateName: "",
        cityId: null,
        cityName: "",
      });
      return;
    }
    const id = Number(idStr) || null;
    const s = states.find((x) => x.stateId === id);
    onChange({
      countryId,
      countryName: countryName || "",
      countryIso: countryIso || "",
      stateId: id,
      stateName: s?.stateName || "",
      cityId: null,
      cityName: "",
    });
  }

  function pickCity(idStr: string) {
    if (!idStr) {
      onChange({
        countryId,
        countryName: countryName || "",
        countryIso: countryIso || "",
        stateId,
        stateName: stateName || "",
        cityId: null,
        cityName: "",
      });
      return;
    }
    const id = Number(idStr) || null;
    const c = cities.find((x) => x.cityId === id);
    onChange({
      countryId,
      countryName: countryName || "",
      countryIso: countryIso || "",
      stateId,
      stateName: stateName || "",
      cityId: id,
      cityName: c?.cityName || "",
    });
  }

  const countryOptions = countries.map((c) => ({
    value: String(c.countryId),
    label: c.niceName,
  }));
  const stateOptions = states.map((s) => ({
    value: String(s.stateId),
    label: s.stateName,
  }));
  const cityOptions = cities
    .filter((c) => c.cityName.trim().length > 0)
    .map((c) => ({
      value: String(c.cityId),
      label: c.cityName,
    }));

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {showCountry ? (
        <SearchableSelect
          id={`${idPrefix}-country`}
          label="Country"
          required={required}
          disabled={disabled}
          loading={loadingCountries}
          placeholder="Select country"
          searchPlaceholder="Search country…"
          value={countryId != null ? String(countryId) : ""}
          options={countryOptions}
          onChange={pickCountry}
          triggerClassName={selectClassName}
        />
      ) : null}

      {showState || showCity ? (
        <div
          className={
            layout === "stack" || !(showState && showCity)
              ? "space-y-4"
              : "grid grid-cols-1 gap-4 sm:grid-cols-2"
          }
        >
          {showState ? (
            <SearchableSelect
              id={`${idPrefix}-state`}
              label="State"
              required={required}
              disabled={disabled || countryId == null}
              loading={loadingStates}
              placeholder={
                countryId == null ? "Select country first" : "Select state"
              }
              searchPlaceholder="Search state…"
              value={stateId != null ? String(stateId) : ""}
              options={stateOptions}
              onChange={pickState}
              triggerClassName={selectClassName}
              emptyText={
                countryId == null ? "Choose a country first" : "No states found"
              }
            />
          ) : null}

          {showCity ? (
            <SearchableSelect
              id={`${idPrefix}-city`}
              label="City"
              required={required}
              disabled={disabled || stateId == null}
              loading={loadingCities}
              placeholder={
                stateId == null ? "Select state first" : "Select city"
              }
              searchPlaceholder="Type to search city…"
              value={cityId != null ? String(cityId) : ""}
              options={cityOptions}
              onChange={pickCity}
              triggerClassName={selectClassName}
              emptyText={
                stateId == null ? "Choose a state first" : "No cities found"
              }
            />
          ) : null}
        </div>
      ) : null}

      {loadError ? (
        <p className="text-xs text-[#E24C4C]">{loadError}</p>
      ) : null}
    </div>
  );
}

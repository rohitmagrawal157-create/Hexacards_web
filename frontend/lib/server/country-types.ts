/** Supabase `country` table row */
export type CountryRow = {
  country_id: number | string;
  iso: string;
  country_name: string;
  nicename: string;
  iso3: string | null;
  numcode: number | null;
  phonecode: number;
  status: number; // 0 = Inactive, 1 = Active
};

/** Safe public payload */
export type CountryDto = {
  countryId: number;
  iso: string;
  countryName: string;
  niceName: string;
  iso3: string | null;
  numCode: number | null;
  phoneCode: number;
  status: boolean;
};

export function mapCountry(row: CountryRow): CountryDto {
  return {
    countryId: Number(row.country_id),
    iso: row.iso,
    countryName: row.country_name,
    niceName: row.nicename,
    iso3: row.iso3 ?? null,
    numCode: row.numcode == null ? null : Number(row.numcode),
    phoneCode: Number(row.phonecode),
    status: Number(row.status) === 1,
  };
}

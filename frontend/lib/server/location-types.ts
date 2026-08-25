/** Supabase `state` / `city` rows */

export type StateRow = {
  state_id: number | string;
  state_name: string;
  state_type: "State" | "Union Territory" | string;
  status: number;
  country_id: number | string;
};

export type CityRow = {
  city_id: number | string;
  city_name: string;
  state_id: number | string;
  status: number;
};

export type StateDto = {
  stateId: number;
  stateName: string;
  stateType: string;
  status: boolean;
  countryId: number;
};

export type CityDto = {
  cityId: number;
  cityName: string;
  stateId: number;
  status: boolean;
};

export function mapState(row: StateRow): StateDto {
  return {
    stateId: Number(row.state_id),
    stateName: row.state_name,
    stateType: row.state_type,
    status: Number(row.status) === 1,
    countryId: Number(row.country_id),
  };
}

export function mapCity(row: CityRow): CityDto {
  return {
    cityId: Number(row.city_id),
    cityName: row.city_name,
    stateId: Number(row.state_id),
    status: Number(row.status) === 1,
  };
}

export interface DistrictOption {
  slug: string;
  label: string;
  neighborhoods: string[];
}

export interface CityOption {
  slug: string;
  label: string;
  districts: DistrictOption[];
}

export interface SelectedLocation {
  source: "manual" | "device";
  city: string;
  district: string;
  neighborhood?: string;
  label: string;
  latitude?: number;
  longitude?: number;
}

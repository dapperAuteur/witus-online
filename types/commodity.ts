// types/commodity.ts

export type Season = 1 | 2 | 3;

export interface Commodity {
  id: number;
  season: Season;
  ep: string;
  name: string;
  geo: string;
  lat: number;
  lon: number;
  body: string;
  isHome?: boolean;
}

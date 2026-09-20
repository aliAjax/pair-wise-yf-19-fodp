export type FilterKey = "all" | "pressing" | "identifying" | "stored" | "photo";

export interface Site {
  id: string;
  name: string;
  elevMin: number;
  elevMax: number;
}

export interface IdentifyEvent {
  id: string;
  time: string;
  action: "accepted" | "doubtful";
  note: string;
}

export interface Specimen {
  id: string;
  collectionNo: string;
  dupNo: number;
  species: string;
  collector: string;
  siteId: string;
  elevation: number;
  habitat: string;
  pressed: boolean;
  cabinet: string | null;
  needsPhoto: boolean;
  createdAt: string;
}

export interface AppState {
  version: 1;
  sites: Site[];
  specimens: Specimen[];
  /** 以采集号为键的鉴定历史，同号复份共享 */
  history: Record<string, IdentifyEvent[]>;
  filter: FilterKey;
  selectedId: string | null;
}

// 植物标本馆入库领域模型

export type PressStatus = "待压制" | "已压制";
export type IdentStatus = "待鉴定" | "已鉴定";
export type IdentAction = "accept" | "doubt";

/** 鉴定历史条目：存疑退回时结论可被推翻，但历史保留 */
export interface IdentEvent {
  id: string;
  at: string;
  action: IdentAction;
  by: string;
  note: string;
}

export interface Specimen {
  id: string;
  /** 采集号：同号多份互为复份 */
  collectionNo: string;
  /** 复份序号（同一采集号内 1..n） */
  duplicateIndex: number;
  species: string;
  localityId: string;
  /** 海拔（米） */
  altitude: number;
  habitat: string;
  collector: string;
  pressed: boolean;
  needsPhoto: boolean;
  ident: IdentStatus;
  identHistory: IdentEvent[];
  /** 已分配的柜位编码，null 表示尚未上柜 */
  cabinetId: string | null;
  createdAt: string;
}

/** 采集地点卡：登记允许入库的海拔区间 */
export interface Locality {
  id: string;
  name: string;
  minAltitude: number;
  maxAltitude: number;
  habitatNote: string;
}

export interface Cabinet {
  id: string;
  code: string;
}

export interface EnqueueInput {
  collectionNo: string;
  duplicateCount: number;
  species: string;
  localityId: string;
  altitude: number;
  habitat: string;
  collector: string;
  pressed: boolean;
  needsPhoto: boolean;
}

export interface OpResult {
  ok: boolean;
  errors: string[];
  message?: string;
}

export type FilterKey = "全部" | "待压制" | "待鉴定" | "已入库" | "需补照";

export const FILTER_KEYS: FilterKey[] = ["全部", "待压制", "待鉴定", "已入库", "需补照"];

export function matchesFilter(s: Specimen, key: FilterKey): boolean {
  switch (key) {
    case "全部":
      return true;
    case "待压制":
      return !s.pressed;
    case "待鉴定":
      return s.ident !== "已鉴定";
    case "已入库":
      return s.cabinetId !== null;
    case "需补照":
      return s.needsPhoto;
  }
}

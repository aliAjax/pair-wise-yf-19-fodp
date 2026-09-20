import { useEffect, useMemo, useReducer } from "react";
import type {
  AppState,
  FilterKey,
  IdentifyEvent,
  Site,
  Specimen,
} from "./types";

const STORAGE_KEY = "hxyfront-62007-state-v1";

/** 预设柜位（可手填其他柜位号） */
export const CABINET_POOL = [
  "A-01-01",
  "A-01-02",
  "A-01-03",
  "A-02-01",
  "A-02-02",
  "A-02-03",
  "B-12-04",
  "B-12-05",
  "B-12-06",
  "C-03-01",
  "C-03-02",
  "C-03-03",
];

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pressing", label: "待压制" },
  { key: "identifying", label: "待鉴定" },
  { key: "stored", label: "已入库" },
  { key: "photo", label: "需补照" },
];

const now = "2026-09-20T09:00:00+08:00";

const seedSites: Site[] = [
  { id: "site-1", name: "天目山南坡", elevMin: 400, elevMax: 1500 },
  { id: "site-2", name: "龙王山主峰脊线", elevMin: 1200, elevMax: 1500 },
  { id: "site-3", name: "西溪北麓沟谷", elevMin: 100, elevMax: 800 },
];

function mk(
  partial: Omit<Specimen, "createdAt" | "needsPhoto"> & { needsPhoto?: boolean }
): Specimen {
  return { needsPhoto: false, createdAt: now, ...partial };
}

const seedSpecimens: Specimen[] = [
  // 同号三份复份：未压制，待鉴定
  mk({
    id: "sp-1",
    collectionNo: "HX-240615-01",
    dupNo: 1,
    species: "槭属待定",
    collector: "周岚",
    siteId: "site-1",
    elevation: 1180,
    habitat: "落叶阔叶林下，腐殖土",
    pressed: false,
    cabinet: null,
    needsPhoto: true,
  }),
  mk({
    id: "sp-2",
    collectionNo: "HX-240615-01",
    dupNo: 2,
    species: "槭属待定",
    collector: "周岚",
    siteId: "site-1",
    elevation: 1180,
    habitat: "落叶阔叶林下，腐殖土",
    pressed: false,
    cabinet: null,
  }),
  mk({
    id: "sp-3",
    collectionNo: "HX-240615-01",
    dupNo: 3,
    species: "槭属待定",
    collector: "周岚",
    siteId: "site-1",
    elevation: 1180,
    habitat: "落叶阔叶林下，腐殖土",
    pressed: false,
    cabinet: null,
  }),
  // 同号两份：已压制待鉴定
  mk({
    id: "sp-4",
    collectionNo: "HX-240615-08",
    dupNo: 1,
    species: "蕨类",
    collector: "陈予安",
    siteId: "site-3",
    elevation: 560,
    habitat: "阴湿沟谷，溪边石隙",
    pressed: true,
    cabinet: null,
  }),
  mk({
    id: "sp-5",
    collectionNo: "HX-240615-08",
    dupNo: 2,
    species: "蕨类",
    collector: "陈予安",
    siteId: "site-3",
    elevation: 560,
    habitat: "阴湿沟谷，溪边石隙",
    pressed: true,
    cabinet: null,
  }),
  // 同号两份：已接受且已上柜（占两个不同柜位）
  mk({
    id: "sp-6",
    collectionNo: "HX-240616-03",
    dupNo: 1,
    species: "黄山菊",
    collector: "林疏",
    siteId: "site-2",
    elevation: 1320,
    habitat: "山顶灌丛草甸",
    pressed: true,
    cabinet: "B-12-04",
  }),
  mk({
    id: "sp-7",
    collectionNo: "HX-240616-03",
    dupNo: 2,
    species: "黄山菊",
    collector: "林疏",
    siteId: "site-2",
    elevation: 1320,
    habitat: "山顶灌丛草甸",
    pressed: true,
    cabinet: "B-12-05",
  }),
];

const seedHistory: Record<string, IdentifyEvent[]> = {
  "HX-240616-03": [
    {
      id: "ev-1",
      time: "2026-09-12T15:20:00+08:00",
      action: "accepted",
      note: "对比馆藏模式标本，叶形与总苞吻合，定为黄山菊。",
    },
  ],
};

export function initialState(): AppState {
  return {
    version: 1,
    sites: seedSites,
    specimens: seedSpecimens,
    history: seedHistory,
    filter: "all",
    selectedId: null,
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 1) return initialState();
    return { ...initialState(), ...parsed };
  } catch {
    return initialState();
  }
}

let seq = 100;
export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

// ---------- 派生：鉴定结论（同号复份共享，看最近一次鉴定） ----------

export type GroupConclusion = "accepted" | "doubtful" | "pending";

export function groupConclusion(
  collectionNo: string,
  history: Record<string, IdentifyEvent[]>
): GroupConclusion {
  const events = history[collectionNo];
  if (!events || events.length === 0) return "pending";
  const latest = events.reduce((a, b) => (a.time > b.time ? a : b));
  return latest.action === "accepted" ? "accepted" : "doubtful";
}

/**
 * 标本当前业务状态（互斥）：
 * 已入库 > 待压制 > 已鉴定 / 待鉴定（存疑退回仍为待鉴定）
 */
export type SpecimenStage =
  | "pressing"
  | "identifying"
  | "identified"
  | "stored";

export function specimenStage(
  s: Specimen,
  history?: Record<string, IdentifyEvent[]>
): SpecimenStage {
  if (s.cabinet) return "stored";
  if (!s.pressed) return "pressing";
  if (history && groupConclusion(s.collectionNo, history) === "accepted") {
    return "identified";
  }
  return "identifying";
}

export const CONCLUSION_TEXT: Record<GroupConclusion, string> = {
  accepted: "已鉴定",
  doubtful: "存疑退回",
  pending: "待鉴定",
};

export const STAGE_TEXT: Record<SpecimenStage, string> = {
  pressing: "待压制",
  identifying: "待鉴定",
  identified: "已鉴定",
  stored: "已入库",
};

export function matchesFilter(
  s: Specimen,
  filter: FilterKey,
  history?: Record<string, IdentifyEvent[]>
): boolean {
  if (filter === "all") return true;
  if (filter === "photo") return s.needsPhoto;
  return specimenStage(s, history) === filter;
}

// ---------- 动作 ----------

export interface BatchItemInput {
  species: string;
  collector: string;
  siteId: string;
  elevation: number;
  habitat: string;
  pressed: boolean;
}

export type Action =
  | { type: "ADD_BATCH"; collectionNo: string; items: BatchItemInput[] }
  | {
      type: "ALLOCATE";
      collectionNo: string;
      /** 标本 id -> 柜位号 */
      assignment: Record<string, string>;
    }
  | {
      type: "IDENTIFY";
      collectionNo: string;
      action: "accepted" | "doubtful";
      note: string;
    }
  | { type: "TOGGLE_PRESSED"; id: string }
  | { type: "TOGGLE_PHOTO"; id: string }
  | { type: "ADD_SITE"; site: Omit<Site, "id"> }
  | { type: "SET_FILTER"; filter: FilterKey }
  | { type: "SELECT"; id: string | null }
  | { type: "RESET" };

export class DomainError extends Error {}

/**
 * 入库校验：海拔必须落在采集地点卡登记的区间内，越界整次拒绝
 * （调用方负责保证 items 全部通过后才 dispatch）。
 */
export function validateBatch(
  state: AppState,
  collectionNo: string,
  items: BatchItemInput[]
): void {
  if (!collectionNo.trim()) throw new DomainError("请填写采集号。");
  if (items.length === 0) throw new DomainError("请至少录入一份复份。");
  items.forEach((item, i) => {
    if (!item.species.trim())
      throw new DomainError(`第 ${i + 1} 份复份缺少物种名称。`);
    if (!item.collector.trim())
      throw new DomainError(`第 ${i + 1} 份复份缺少采集人。`);
    if (!Number.isFinite(item.elevation))
      throw new DomainError(`第 ${i + 1} 份复份海拔无效。`);
    const site = state.sites.find((s) => s.id === item.siteId);
    if (!site) throw new DomainError("请选择已登记的采集地点。");
    if (item.elevation < site.elevMin || item.elevation > site.elevMax) {
      throw new DomainError(
        `第 ${i + 1} 份复份海拔 ${item.elevation}m 超出「${site.name}」登记区间 ${site.elevMin}–${site.elevMax}m，整次入库被拒绝，队列未变。`
      );
    }
  });
}

/**
 * 柜位分配校验：
 * 1. 只处理未上柜的同号复份；
 * 2. 任一份未压制，整次拒绝；
 * 3. 同号复份必须分散到互不相同的柜位（含与已上柜同号复份、以及全馆已占用柜位互斥）；
 * 任一不满足都整体拒绝，原队列与柜位记录不变。
 */
export function validateAllocation(
  state: AppState,
  collectionNo: string,
  assignment: Record<string, string>
): Specimen[] {
  const group = state.specimens.filter((s) => s.collectionNo === collectionNo);
  if (group.length === 0) throw new DomainError("未找到该采集号的复份。");
  const pending = group.filter((s) => !s.cabinet);
  if (pending.length === 0) throw new DomainError("该采集号复份已全部上柜。");

  for (const s of pending) {
    if (!s.pressed) {
      throw new DomainError(
        `复份 ${collectionNo}-${s.dupNo} 压制未完成，整次分配被拒绝，原队列与柜位记录不变。`
      );
    }
    const cabinet = assignment[s.id]?.trim();
    if (!cabinet) {
      throw new DomainError(`复份 ${collectionNo}-${s.dupNo} 未指定柜位。`);
    }
  }

  const usedByGroup = group
    .filter((s) => s.cabinet)
    .map((s) => s.cabinet as string);
  const usedGlobal = new Set(
    state.specimens.filter((s) => s.cabinet).map((s) => s.cabinet as string)
  );
  const seen = new Set<string>();

  for (const s of pending) {
    const cabinet = assignment[s.id].trim();
    if (usedByGroup.includes(cabinet)) {
      throw new DomainError(
        `柜位 ${cabinet} 已存放同采集号复份，同号复份须分散到不同柜位，整次分配被拒绝，原记录不变。`
      );
    }
    if (usedGlobal.has(cabinet)) {
      throw new DomainError(
        `柜位 ${cabinet} 已被其他标本占用，整次分配被拒绝，原队列与柜位记录不变。`
      );
    }
    if (seen.has(cabinet)) {
      throw new DomainError(
        `柜位 ${cabinet} 在本次分配中重复，同号复份须分散到不同柜位，整次分配被拒绝，原记录不变。`
      );
    }
    seen.add(cabinet);
  }
  return pending;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_BATCH": {
      const existing = state.specimens.filter(
        (s) => s.collectionNo === action.collectionNo
      );
      let dup = existing.length;
      const additions: Specimen[] = action.items.map((item) => {
        dup += 1;
        return {
          id: nextId("sp"),
          collectionNo: action.collectionNo,
          dupNo: dup,
          species: item.species.trim(),
          collector: item.collector.trim(),
          siteId: item.siteId,
          elevation: item.elevation,
          habitat: item.habitat.trim(),
          pressed: item.pressed,
          cabinet: null,
          needsPhoto: false,
          createdAt: new Date().toISOString(),
        };
      });
      return { ...state, specimens: [...state.specimens, ...additions] };
    }
    case "ALLOCATE": {
      const assignment = action.assignment;
      return {
        ...state,
        specimens: state.specimens.map((s) =>
          assignment[s.id]
            ? { ...s, cabinet: assignment[s.id].trim() }
            : s
        ),
      };
    }
    case "IDENTIFY": {
      const event: IdentifyEvent = {
        id: nextId("ev"),
        time: new Date().toISOString(),
        action: action.action,
        note: action.note.trim(),
      };
      const prev = state.history[action.collectionNo] ?? [];
      return {
        ...state,
        history: {
          ...state.history,
          [action.collectionNo]: [...prev, event],
        },
      };
    }
    case "TOGGLE_PRESSED":
      return {
        ...state,
        specimens: state.specimens.map((s) =>
          s.id === action.id ? { ...s, pressed: !s.pressed } : s
        ),
      };
    case "TOGGLE_PHOTO":
      return {
        ...state,
        specimens: state.specimens.map((s) =>
          s.id === action.id ? { ...s, needsPhoto: !s.needsPhoto } : s
        ),
      };
    case "ADD_SITE": {
      const site: Site = { ...action.site, id: nextId("site") };
      return { ...state, sites: [...state.sites, site] };
    }
    case "SET_FILTER":
      return { ...state, filter: action.filter };
    case "SELECT":
      return { ...state, selectedId: action.id };
    case "RESET":
      return initialState();
    default:
      return state;
  }
}

export function useStore() {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    loadState
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储不可用时仅影响刷新后的保留，不阻断操作
    }
  }, [state]);

  return { state, dispatch };
}

export type Dispatch = ReturnType<typeof useStore>["dispatch"];

// ---------- 队列分组 ----------

export interface QueueGroup {
  collectionNo: string;
  members: Specimen[];
  conclusion: GroupConclusion;
}

export function useQueueGroups(state: AppState): QueueGroup[] {
  return useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, Specimen[]>();
    for (const s of state.specimens) {
      if (!map.has(s.collectionNo)) {
        map.set(s.collectionNo, []);
        order.push(s.collectionNo);
      }
      map.get(s.collectionNo)!.push(s);
    }
    return order.map((collectionNo) => ({
      collectionNo,
      members: map.get(collectionNo)!,
      conclusion: groupConclusion(collectionNo, state.history),
    }));
  }, [state.specimens, state.history]);
}

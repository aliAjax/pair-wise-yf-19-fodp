import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Cabinet,
  EnqueueInput,
  FilterKey,
  IdentAction,
  Locality,
  OpResult,
  Specimen,
} from "./types";
import { matchesFilter } from "./types";

const STORAGE_KEY = "hxyfront-62007-state-v1";

/* ------------------------------- 种子数据 ------------------------------- */

const T0 = "2026-09-18T09:12:00.000Z";
const day = (n: number, h = 10) =>
  new Date(Date.parse(T0) + n * 86400000 + (h - 10) * 3600000).toISOString();

const SEED_LOCALITIES: Locality[] = [
  { id: "loc-np", name: "南岭·小横坑", minAltitude: 800, maxAltitude: 1600, habitatNote: "常绿阔叶林缘，溪谷阴湿" },
  { id: "loc-bp", name: "百花坡·观测样线", minAltitude: 400, maxAltitude: 900, habitatNote: "次生灌丛与草坡交错" },
  { id: "loc-cj", name: "苍鹫峰·北脊", minAltitude: 1300, maxAltitude: 1900, habitatNote: "针阔混交林，山脊风口" },
];

const SEED_CABINETS: Cabinet[] = [
  ...["A-08-01", "A-08-02", "A-08-03", "A-08-04"].map((c) => ({ id: `cab-${c}`, code: c })),
  ...["B-12-01", "B-12-02", "B-12-03", "B-12-04"].map((c) => ({ id: `cab-${c}`, code: c })),
];

let seedCounter = 0;
function seedSpecimen(p: Partial<Specimen> & Pick<Specimen, "collectionNo" | "duplicateIndex">): Specimen {
  seedCounter += 1;
  return {
    id: `seed-${seedCounter}`,
    species: "",
    localityId: SEED_LOCALITIES[0].id,
    altitude: 1200,
    habitat: "",
    collector: "",
    pressed: false,
    needsPhoto: false,
    ident: "待鉴定",
    identHistory: [],
    cabinetId: null,
    createdAt: day(0, 9 + seedCounter),
    ...p,
  };
}

const SEED_SPECIMENS: Specimen[] = [
  // 同号复份：3 份，已鉴定、已压制，分散在 A 柜 3 个柜位
  seedSpecimen({
    collectionNo: "HX-240615-01", duplicateIndex: 1, species: "青榨槭（Acer davidii）",
    localityId: "loc-np", altitude: 1420, habitat: "沟谷阔叶林下", collector: "黎晚晴",
    pressed: true, ident: "已鉴定", cabinetId: "cab-A-08-01",
    identHistory: [{ id: "evt-seed-1", at: day(1, 11), action: "accept", by: "沈鉴", note: "叶形与果翅角度符合，定为青榨槭。" }],
  }),
  seedSpecimen({
    collectionNo: "HX-240615-01", duplicateIndex: 2, species: "青榨槭（Acer davidii）",
    localityId: "loc-np", altitude: 1420, habitat: "沟谷阔叶林下", collector: "黎晚晴",
    pressed: true, ident: "已鉴定", cabinetId: "cab-A-08-03",
    identHistory: [{ id: "evt-seed-2", at: day(1, 11), action: "accept", by: "沈鉴", note: "复份共享鉴定结论（联号同步）。" }],
  }),
  seedSpecimen({
    collectionNo: "HX-240615-01", duplicateIndex: 3, species: "青榨槭（Acer davidii）",
    localityId: "loc-np", altitude: 1420, habitat: "沟谷阔叶林下", collector: "黎晚晴",
    pressed: true, needsPhoto: true, ident: "已鉴定", cabinetId: "cab-A-08-04",
    identHistory: [{ id: "evt-seed-3", at: day(1, 11), action: "accept", by: "沈鉴", note: "复份共享鉴定结论（联号同步）。" }],
  }),
  // 同号复份：2 份，已压制待鉴定，未上柜
  seedSpecimen({
    collectionNo: "HX-240615-08", duplicateIndex: 1, species: "蕨类（待定）",
    localityId: "loc-np", altitude: 1180, habitat: "阴湿沟谷石壁", collector: "陶野",
    pressed: true,
  }),
  seedSpecimen({
    collectionNo: "HX-240615-08", duplicateIndex: 2, species: "蕨类（待定）",
    localityId: "loc-np", altitude: 1180, habitat: "阴湿沟谷石壁", collector: "陶野",
    pressed: true,
  }),
  // 待压制单份
  seedSpecimen({
    collectionNo: "HX-240616-03", duplicateIndex: 1, species: "菊科（待定）",
    localityId: "loc-bp", altitude: 640, habitat: "灌丛路边", collector: "黎晚晴",
  }),
  // 苍鹫峰单份
  seedSpecimen({
    collectionNo: "HX-240617-12", duplicateIndex: 1, species: "黄山栎（待复核）",
    localityId: "loc-cj", altitude: 1520, habitat: "山脊风口矮林", collector: "陶野",
    pressed: true, cabinetId: "cab-B-12-04",
    identHistory: [
      { id: "evt-seed-4", at: day(2, 14), action: "accept", by: "沈鉴", note: "初步接受为黄山栎。" },
      { id: "evt-seed-5", at: day(2, 16), action: "doubt", by: "邱实", note: "叶缘锯齿存疑，退回待鉴定；上柜记录保留。" },
    ],
  }),
];

interface AppState {
  specimens: Specimen[];
  localities: Locality[];
  cabinets: Cabinet[];
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (Array.isArray(parsed.specimens) && Array.isArray(parsed.localities) && Array.isArray(parsed.cabinets)) {
        return parsed;
      }
    }
  } catch {
    // 本地数据损坏时回落到种子数据
  }
  return { specimens: SEED_SPECIMENS, localities: SEED_LOCALITIES, cabinets: SEED_CABINETS };
}

let uidCounter = 0;
function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter}`;
}

/* -------------------------------- Store -------------------------------- */

export interface CabinetOccupancy {
  cabinet: Cabinet;
  specimen: Specimen | null;
}

export function useStore() {
  const [state, setState] = useState<AppState>(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const localities = state.localities;
  const cabinets = state.cabinets;

  const getSpecimen = useCallback(
    (id: string | null) => stateRef.current.specimens.find((s) => s.id === id) ?? null,
    []
  );

  /** 同一采集号的全部复份 */
  const groupOf = useCallback((collectionNo: string) => {
    const g = stateRef.current.specimens
      .filter((s) => s.collectionNo === collectionNo)
      .sort((a, b) => a.duplicateIndex - b.duplicateIndex);
    return g;
  }, []);

  const occupancy = useMemo<CabinetOccupancy[]>(() => {
    const byId = new Map(state.specimens.filter((s) => s.cabinetId).map((s) => [s.cabinetId as string, s]));
    return state.cabinets.map((cabinet) => ({ cabinet, specimen: byId.get(cabinet.id) ?? null }));
  }, [state.specimens, state.cabinets]);

  /**
   * 入队：一次录入同号多份复份。
   * 海拔必须落在所选采集地点卡登记的区间内，否则整批拒绝、队列不变。
   */
  const enqueue = useCallback((input: EnqueueInput): OpResult => {
    const errors: string[] = [];
    const locality = stateRef.current.localities.find((l) => l.id === input.localityId);
    if (!input.collectionNo.trim()) errors.push("请填写采集号。");
    if (!input.species.trim()) errors.push("请填写物种名称。");
    if (!locality) errors.push("请选择采集地点。");
    if (!Number.isFinite(input.altitude) || input.altitude <= 0) errors.push("海拔需为正数（米）。");
    if (locality && Number.isFinite(input.altitude) && input.altitude > 0) {
      if (input.altitude < locality.minAltitude || input.altitude > locality.maxAltitude) {
        errors.push(
          `海拔 ${input.altitude}m 越出「${locality.name}」登记区间 ${locality.minAltitude}–${locality.maxAltitude}m，禁止入库。`
        );
      }
    }
    if (!Number.isInteger(input.duplicateCount) || input.duplicateCount < 1 || input.duplicateCount > 20) {
      errors.push("复份份数需为 1–20 的整数。");
    }
    const conflict = stateRef.current.specimens.some((s) => s.collectionNo === input.collectionNo.trim());
    if (input.collectionNo.trim() && conflict) {
      errors.push(`采集号 ${input.collectionNo} 已在队列中，复份请在详情页随组操作，不重复登记。`);
    }
    if (errors.length) return { ok: false, errors };

    const now = new Date().toISOString();
    const fresh: Specimen[] = Array.from({ length: input.duplicateCount }, (_, i) => ({
      id: uid("spm"),
      collectionNo: input.collectionNo.trim(),
      duplicateIndex: i + 1,
      species: input.species.trim(),
      localityId: input.localityId,
      altitude: input.altitude,
      habitat: input.habitat.trim(),
      collector: input.collector.trim(),
      pressed: input.pressed,
      needsPhoto: input.needsPhoto,
      ident: "待鉴定",
      identHistory: [],
      cabinetId: null,
      createdAt: now,
    }));
    setState((prev) => ({ ...prev, specimens: [...fresh, ...prev.specimens] }));
    return { ok: true, errors: [], message: `已入队 ${fresh.length} 份复份（采集号 ${input.collectionNo.trim()}）。` };
  }, []);

  /**
   * 柜位分配（整号复份一次分配）。
   * 柜位互斥 + 同号复份分散到不同柜位；柜位占用或压制未完成时整次拒绝，
   * 原队列与柜位记录不变（事务）。
   */
  const shelve = useCallback((collectionNo: string, assignment: Record<string, string>): OpResult => {
    const s = stateRef.current;
    const group = s.specimens.filter((x) => x.collectionNo === collectionNo);
    const errors: string[] = [];
    if (!group.length) return { ok: false, errors: ["未找到该采集号的标本。"] };

    for (const spm of group) {
      const cabinetId = assignment[spm.id];
      if (!cabinetId) {
        errors.push(`复份 ${spm.collectionNo}-${spm.duplicateIndex} 未指定柜位。`);
      }
      if (!spm.pressed) {
        errors.push(`复份 ${spm.collectionNo}-${spm.duplicateIndex} 压制未完成，不能上柜。`);
      }
    }

    const chosen = group.map((spm) => assignment[spm.id]).filter(Boolean);
    if (new Set(chosen).size !== chosen.length) {
      errors.push("同号复份必须分散到不同柜位，不能合柜。");
    }
    for (const spm of group) {
      const cabinetId = assignment[spm.id];
      if (!cabinetId) continue;
      const cabinet = s.cabinets.find((c) => c.id === cabinetId);
      const occupant = s.specimens.find((x) => x.cabinetId === cabinetId);
      if (occupant && occupant.collectionNo !== collectionNo) {
        errors.push(
          `柜位 ${cabinet?.code ?? cabinetId} 已被 ${occupant.collectionNo}-${occupant.duplicateIndex} 占用。`
        );
      }
    }
    // 同组内若某复份已占某柜位，又把另一复份也分到该柜位：上面的合柜检查已覆盖。

    if (errors.length) {
      return { ok: false, errors: Array.from(new Set(errors)), message: "整次分配已拒绝，队列与柜位记录保持不变。" };
    }

    setState((prev) => ({
      ...prev,
      specimens: prev.specimens.map((spm) =>
        spm.collectionNo === collectionNo ? { ...spm, cabinetId: assignment[spm.id] } : spm
      ),
    }));
    return { ok: true, errors: [], message: `采集号 ${collectionNo} 的 ${group.length} 份复份已分散上柜。` };
  }, []);

  /** 卸柜（回退到队列），同样整组处理 */
  const unshelve = useCallback((collectionNo: string): OpResult => {
    const group = stateRef.current.specimens.filter((s) => s.collectionNo === collectionNo);
    if (!group.length) return { ok: false, errors: ["未找到该采集号的标本。"] };
    setState((prev) => ({
      ...prev,
      specimens: prev.specimens.map((s) =>
        s.collectionNo === collectionNo ? { ...s, cabinetId: null } : s
      ),
    }));
    return { ok: true, errors: [], message: `采集号 ${collectionNo} 全部复份已卸柜回队。` };
  }, []);

  /**
   * 鉴定联动：作用于同一采集号的全部复份。
   * - 接受：同号全部置为「已鉴定」
   * - 存疑：同号全部退回「待鉴定」
   * 两种操作都追加历史（存疑不抹掉此前接受记录）。
   */
  const identify = useCallback(
    (collectionNo: string, action: IdentAction, by: string, note: string): OpResult => {
      const group = stateRef.current.specimens.filter((s) => s.collectionNo === collectionNo);
      if (!group.length) return { ok: false, errors: ["未找到该采集号的标本。"] };
      // 每份复份各自追加一份事件副本；按 id 预建映射，保证 updater 纯粹（StrictMode 双调用安全）
      const at = new Date().toISOString();
      const eventsById = new Map(
        group.map((s) => [s.id, { id: uid("evt"), at, action, by: by.trim() || "匿名", note: note.trim() }])
      );
      setState((prev) => ({
        ...prev,
        specimens: prev.specimens.map((s) => {
          const event = eventsById.get(s.id);
          if (!event) return s;
          return {
            ...s,
            ident: action === "accept" ? "已鉴定" : "待鉴定",
            identHistory: [...s.identHistory, event],
          };
        }),
      }));
      return {
        ok: true,
        errors: [],
        message:
          action === "accept"
            ? `已接受鉴定：采集号 ${collectionNo} 全部 ${group.length} 份复份联号置为已鉴定。`
            : `存疑退回：采集号 ${collectionNo} 全部 ${group.length} 份复份回到待鉴定，历史已保留。`,
      };
    },
    []
  );

  const togglePressed = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      specimens: prev.specimens.map((s) => (s.id === id ? { ...s, pressed: !s.pressed } : s)),
    }));
  }, []);

  const togglePhoto = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      specimens: prev.specimens.map((s) => (s.id === id ? { ...s, needsPhoto: !s.needsPhoto } : s)),
    }));
  }, []);

  /** 登记采集地点卡（含海拔区间） */
  const addLocality = useCallback((input: Omit<Locality, "id">): OpResult => {
    const errors: string[] = [];
    if (!input.name.trim()) errors.push("请填写地点名称。");
    if (!Number.isFinite(input.minAltitude) || !Number.isFinite(input.maxAltitude)) {
      errors.push("海拔上下限需为数字。");
    } else if (input.minAltitude > input.maxAltitude) {
      errors.push("海拔下限不能高于上限。");
    }
    if (stateRef.current.localities.some((l) => l.name === input.name.trim())) {
      errors.push("该采集地点卡已登记。");
    }
    if (errors.length) return { ok: false, errors };
    setState((prev) => ({
      ...prev,
      localities: [
        ...prev.localities,
        { id: uid("loc"), name: input.name.trim(), minAltitude: input.minAltitude, maxAltitude: input.maxAltitude, habitatNote: input.habitatNote.trim() },
      ],
    }));
    return { ok: true, errors: [], message: `采集地点卡「${input.name.trim()}」已登记。` };
  }, []);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ specimens: SEED_SPECIMENS, localities: SEED_LOCALITIES, cabinets: SEED_CABINETS });
  }, []);

  const selectByFilter = useCallback(
    (key: FilterKey) => stateRef.current.specimens.filter((s) => matchesFilter(s, key)),
    []
  );

  return {
    specimens: state.specimens,
    localities,
    cabinets,
    occupancy,
    getSpecimen,
    groupOf,
    selectByFilter,
    enqueue,
    shelve,
    unshelve,
    identify,
    togglePressed,
    togglePhoto,
    addLocality,
    resetDemo,
  };
}

export type Store = ReturnType<typeof useStore>;

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

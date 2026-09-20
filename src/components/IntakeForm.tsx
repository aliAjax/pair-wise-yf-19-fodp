import { useMemo, useState } from "react";
import type { Store } from "../store";
import type { EnqueueInput, OpResult } from "../types";

interface Props {
  store: Store;
  notify: (r: OpResult) => void;
}

const empty = {
  collectionNo: "",
  duplicateCount: 2,
  species: "",
  localityId: "",
  altitude: 1000,
  habitat: "",
  collector: "",
  pressed: false,
  needsPhoto: false,
};

export default function IntakeForm({ store, notify }: Props) {
  const [form, setForm] = useState<EnqueueInput>({ ...empty, localityId: store.localities[0]?.id ?? "" });
  const locality = store.localities.find((l) => l.id === form.localityId) ?? null;

  const altitudeState = useMemo(() => {
    if (!locality || !Number.isFinite(form.altitude)) return "idle" as const;
    if (form.altitude < locality.minAltitude || form.altitude > locality.maxAltitude) return "over" as const;
    return "in" as const;
  }, [locality, form.altitude]);

  const set = <K extends keyof EnqueueInput>(key: K, value: EnqueueInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = (pressed: boolean) => {
    const result = store.enqueue({ ...form, pressed });
    notify(result);
    if (result.ok) {
      setForm((f) => ({ ...empty, localityId: f.localityId }));
    }
  };

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>入队登记</p>
          <h2>新增复份组</h2>
        </div>
        <span className="hint">同一采集号一次录入多份复份，共享鉴定结论</span>
      </div>

      <div className="field-grid">
        <label>
          <span>采集号</span>
          <input
            value={form.collectionNo}
            placeholder="如 HX-240620-05"
            onChange={(e) => set("collectionNo", e.target.value)}
          />
        </label>
        <label>
          <span>复份份数</span>
          <input
            type="number"
            min={1}
            max={20}
            value={form.duplicateCount}
            onChange={(e) => set("duplicateCount", Number(e.target.value))}
          />
        </label>
        <label>
          <span>物种名称</span>
          <input value={form.species} placeholder="科 / 属 / 待定名" onChange={(e) => set("species", e.target.value)} />
        </label>
        <label>
          <span>采集人</span>
          <input value={form.collector} placeholder="采集人姓名" onChange={(e) => set("collector", e.target.value)} />
        </label>
        <label>
          <span>采集地点（地点卡）</span>
          <select value={form.localityId} onChange={(e) => set("localityId", e.target.value)}>
            {store.localities.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}（{l.minAltitude}–{l.maxAltitude}m）
              </option>
            ))}
          </select>
        </label>
        <label className={altitudeState === "over" ? "field-error" : altitudeState === "in" ? "field-ok" : ""}>
          <span>
            海拔（m）
            {locality && (
              <em className={altitudeState === "over" ? "tag tag-danger" : "tag tag-ok"}>
                允许 {locality.minAltitude}–{locality.maxAltitude}m
              </em>
            )}
          </span>
          <input
            type="number"
            value={Number.isFinite(form.altitude) ? form.altitude : ""}
            onChange={(e) => set("altitude", Number(e.target.value))}
          />
          {altitudeState === "over" && (
            <small className="error-text">
              越界：超出「{locality!.name}」登记区间，禁止入库，请调整海拔或改选地点卡。
            </small>
          )}
        </label>
        <label className="wide">
          <span>生境描述</span>
          <input value={form.habitat} placeholder="林缘 / 沟谷 / 灌丛等" onChange={(e) => set("habitat", e.target.value)} />
        </label>
      </div>

      <div className="check-row">
        <label className="inline-check">
          <input type="checkbox" checked={form.needsPhoto} onChange={(e) => set("needsPhoto", e.target.checked)} />
          <span>需补照</span>
        </label>
        <div className="form-actions">
          <button onClick={() => submit(false)}>保存为待压制</button>
          <button className="primary" onClick={() => submit(true)}>
            压制完成并入队
          </button>
        </div>
      </div>
    </section>
  );
}

import { useState } from "react";
import type { Store } from "../store";
import type { OpResult } from "../types";

interface Props {
  store: Store;
  notify: (r: OpResult) => void;
}

export default function LocalityCards({ store, notify }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [minAltitude, setMin] = useState(800);
  const [maxAltitude, setMax] = useState(1400);
  const [habitatNote, setNote] = useState("");

  const countAt = (locId: string, min: number, max: number) =>
    store.specimens.filter((s) => s.localityId === locId && (s.altitude < min || s.altitude > max)).length;

  const submit = () => {
    const result = store.addLocality({ name, minAltitude, maxAltitude, habitatNote });
    notify(result);
    if (result.ok) {
      setName("");
      setMin(800);
      setMax(1400);
      setNote("");
      setOpen(false);
    }
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>采集地点信息卡</p>
          <h2>海拔区间登记</h2>
        </div>
        <button onClick={() => setOpen((v) => !v)}>{open ? "收起登记" : "登记新地点"}</button>
      </div>

      {open && (
        <div className="locality-form">
          <label>
            <span>地点名称</span>
            <input value={name} placeholder="如 云屏谷·南坡" onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span>海拔下限（m）</span>
            <input type="number" value={minAltitude} onChange={(e) => setMin(Number(e.target.value))} />
          </label>
          <label>
            <span>海拔上限（m）</span>
            <input type="number" value={maxAltitude} onChange={(e) => setMax(Number(e.target.value))} />
          </label>
          <label className="wide">
            <span>生境备注</span>
            <input value={habitatNote} onChange={(e) => setNote(e.target.value)} placeholder="植被 / 坡向 / 水分条件" />
          </label>
          <div className="form-actions wide">
            {minAltitude > maxAltitude && <small className="error-text">下限不能高于上限。</small>}
            <button className="primary" onClick={submit}>
              登记地点卡
            </button>
          </div>
        </div>
      )}

      <div className="locality-grid">
        {store.localities.map((l) => {
          const total = store.specimens.filter((s) => s.localityId === l.id).length;
          const violations = countAt(l.id, l.minAltitude, l.maxAltitude);
          return (
            <article key={l.id} className="locality-card">
              <h3>{l.name}</h3>
              <div className="altitude-band">
                <span>{l.minAltitude}m</span>
                <div className="band-line" />
                <span>{l.maxAltitude}m</span>
              </div>
              <p>{l.habitatNote || "未填写生境备注"}</p>
              <div className="locality-meta">
                <span className="tag">关联标本 {total}</span>
                {violations > 0 ? (
                  <span className="tag tag-danger">区间越界 {violations}</span>
                ) : (
                  <span className="tag tag-ok">海拔合规</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

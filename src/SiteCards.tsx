import { useState } from "react";
import type { AppState } from "./types";
import type { Dispatch } from "./store";

interface SiteCardsProps {
  state: AppState;
  dispatch: Dispatch;
}

export function SiteCards({ state, dispatch }: SiteCardsProps) {
  const [name, setName] = useState("");
  const [elevMin, setElevMin] = useState("");
  const [elevMax, setElevMax] = useState("");
  const [error, setError] = useState<string | null>(null);

  function register() {
    setError(null);
    const min = Number(elevMin);
    const max = Number(elevMax);
    if (!name.trim()) {
      setError("请填写采集地点名称。");
      return;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0) {
      setError("海拔上下限须为非负数字。");
      return;
    }
    if (min > max) {
      setError("海拔下限不能高于上限。");
      return;
    }
    if (state.sites.some((s) => s.name === name.trim())) {
      setError("该采集地点已登记。");
      return;
    }
    dispatch({
      type: "ADD_SITE",
      site: { name: name.trim(), elevMin: min, elevMax: max },
    });
    setName("");
    setElevMin("");
    setElevMax("");
  }

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>采集地点信息卡</p>
          <h2>地点与海拔区间</h2>
        </div>
        <span className="rule-hint">越界标本禁止入库</span>
      </div>
      <div className="site-grid">
        {state.sites.map((site) => (
          <article className="site-card" key={site.id}>
            <h3>{site.name}</h3>
            <p className="elev-range">
              <span>{site.elevMin}</span>
              <i>海拔区间 (m)</i>
              <span>{site.elevMax}</span>
            </p>
            <p className="site-meta">
              已登记标本：
              {
                state.specimens.filter((s) => s.siteId === site.id).length
              }{" "}
              份
            </p>
          </article>
        ))}
      </div>
      <div className="site-register">
        <h3>登记新地点</h3>
        <div className="field-grid">
          <label className="wide">
            <span>地点名称</span>
            <input
              value={name}
              placeholder="如 清凉峰南坡"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            <span>海拔下限 (m)</span>
            <input
              type="number"
              value={elevMin}
              onChange={(e) => setElevMin(e.target.value)}
            />
          </label>
          <label>
            <span>海拔上限 (m)</span>
            <input
              type="number"
              value={elevMax}
              onChange={(e) => setElevMax(e.target.value)}
            />
          </label>
        </div>
        {error && <p className="banner banner-error">{error}</p>}
        <button type="button" onClick={register}>
          登记地点卡
        </button>
      </div>
    </section>
  );
}

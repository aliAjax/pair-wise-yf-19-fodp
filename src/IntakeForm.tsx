import { useMemo, useState } from "react";
import type { AppState } from "./types";
import type { Dispatch } from "./store";
import { DomainError, validateBatch } from "./store";

interface IntakeFormProps {
  state: AppState;
  dispatch: Dispatch;
}

interface DraftItem {
  species: string;
  elevation: string;
  habitat: string;
  pressed: boolean;
}

function blankItem(): DraftItem {
  return { species: "", elevation: "", habitat: "", pressed: false };
}

export function IntakeForm({ state, dispatch }: IntakeFormProps) {
  const [collectionNo, setCollectionNo] = useState("");
  const [collector, setCollector] = useState("");
  const [siteId, setSiteId] = useState(state.sites[0]?.id ?? "");
  const [count, setCount] = useState(2);
  const [items, setItems] = useState<DraftItem[]>([blankItem(), blankItem()]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedSite = useMemo(
    () => state.sites.find((s) => s.id === siteId),
    [state.sites, siteId]
  );

  function changeCount(next: number) {
    const n = Math.max(1, Math.min(8, next));
    setCount(n);
    setItems((prev) => {
      const copy = [...prev];
      while (copy.length < n) copy.push(blankItem());
      return copy.slice(0, n);
    });
  }

  function patchItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function reset() {
    setCollectionNo("");
    setCollector("");
    setItems([blankItem(), blankItem()]);
    setCount(2);
  }

  function submit() {
    setError(null);
    setSuccess(null);
    const payload = items.map((item) => ({
      species: item.species,
      collector,
      siteId,
      elevation: Number(item.elevation),
      habitat: item.habitat,
      pressed: item.pressed,
    }));
    try {
      validateBatch(state, collectionNo, payload);
    } catch (e) {
      setError(e instanceof DomainError ? e.message : "校验失败。");
      return;
    }
    dispatch({ type: "ADD_BATCH", collectionNo: collectionNo.trim(), items: payload });
    setSuccess(
      `${count} 份复份（${collectionNo.trim()}）已加入入库队列。`
    );
    reset();
  }

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>复份整批录入</p>
          <h2>新增入库批次</h2>
        </div>
        <span className="rule-hint">
          同一采集号多份复份；海拔越界整批拒绝
        </span>
      </div>

      <div className="field-grid">
        <label>
          <span>采集号（同号即同批复份）</span>
          <input
            value={collectionNo}
            placeholder="如 HX-240620-05"
            onChange={(e) => setCollectionNo(e.target.value)}
          />
        </label>
        <label>
          <span>采集人</span>
          <input
            value={collector}
            placeholder="填写采集人"
            onChange={(e) => setCollector(e.target.value)}
          />
        </label>
        <label>
          <span>采集地点（地点卡）</span>
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {state.sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}（{site.elevMin}–{site.elevMax}m）
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>复份数</span>
          <div className="stepper">
            <button type="button" onClick={() => changeCount(count - 1)}>
              −
            </button>
            <strong>{count}</strong>
            <button type="button" onClick={() => changeCount(count + 1)}>
              +
            </button>
          </div>
        </label>
      </div>

      <div className="dup-list">
        {items.map((item, index) => (
          <div className="dup-card" key={index}>
            <header>
              <b>
                复份 {index + 1}
                <i>
                  {collectionNo.trim()
                    ? `${collectionNo.trim()}-${index + 1}`
                    : "采集号待填"}
                </i>
              </b>
              {selectedSite && (
                <em>
                  海拔限定 {selectedSite.elevMin}–{selectedSite.elevMax}m
                </em>
              )}
            </header>
            <div className="field-grid">
              <label>
                <span>物种名称</span>
                <input
                  value={item.species}
                  placeholder="填写物种名称"
                  onChange={(e) => patchItem(index, { species: e.target.value })}
                />
              </label>
              <label>
                <span>海拔 (m)</span>
                <input
                  type="number"
                  value={item.elevation}
                  placeholder="须在地点卡区间内"
                  onChange={(e) =>
                    patchItem(index, { elevation: e.target.value })
                  }
                />
              </label>
              <label className="wide">
                <span>生境描述</span>
                <input
                  value={item.habitat}
                  placeholder="填写生境描述"
                  onChange={(e) => patchItem(index, { habitat: e.target.value })}
                />
              </label>
              <label className="check-field">
                <span>压制状态</span>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={item.pressed}
                    onChange={(e) =>
                      patchItem(index, { pressed: e.target.checked })
                    }
                  />
                  压制已完成
                </label>
              </label>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="banner banner-error">{error}</p>}
      {success && <p className="banner banner-ok">{success}</p>}

      <div className="form-actions">
        <button type="button" onClick={reset}>
          清空
        </button>
        <button type="button" className="primary" onClick={submit}>
          整批加入入库队列
        </button>
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";
import "./styles.css";
import type { FilterKey } from "./types";
import { FILTERS, specimenStage, useStore } from "./store";
import { useQueueGroups } from "./store";
import { IntakeForm } from "./IntakeForm";
import { SiteCards } from "./SiteCards";
import { Queue } from "./Queue";
import { CabinetLog } from "./CabinetLog";
import { Detail } from "./Detail";
import { AllocateModal } from "./AllocateModal";

function App() {
  const { state, dispatch } = useStore();
  const groups = useQueueGroups(state);
  const [allocating, setAllocating] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const inQueue = state.specimens.filter((s) => !s.cabinet).length;
    const identifying = state.specimens.filter(
      (s) => specimenStage(s, state.history) === "identifying"
    ).length;
    const stored = state.specimens.filter((s) => s.cabinet).length;
    return [
      { label: "入库队列", value: inQueue },
      { label: "待鉴定", value: identifying },
      { label: "已上柜", value: stored },
      { label: "采集点", value: state.sites.length },
    ];
  }, [state.specimens, state.sites]);

  const selected = state.specimens.find((s) => s.id === state.selectedId);

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62007 · 植物标本馆 · Port 62007</p>
        <h1>压制标本入库</h1>
        <span>
          同一采集号复份共享鉴定结论并分散上柜；采集地点卡登记海拔区间，越界禁止入库。
          所有队列、筛选、柜位记录与详情仅写入浏览器本地，刷新后保留。
        </span>
      </section>

      <section className="metrics">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      {selected ? (
        <Detail
          state={state}
          dispatch={dispatch}
          onAllocate={(no) => setAllocating(no)}
          onBack={() => dispatch({ type: "SELECT", id: null })}
        />
      ) : (
        <>
          <section className="workspace">
            <aside className="panel">
              <h2>鉴定状态筛选</h2>
              <div className="chips">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={state.filter === f.key ? "active" : ""}
                    onClick={() =>
                      dispatch({ type: "SET_FILTER", filter: f.key as FilterKey })
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="filter-note">
                同号复份成组展示；不符当前筛选的复份置灰。
              </p>
              <button
                className="reset-btn"
                onClick={() => {
                  if (
                    window.confirm("确定恢复演示数据？本地记录将被清空。")
                  ) {
                    dispatch({ type: "RESET" });
                    setAllocating(null);
                  }
                }}
              >
                恢复演示数据
              </button>
            </aside>

            <IntakeForm state={state} dispatch={dispatch} />
          </section>

          <Queue
            state={state}
            groups={groups}
            dispatch={dispatch}
            onAllocate={(no) => setAllocating(no)}
          />

          <div className="lower-grid">
            <CabinetLog state={state} dispatch={dispatch} />
            <SiteCards state={state} dispatch={dispatch} />
          </div>
        </>
      )}

      <AllocateModal
        key={allocating ?? "none"}
        state={state}
        dispatch={dispatch}
        collectionNo={allocating}
        onClose={() => setAllocating(null)}
      />
    </main>
  );
}

export default App;

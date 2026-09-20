import { useMemo, useState } from "react";
import "./styles.css";
import type { OpResult, FilterKey } from "./types";
import { FILTER_KEYS, matchesFilter } from "./types";
import { useStore } from "./store";
import IntakeForm from "./components/IntakeForm";
import LocalityCards from "./components/LocalityCards";
import QueueBoard from "./components/QueueBoard";
import CabinetBoard from "./components/CabinetBoard";
import DetailDrawer from "./components/DetailDrawer";

interface Toast {
  id: number;
  result: OpResult;
}

function App() {
  const store = useStore();
  const [filter, setFilter] = useState<FilterKey>("全部");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = (result: OpResult) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, result }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  };

  const stats = useMemo(() => {
    const inQueue = store.specimens.filter((s) => s.cabinetId === null).length;
    const pendingIdent = store.specimens.filter((s) => s.ident !== "已鉴定").length;
    const shelved = store.specimens.filter((s) => s.cabinetId !== null).length;
    return {
      inQueue,
      pendingIdent,
      shelved,
      localities: store.localities.length,
    };
  }, [store.specimens, store.localities.length]);

  const filterCounts = useMemo(() => {
    return FILTER_KEYS.map((key) => ({
      key,
      count: key === "全部" ? store.specimens.length : store.specimens.filter((s) => matchesFilter(s, key)).length,
    }));
  }, [store.specimens]);

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62007 · 植物标本馆 · 压制标本入库台</p>
        <h1>植物标本馆入库</h1>
        <span>
          同一采集号的多份复份共享鉴定结论、分散占用不同柜位；柜位占用或压制未完成时整次分配拒绝。
          采集地点卡登记海拔区间，越界标本禁止入库。全部状态仅保存在浏览器本地，刷新后保留。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>待上柜（队列）</small>
          <strong>{stats.inQueue}</strong>
        </article>
        <article>
          <small>待鉴定</small>
          <strong>{stats.pendingIdent}</strong>
        </article>
        <article>
          <small>已上柜</small>
          <strong>{stats.shelved}</strong>
        </article>
        <article>
          <small>采集点</small>
          <strong>{stats.localities}</strong>
        </article>
      </section>

      <section className="workspace">
        <aside className="panel filter-panel">
          <h2>状态筛选</h2>
          <p className="muted">队列与柜位记录同步按此筛选，点击标本可进入详情。</p>
          <div className="chips vertical">
            {filterCounts.map(({ key, count }) => (
              <button
                key={key}
                className={filter === key ? "active" : ""}
                onClick={() => setFilter(key)}
              >
                {key}
                <em>{count}</em>
              </button>
            ))}
          </div>
          <div className="filter-foot">
            <hr />
            <button className="ghost-danger" onClick={store.resetDemo}>
              重置为演示数据
            </button>
            <small>状态仅存于 localStorage</small>
          </div>
        </aside>

        <div className="main-col">
          <IntakeForm store={store} notify={notify} />
        </div>
      </section>

      <LocalityCards store={store} notify={notify} />

      <div className="boards">
        <QueueBoard store={store} filter={filter} openDetail={setSelectedId} notify={notify} />
        <CabinetBoard store={store} filter={filter} openDetail={setSelectedId} />
      </div>

      <DetailDrawer
        store={store}
        specimenId={selectedId}
        onClose={() => setSelectedId(null)}
        onSelect={setSelectedId}
        notify={notify}
      />

      <div className="toasts">
        {toasts.map(({ id, result }) => (
          <div key={id} className={`toast ${result.ok ? "ok" : "fail"}`}>
            <strong>{result.ok ? "操作成功" : "操作被拒绝"}</strong>
            {result.message && <p>{result.message}</p>}
            {result.errors.map((e) => (
              <p key={e}>· {e}</p>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

export default App;

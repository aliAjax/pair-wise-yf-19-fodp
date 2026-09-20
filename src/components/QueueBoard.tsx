import { useState } from "react";
import type { Store } from "../store";
import { formatDateTime } from "../store";
import type { FilterKey, OpResult, Specimen } from "../types";
import { matchesFilter } from "../types";

interface Props {
  store: Store;
  filter: FilterKey;
  openDetail: (id: string) => void;
  notify: (r: OpResult) => void;
}

export function StatusBadges({ s }: { s: Specimen }) {
  return (
    <span className="badges">
      <span className={`tag ${s.pressed ? "tag-ok" : "tag-warn"}`}>{s.pressed ? "已压制" : "待压制"}</span>
      <span className={`tag ${s.ident === "已鉴定" ? "tag-ok" : "tag-warn"}`}>{s.ident}</span>
      {s.cabinetId && <span className="tag tag-info">已上柜</span>}
      {s.needsPhoto && <span className="tag tag-danger">需补照</span>}
    </span>
  );
}

export function IdentifyBar({
  collectionNo,
  ident,
  store,
  notify,
  compact,
}: {
  collectionNo: string;
  ident: Specimen["ident"];
  store: Store;
  notify: (r: OpResult) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [by, setBy] = useState("");
  const [note, setNote] = useState("");

  const run = (action: "accept" | "doubt") => {
    notify(store.identify(collectionNo, action, by, note));
    setNote("");
    setOpen(false);
  };

  return (
    <div className={`identify-bar${compact ? " compact" : ""}`}>
      <div className="identify-actions">
        <button className="primary small" onClick={() => run("accept")} title="同号全部复份置为已鉴定">
          ✓ 接受鉴定
        </button>
        <button className="danger-ghost small" onClick={() => setOpen((v) => !v)} title="同号全部退回待鉴定，历史保留">
          ? 存疑退回
        </button>
      </div>
      <span className={`tag ${ident === "已鉴定" ? "tag-ok" : "tag-warn"}`}>联号：{ident}</span>
      {open && (
        <div className="doubt-box">
          <input placeholder="鉴定人" value={by} onChange={(e) => setBy(e.target.value)} />
          <input placeholder="存疑理由（将写入历史，不删除旧结论）" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="danger small" onClick={() => run("doubt")}>
            确认退回待鉴定
          </button>
        </div>
      )}
    </div>
  );
}

export default function QueueBoard({ store, filter, openDetail, notify }: Props) {
  const visibleGroups = new Map<string, Specimen[]>();
  for (const s of store.specimens) {
    const list = visibleGroups.get(s.collectionNo) ?? [];
    list.push(s);
    visibleGroups.set(s.collectionNo, list);
  }
  const groups = Array.from(visibleGroups.entries())
    .map(([no, list]) => [no, list.sort((a, b) => a.duplicateIndex - b.duplicateIndex)] as const)
    .filter(([, list]) => list.some((s) => matchesFilter(s, filter)));

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>入库队列</p>
          <h2>复份联号工作区</h2>
        </div>
        <span className="hint">共 {groups.length} 个采集号 / {store.specimens.length} 份</span>
      </div>

      {!groups.length && <p className="empty">当前筛选下没有标本。</p>}

      <div className="queue-list">
        {groups.map(([collectionNo, list]) => {
          const head = list[0];
          const locality = store.localities.find((l) => l.id === head.localityId);
          const allShelved = list.every((s) => s.cabinetId);
          return (
            <article key={collectionNo} className="queue-group">
              <header className="group-head">
                <div>
                  <h3>
                    {collectionNo}
                    <span className="dup-count">×{list.length} 复份</span>
                  </h3>
                  <p>
                    {head.species} · {locality?.name ?? "地点未登记"} · {head.altitude}m · 采集人{" "}
                    {head.collector || "—"}
                  </p>
                </div>
                <div className="group-side">
                  <IdentifyBar collectionNo={collectionNo} ident={head.ident} store={store} notify={notify} compact />
                </div>
              </header>

              <div className="dup-rows">
                {list.map((s) => (
                  <button key={s.id} className="dup-row" onClick={() => openDetail(s.id)} title="查看单份详情">
                    <span className="dup-index">#{s.duplicateIndex}</span>
                    <StatusBadges s={s} />
                    <span className="dup-cabinet">
                      {s.cabinetId
                        ? store.cabinets.find((c) => c.id === s.cabinetId)?.code ?? s.cabinetId
                        : "未上柜"}
                    </span>
                    <span className="dup-time">{formatDateTime(s.createdAt)}</span>
                  </button>
                ))}
              </div>

              <footer className="group-foot">
                <span className={allShelved ? "tag tag-ok" : "tag tag-warn"}>
                  {allShelved ? "全组已分散上柜" : "存在未上柜复份"}
                </span>
                <span className="link" onClick={() => openDetail(head.id)}>
                  详情与柜位分配 →
                </span>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}

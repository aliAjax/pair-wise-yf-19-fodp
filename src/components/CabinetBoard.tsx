import type { Store } from "../store";
import type { FilterKey } from "../types";
import { matchesFilter } from "../types";

interface Props {
  store: Store;
  filter: FilterKey;
  openDetail: (id: string) => void;
}

export default function CabinetBoard({ store, filter, openDetail }: Props) {
  const total = store.cabinets.length;
  const occupiedAll = store.occupancy.filter((o) => o.specimen).length;
  const occupiedVisible = store.occupancy.filter(
    (o) => o.specimen && matchesFilter(o.specimen, filter)
  ).length;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>馆藏柜位记录</p>
          <h2>柜位互斥占用图</h2>
        </div>
        <span className="hint">
          筛选命中占用 {occupiedVisible} · 总占用 {occupiedAll}/{total}
        </span>
      </div>

      <div className="cabinet-grid">
        {store.occupancy.map(({ cabinet, specimen }) => {
          const dim = specimen && !matchesFilter(specimen, filter);
          return (
            <button
              key={cabinet.id}
              className={`cabinet-cell ${specimen ? "used" : "free"}${dim ? " dimmed" : ""}`}
              disabled={!specimen}
              onClick={() => specimen && openDetail(specimen.id)}
              title={specimen ? `占用：${specimen.collectionNo}-${specimen.duplicateIndex}` : "空柜位"}
            >
              <span className="cab-code">{cabinet.code}</span>
              {specimen ? (
                <span className="cab-holder">
                  {specimen.collectionNo}
                  <em>#{specimen.duplicateIndex}</em>
                </span>
              ) : (
                <span className="cab-free">空闲</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="rule-note">
        规则：同一采集号的复份必须分散到不同柜位；柜位被占用或任一复份压制未完成时，整次分配拒绝，队列与柜位记录均不变。
      </p>
    </section>
  );
}

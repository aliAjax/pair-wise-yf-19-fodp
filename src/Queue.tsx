import type { AppState } from "./types";
import type { Dispatch, QueueGroup } from "./store";
import { matchesFilter, specimenStage } from "./store";
import { ConclusionBadge, StageBadge } from "./ui";

interface QueueProps {
  state: AppState;
  groups: QueueGroup[];
  dispatch: Dispatch;
  onAllocate: (collectionNo: string) => void;
}

export function Queue({ state, groups, dispatch, onAllocate }: QueueProps) {
  const visible = groups.filter((g) =>
    g.members.some((m) => matchesFilter(m, state.filter, state.history))
  );

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>入库队列</p>
          <h2>复份批次（按采集号联动）</h2>
        </div>
        <span className="rule-hint">
          任一份接受鉴定则同号全部已鉴定；存疑则整号退回待鉴定
        </span>
      </div>

      {visible.length === 0 && <p className="empty">当前筛选下没有标本。</p>}

      <div className="queue-groups">
        {visible.map((group) => {
          const pending = group.members.filter((s) => !s.cabinet);
          const unpressed = pending.filter((s) => !s.pressed).length;
          return (
            <article className="queue-group" key={group.collectionNo}>
              <header className="queue-head">
                <div>
                  <h3>采集号 {group.collectionNo}</h3>
                  <span className="dup-count">
                    共 {group.members.length} 份复份 · 待上柜 {pending.length} 份
                  </span>
                </div>
                <div className="queue-head-actions">
                  <ConclusionBadge conclusion={group.conclusion} />
                  {pending.length > 0 && (
                    <button
                      type="button"
                      className="primary small"
                      onClick={() => onAllocate(group.collectionNo)}
                    >
                      分配柜位{pending.length > 1 ? `（${pending.length} 份）` : ""}
                    </button>
                  )}
                </div>
              </header>

              <div className="dup-rows">
                {group.members.map((s) => {
                  const matched = matchesFilter(
                    s,
                    state.filter,
                    state.history
                  );
                  const stage = specimenStage(s, state.history);
                  return (
                    <div
                      className={
                        "dup-row" + (matched ? "" : " dup-row-dim")
                      }
                      key={s.id}
                    >
                      <b className="dup-no">{s.dupNo}</b>
                      <StageBadge stage={stage} />
                      <div className="dup-main">
                        <strong>{s.species}</strong>
                        <span>
                          {s.collector} · {s.elevation}m
                          {s.needsPhoto && (
                            <em className="photo-flag">需补照</em>
                          )}
                        </span>
                      </div>
                      <div className="dup-cabinet">
                        {s.cabinet ? (
                          <span className="cabinet-tag">{s.cabinet}</span>
                        ) : (
                          <label className="inline-check">
                            <input
                              type="checkbox"
                              checked={s.pressed}
                              onChange={() =>
                                dispatch({ type: "TOGGLE_PRESSED", id: s.id })
                              }
                            />
                            压制完成
                          </label>
                        )}
                      </div>
                      <button
                        type="button"
                        className="small"
                        onClick={() =>
                          dispatch({ type: "SELECT", id: s.id })
                        }
                      >
                        详情
                      </button>
                    </div>
                  );
                })}
              </div>
              {unpressed > 0 && (
                <p className="row-note">
                  其中 {unpressed} 份尚未完成压制，柜位分配将整次拒绝。
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

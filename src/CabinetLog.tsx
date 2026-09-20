import { useMemo } from "react";
import type { AppState } from "./types";
import type { Dispatch } from "./store";
import { CABINET_POOL } from "./store";

interface CabinetLogProps {
  state: AppState;
  dispatch: Dispatch;
}

export function CabinetLog({ state, dispatch }: CabinetLogProps) {
  const rows = useMemo(() => {
    const occupied = new Map(
      state.specimens
        .filter((s) => s.cabinet)
        .map((s) => [s.cabinet as string, s])
    );
    const codes = new Set([...CABINET_POOL, ...occupied.keys()]);
    return [...codes]
      .sort()
      .map((code) => ({ code, specimen: occupied.get(code) ?? null }));
  }, [state.specimens]);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>馆藏柜位记录</p>
          <h2>占用与互斥</h2>
        </div>
        <span className="rule-hint">
          同号复份分散到不同柜位；柜位占用时整批拒绝
        </span>
      </div>
      <div className="cabinet-grid">
        {rows.map(({ code, specimen }) => (
          <div
            className={"cabinet-cell" + (specimen ? " is-used" : "")}
            key={code}
          >
            <b>{code}</b>
            {specimen ? (
              <button
                type="button"
                className="cabinet-link"
                onClick={() => dispatch({ type: "SELECT", id: specimen.id })}
                title="查看标本详情"
              >
                <span>{specimen.collectionNo}</span>
                <i>
                  复份 {specimen.dupNo} · {specimen.species}
                </i>
              </button>
            ) : (
              <em className="cabinet-free">空闲</em>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";
import type { AppState } from "./types";
import type { Dispatch } from "./store";
import { CABINET_POOL, DomainError, validateAllocation } from "./store";

interface AllocateModalProps {
  state: AppState;
  dispatch: Dispatch;
  collectionNo: string | null;
  onClose: () => void;
}

export function AllocateModal({
  state,
  dispatch,
  collectionNo,
  onClose,
}: AllocateModalProps) {
  const group = useMemo(
    () =>
      collectionNo
        ? state.specimens.filter((s) => s.collectionNo === collectionNo)
        : [],
    [state.specimens, collectionNo]
  );
  const pending = group.filter((s) => !s.cabinet);

  const [picks, setPicks] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!collectionNo) return null;

  const occupiedGlobal = new Set(
    state.specimens
      .filter((s) => s.cabinet && s.collectionNo !== collectionNo)
      .map((s) => s.cabinet as string)
  );
  const occupiedByGroup = group
    .filter((s) => s.cabinet)
    .map((s) => s.cabinet as string);

  function setPick(id: string, code: string) {
    setPicks((prev) => ({ ...prev, [id]: code }));
    setError(null);
  }

  function submit() {
    setError(null);
    try {
      validateAllocation(state, collectionNo!, picks);
    } catch (e) {
      setError(e instanceof DomainError ? e.message : "分配校验失败。");
      return;
    }
    dispatch({ type: "ALLOCATE", collectionNo: collectionNo!, assignment: picks });
    setDone(
      `${pending.length} 份复份已上柜，柜位记录与详情页已同步。`
    );
  }

  function close() {
    setPicks({});
    setError(null);
    setDone(null);
    onClose();
  }

  return (
    <div className="modal-mask" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="heading">
          <div>
            <p>复份柜位分配</p>
            <h2>采集号 {collectionNo}</h2>
          </div>
          <button type="button" onClick={close}>
            关闭
          </button>
        </div>

        {done ? (
          <>
            <p className="banner banner-ok">{done}</p>
            <div className="form-actions">
              <button type="button" className="primary" onClick={close}>
                完成
              </button>
            </div>
          </>
        ) : pending.length === 0 ? (
          <p className="empty">该采集号复份已全部上柜。</p>
        ) : (
          <>
            <p className="rule-hint">
              同号复份须分散到不同柜位；任一柜位已占用、或任一复份压制未完成，整次拒绝，原队列与柜位记录不变。
            </p>
            <div className="allocate-rows">
              {pending.map((s) => {
                const code = picks[s.id] ?? "";
                const conflictGlobal = code
                  ? occupiedGlobal.has(code)
                  : false;
                const conflictGroup = code
                  ? occupiedByGroup.includes(code)
                  : false;
                return (
                  <div className="allocate-row" key={s.id}>
                    <div className="allocate-info">
                      <b>
                        复份 {s.dupNo} · {s.species}
                      </b>
                      <span className={s.pressed ? "" : "danger-text"}>
                        {s.pressed ? "压制已完成" : "压制未完成"}
                      </span>
                    </div>
                    <input
                      list="cabinet-pool"
                      placeholder="选择或输入柜位号"
                      value={code}
                      onChange={(e) => setPick(s.id, e.target.value)}
                    />
                    {conflictGlobal && (
                      <em className="danger-text">该柜位已被占用</em>
                    )}
                    {conflictGroup && (
                      <em className="danger-text">同号复份已占用</em>
                    )}
                  </div>
                );
              })}
            </div>

            {occupiedByGroup.length > 0 && (
              <p className="row-note">
                同号已上柜柜位：{occupiedByGroup.join("、")}（不可再用）
              </p>
            )}

            <datalist id="cabinet-pool">
              {CABINET_POOL.map((code) => (
                <option
                  key={code}
                  value={code}
                  disabled={occupiedGlobal.has(code)}
                >
                  {occupiedGlobal.has(code) ? `${code}（已占用）` : code}
                </option>
              ))}
            </datalist>

            {error && <p className="banner banner-error">{error}</p>}

            <div className="form-actions">
              <button type="button" onClick={close}>
                取消
              </button>
              <button type="button" className="primary" onClick={submit}>
                确认整次上柜
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

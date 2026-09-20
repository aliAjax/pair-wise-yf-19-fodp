import { useMemo, useState } from "react";
import type { AppState } from "./types";
import type { Dispatch } from "./store";
import {
  CONCLUSION_TEXT,
  groupConclusion,
  specimenStage,
  STAGE_TEXT,
} from "./store";
import { ConclusionBadge, StageBadge } from "./ui";

interface DetailProps {
  state: AppState;
  dispatch: Dispatch;
  onAllocate: (collectionNo: string) => void;
  onBack: () => void;
}

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function Detail({ state, dispatch, onAllocate, onBack }: DetailProps) {
  const specimen = state.specimens.find((s) => s.id === state.selectedId);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const group = useMemo(
    () =>
      specimen
        ? state.specimens.filter((s) => s.collectionNo === specimen.collectionNo)
        : [],
    [state.specimens, specimen]
  );
  const events = specimen ? state.history[specimen.collectionNo] ?? [] : [];

  if (!specimen) return null;
  const site = state.sites.find((s) => s.id === specimen.siteId);
  const conclusion = groupConclusion(specimen.collectionNo, state.history);
  const inRange =
    site &&
    specimen.elevation >= site.elevMin &&
    specimen.elevation <= site.elevMax;

  function identify(action: "accepted" | "doubtful") {
    setError(null);
    if (!specimen) return;
    if (!note.trim()) {
      setError(
        action === "accepted"
          ? "请填写鉴定依据后再记录接受结论。"
          : "请填写存疑原因，留档备查。"
      );
      return;
    }
    dispatch({
      type: "IDENTIFY",
      collectionNo: specimen.collectionNo,
      action,
      note,
    });
    setNote("");
  }

  return (
    <section className="panel detail">
      <div className="heading">
        <div>
          <p>单份标本详情</p>
          <h2>
            {specimen.collectionNo}-{specimen.dupNo}
          </h2>
        </div>
        <button type="button" onClick={onBack}>
          返回队列
        </button>
      </div>

      <div className="detail-badges">
        <StageBadge stage={specimenStage(specimen, state.history)} />
        <ConclusionBadge conclusion={conclusion} />
        {specimen.needsPhoto && <span className="badge badge-warn">需补照</span>}
      </div>

      <div className="detail-grid">
        <div>
          <span>采集号</span>
          <strong>{specimen.collectionNo}</strong>
        </div>
        <div>
          <span>复份序号</span>
          <strong>
            第 {specimen.dupNo} 份 / 共 {group.length} 份
          </strong>
        </div>
        <div>
          <span>物种名称</span>
          <strong>{specimen.species}</strong>
        </div>
        <div>
          <span>采集人</span>
          <strong>{specimen.collector}</strong>
        </div>
        <div>
          <span>采集地点</span>
          <strong>{site?.name ?? "地点卡缺失"}</strong>
        </div>
        <div>
          <span>海拔</span>
          <strong className={inRange ? "" : "danger-text"}>
            {specimen.elevation}m
            {site && (
              <i>
                （地点卡区间 {site.elevMin}–{site.elevMax}m ·{" "}
                {inRange ? "符合" : "越界"}）
              </i>
            )}
          </strong>
        </div>
        <div className="wide">
          <span>生境描述</span>
          <strong>{specimen.habitat || "—"}</strong>
        </div>
        <div>
          <span>压制状态</span>
          <strong>{specimen.pressed ? "压制已完成" : "压制未完成"}</strong>
        </div>
        <div>
          <span>馆藏柜位</span>
          <strong>{specimen.cabinet ?? "尚未上柜"}</strong>
        </div>
      </div>

      <div className="detail-siblings">
        <h3>同采集号复份（鉴定结论共享）</h3>
        <ul>
          {group.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={s.id === specimen.id ? "current" : ""}
                onClick={() => dispatch({ type: "SELECT", id: s.id })}
              >
                {s.collectionNo}-{s.dupNo}
              </button>
              <span>{STAGE_TEXT[specimenStage(s, state.history)]}</span>
              <span>{s.cabinet ?? "未上柜"}</span>
            </li>
          ))}
        </ul>
        {!specimen.cabinet && (
          <button
            type="button"
            className="primary"
            onClick={() => onAllocate(specimen.collectionNo)}
          >
            为同号复份分配柜位
          </button>
        )}
      </div>

      <div className="identify-box">
        <h3>鉴定（联动同号全部 {group.length} 份）</h3>
        <p className="rule-hint">
          接受：同号全部标记为「已鉴定」；存疑：同号退回「待鉴定」，全部历史保留。
          当前共享结论：{CONCLUSION_TEXT[conclusion]}
        </p>
        <textarea
          value={note}
          rows={3}
          placeholder="鉴定依据 / 存疑原因"
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="button" onClick={() => identify("accepted")}>
            接受鉴定（同号全部已鉴定）
          </button>
          <button type="button" onClick={() => identify("doubtful")}>
            标记存疑（同号退回待鉴定）
          </button>
        </div>

        <h3 className="history-title">鉴定历史（{events.length} 条，长期保留）</h3>
        {events.length === 0 ? (
          <p className="empty">暂无鉴定记录。</p>
        ) : (
          <ol className="history-list">
            {[...events]
              .sort((a, b) => (a.time < b.time ? 1 : -1))
              .map((ev) => (
                <li key={ev.id}>
                  <div>
                    <span
                      className={
                        ev.action === "accepted"
                          ? "badge badge-ok"
                          : "badge badge-danger"
                      }
                    >
                      {ev.action === "accepted" ? "接受" : "存疑退回"}
                    </span>
                    <time>{fmt(ev.time)}</time>
                  </div>
                  <p>{ev.note || "（未填写说明）"}</p>
                </li>
              ))}
          </ol>
        )}
      </div>

      <div className="detail-photo">
        <label className="inline-check">
          <input
            type="checkbox"
            checked={specimen.needsPhoto}
            onChange={() =>
              dispatch({ type: "TOGGLE_PHOTO", id: specimen.id })
            }
          />
          标记为需补照
        </label>
      </div>
    </section>
  );
}

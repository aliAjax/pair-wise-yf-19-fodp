import { useEffect, useMemo, useState } from "react";
import type { Store } from "../store";
import { formatDateTime } from "../store";
import type { OpResult, Specimen } from "../types";
import { IdentifyBar, StatusBadges } from "./QueueBoard";

interface Props {
  store: Store;
  specimenId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  notify: (r: OpResult) => void;
}

export default function DetailDrawer({ store, specimenId, onClose, onSelect, notify }: Props) {
  const specimen = store.getSpecimen(specimenId);
  // 柜位分配草稿：复份 id -> 柜位 id（每次打开抽屉按当前柜位记录初始化）
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (specimen) {
      const group = store.groupOf(specimen.collectionNo);
      setDraft(Object.fromEntries(group.map((s) => [s.id, s.cabinetId ?? ""])));
    }
    // 仅在切换标本/采集号时重置草稿
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specimenId, specimen?.collectionNo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const group = useMemo(
    () => (specimen ? store.groupOf(specimen.collectionNo) : []),
    [store, specimen]
  );

  if (!specimen) return null;

  const locality = store.localities.find((l) => l.id === specimen.localityId) ?? null;
  const altitudeIn = locality
    ? specimen.altitude >= locality.minAltitude && specimen.altitude <= locality.maxAltitude
    : null;

  const chosen = group.map((s) => draft[s.id]).filter(Boolean);
  const duplicateChosen = new Set(chosen).size !== chosen.length;
  const unpressed = group.filter((s) => !s.pressed);

  const cabinetOptionState = (s: Specimen, cabinetId: string): "self" | "busy" | "free" => {
    if (s.cabinetId === cabinetId) return "self";
    const holder = store.specimens.find((x) => x.cabinetId === cabinetId);
    return holder ? "busy" : "free";
  };

  const submitShelve = () => {
    const result = store.shelve(specimen.collectionNo, draft);
    notify(result);
  };

  const unshelve = () => {
    notify(store.unshelve(specimen.collectionNo));
    setDraft(Object.fromEntries(group.map((s) => [s.id, ""])));
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <p>单份标本详情</p>
            <h2>
              {specimen.collectionNo}
              <span className="dup-count">复份 #{specimen.duplicateIndex} / 共 {group.length} 份</span>
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>

        <div className="drawer-body">
          <div className="dup-switch">
            {group.map((s) => (
              <button
                key={s.id}
                className={`dup-chip ${s.id === specimen.id ? "active" : ""}`}
                onClick={() => onSelect(s.id)}
              >
                #{s.duplicateIndex}
                {s.cabinetId ? " · 已上柜" : ""}
              </button>
            ))}
          </div>

          <div className="detail-card">
            <h3>{specimen.species}</h3>
            <StatusBadges s={specimen} />
            <dl className="detail-grid">
              <dt>采集地点</dt>
              <dd>{locality?.name ?? "地点卡缺失"}</dd>
              <dt>海拔</dt>
              <dd>
                {specimen.altitude}m
                {locality && (
                  <span className={`tag ${altitudeIn ? "tag-ok" : "tag-danger"}`}>
                    {altitudeIn
                      ? `区间内（${locality.minAltitude}–${locality.maxAltitude}m）`
                      : `越界（卡区间 ${locality.minAltitude}–${locality.maxAltitude}m）· 禁止入库`}
                  </span>
                )}
              </dd>
              <dt>生境</dt>
              <dd>{specimen.habitat || "—"}</dd>
              <dt>采集人</dt>
              <dd>{specimen.collector || "—"}</dd>
              <dt>馆藏柜位</dt>
              <dd>
                {specimen.cabinetId
                  ? store.cabinets.find((c) => c.id === specimen.cabinetId)?.code ?? specimen.cabinetId
                  : "尚未上柜"}
              </dd>
              <dt>入队时间</dt>
              <dd>{formatDateTime(specimen.createdAt)}</dd>
            </dl>
            <div className="detail-toggles">
              <button onClick={() => store.togglePressed(specimen.id)}>
                {specimen.pressed ? "↺ 标记为待压制" : "✓ 标记压制完成"}
              </button>
              <button onClick={() => store.togglePhoto(specimen.id)}>
                {specimen.needsPhoto ? "取消补照标记" : "标记需补照"}
              </button>
            </div>
          </div>

          <div className="detail-card">
            <h3>鉴定联动（同采集号 {group.length} 份共享结论）</h3>
            <p className="muted">
              任一份接受鉴定，同号全部复份置为已鉴定；任一份存疑，同号全部退回待鉴定。历史结论不删除。
            </p>
            <IdentifyBar collectionNo={specimen.collectionNo} ident={specimen.ident} store={store} notify={notify} />
          </div>

          <div className="detail-card">
            <h3>柜位分配（整组一次提交）</h3>
            <div className="shelve-rows">
              {group.map((s) => (
                <div key={s.id} className="shelve-row">
                  <span className="shelve-label">
                    #{s.duplicateIndex}
                    {!s.pressed && <em className="tag tag-danger">未压制</em>}
                  </span>
                  <select
                    value={draft[s.id] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                  >
                    <option value="">— 未分配 —</option>
                    {store.cabinets.map((c) => {
                      const st = cabinetOptionState(s, c.id);
                      return (
                        <option key={c.id} value={c.id} disabled={st === "busy"}>
                          {c.code}
                          {st === "busy" ? "（已占用）" : st === "self" ? "（当前）" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ))}
            </div>
            {duplicateChosen && <p className="error-text">同一柜位被多份复份选择：同号复份必须分散。</p>}
            {unpressed.length > 0 && (
              <p className="error-text">
                {unpressed.length} 份复份压制未完成，整次分配将被拒绝（先在详情中标记压制完成）。
              </p>
            )}
            <div className="form-actions">
              {group.some((s) => s.cabinetId) && (
                <button className="danger-ghost" onClick={unshelve}>
                  整组卸柜回队
                </button>
              )}
              <button
                className="primary"
                onClick={submitShelve}
                disabled={duplicateChosen || chosen.length !== group.length}
                title="柜位占用或压制未完成时整次拒绝，原有记录不变"
              >
                提交整组柜位分配
              </button>
            </div>
            <p className="rule-note">柜位互斥：任一柜位已被其他标本占用，或同号合柜、压制未完成，整次拒绝且不留部分变更。</p>
          </div>

          <div className="detail-card">
            <h3>鉴定历史（联号写入，存疑退回亦保留）</h3>
            {specimen.identHistory.length === 0 ? (
              <p className="empty">尚无鉴定记录。</p>
            ) : (
              <ol className="history-list">
                {[...specimen.identHistory].reverse().map((e) => (
                  <li key={e.id} className={e.action === "accept" ? "h-accept" : "h-doubt"}>
                    <div className="history-mark">{e.action === "accept" ? "✓ 接受" : "? 存疑退回"}</div>
                    <div className="history-body">
                      <p>{e.note || "（无备注）"}</p>
                      <small>
                        {e.by} · {formatDateTime(e.at)}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

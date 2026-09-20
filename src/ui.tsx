import type { GroupConclusion, SpecimenStage } from "./store";
import { CONCLUSION_TEXT, STAGE_TEXT } from "./store";

const STAGE_CLASS: Record<SpecimenStage, string> = {
  pressing: "badge badge-warn",
  identifying: "badge badge-info",
  identified: "badge badge-ok",
  stored: "badge badge-ok",
};

const CONCLUSION_CLASS: Record<GroupConclusion, string> = {
  accepted: "badge badge-ok",
  doubtful: "badge badge-danger",
  pending: "badge badge-muted",
};

export function StageBadge({ stage }: { stage: SpecimenStage }) {
  return <span className={STAGE_CLASS[stage]}>{STAGE_TEXT[stage]}</span>;
}

export function ConclusionBadge({
  conclusion,
}: {
  conclusion: GroupConclusion;
}) {
  return (
    <span className={CONCLUSION_CLASS[conclusion]}>
      鉴定：{CONCLUSION_TEXT[conclusion]}
    </span>
  );
}

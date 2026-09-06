export interface ParticipantProgress {
  id: string;
  lap: number;
  progress: number;
}

export interface PositionSnapshot {
  place: number;
  total: number;
  orderedIds: string[];
}

export function calculatePosition(
  player: ParticipantProgress,
  opponents: ReadonlyArray<ParticipantProgress>,
): PositionSnapshot {
  const all = [player, ...opponents];
  const ordered = [...all].sort((left, right) => {
    const progressDelta =
      right.lap + right.progress - (left.lap + left.progress);
    return progressDelta !== 0
      ? progressDelta
      : left.id.localeCompare(right.id);
  });
  const place =
    ordered.findIndex((participant) => participant.id === player.id) + 1;
  return {
    place,
    total: all.length,
    orderedIds: ordered.map((participant) => participant.id),
  };
}

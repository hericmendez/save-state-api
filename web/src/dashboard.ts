export const Status = {
  PLAYING: "playing",
  FINISHED: "finished",
  DROPPED: "dropped",
} as const;

export type StatusValue = (typeof Status)[keyof typeof Status];

export interface DashboardGame {
  _id: string;
  name: string;
  status?: string | null;
  hoursPlayed?: number | null;
  timesFinished?: number | null;
  genres?: string[];
  platforms?: string[];
  releaseYear?: number | null;
}

export interface Distribution {
  label: string;
  value: number;
}

export interface DashboardData {
  topGamesByHours: Distribution[];
  favoriteGenres: Distribution[];
  favoritePlatforms: Distribution[];
  totalHours: number;
  hoursByStatus: Distribution[];
  completionRate: number | null;
  finishedCounts: {
    total: number;
    byYear: Distribution[];
    byPlatform: Distribution[];
    byGenre: Distribution[];
  };
}

function hoursOf(g: DashboardGame): number {
  return g.hoursPlayed ?? 0;
}

function sumBy(
  games: DashboardGame[],
  keysOf: (g: DashboardGame) => string[],
): Distribution[] {
  const map = new Map<string, number>();
  for (const g of games) {
    for (const key of keysOf(g)) {
      map.set(key, (map.get(key) ?? 0) + hoursOf(g));
    }
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function buildDashboard(games: DashboardGame[]): DashboardData {
  const tracked = games.filter((g) => g.status !== null && g.status !== undefined);

  const byStatusHours = new Map<string, number>();
  const byStatusCount = new Map<string, number>();
  for (const s of Object.values(Status)) {
    byStatusHours.set(s, 0);
    byStatusCount.set(s, 0);
  }
  for (const g of tracked) {
    const s = g.status as string;
    if (!byStatusHours.has(s)) continue;
    byStatusHours.set(s, (byStatusHours.get(s) ?? 0) + hoursOf(g));
    byStatusCount.set(s, (byStatusCount.get(s) ?? 0) + 1);
  }

  const playing = byStatusCount.get(Status.PLAYING) ?? 0;
  const finished = byStatusCount.get(Status.FINISHED) ?? 0;
  const dropped = byStatusCount.get(Status.DROPPED) ?? 0;
  const completionRate = playing + dropped > 0 ? finished / (playing + dropped) : null;

  const finishedGames = tracked.filter((g) => g.status === Status.FINISHED);

  const byYear = new Map<number, number>();
  for (const g of finishedGames) {
    if (g.releaseYear == null) continue;
    byYear.set(g.releaseYear, (byYear.get(g.releaseYear) ?? 0) + 1);
  }

  return {
    topGamesByHours: tracked
      .map((g) => ({ label: g.name, value: hoursOf(g) }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    favoriteGenres: sumBy(tracked, (g) => g.genres ?? []).slice(0, 10),
    favoritePlatforms: sumBy(tracked, (g) => g.platforms ?? []).slice(0, 10),
    totalHours: tracked.reduce((acc, g) => acc + hoursOf(g), 0),
    hoursByStatus: [...Object.values(Status)].map((s) => ({
      label: s,
      value: byStatusHours.get(s) ?? 0,
    })),
    completionRate,
    finishedCounts: {
      total: finishedGames.length,
      byYear: [...byYear.entries()]
        .map(([label, value]) => ({ label: String(label), value }))
        .sort((a, b) => Number(b.label) - Number(a.label)),
      byPlatform: sumBy(finishedGames, (g) => g.platforms ?? []),
      byGenre: sumBy(finishedGames, (g) => g.genres ?? []),
    },
  };
}

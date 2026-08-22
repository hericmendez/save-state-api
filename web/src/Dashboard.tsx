import { useEffect, useState } from "react";
import { api, ApiRequestError, type Game } from "./api";
import {
  buildDashboard,
  Status,
  type DashboardData,
  type DashboardGame,
  type Distribution,
} from "./dashboard";

function toDashboardGame(g: Game): DashboardGame {
  const releaseDate = (g.game as unknown as { releaseDate?: string })?.releaseDate;
  return {
    _id: g._id,
    name: g.game?.name ?? "(sem nome)",
    status: g.status ?? null,
    hoursPlayed: g.hoursPlayed ?? null,
    genres: g.game?.genres ?? [],
    platforms: g.game?.platforms ?? [],
    releaseYear: releaseDate ? new Date(releaseDate).getUTCFullYear() : null,
  };
}

function Bar({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-1.5 grid grid-cols-[minmax(90px,1fr)_2fr_auto] items-center gap-2">
      <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">
        {label}
      </span>
      <div className="h-2.5 overflow-hidden rounded bg-gray-200">
        <div className="h-full rounded bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-right text-xs tabular-nums">
        {value.toLocaleString("pt-BR")}
        {suffix ?? ""}
      </span>
    </div>
  );
}

const cardCls = "grid gap-3 rounded-lg border border-gray-300 p-4";
const titleCls = "text-base font-bold";

function BarList({
  title,
  items,
  emptyText = "Sem dados.",
}: {
  title: string;
  items: Distribution[];
  emptyText?: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.value));
  return (
    <section className={cardCls}>
      <h2 className={titleCls}>{title}</h2>
      {items.length === 0 && <p className="text-gray-500">{emptyText}</p>}
      {items.map((i) => (
        <Bar key={i.label} label={i.label} value={i.value} max={max} suffix="h" />
      ))}
    </section>
  );
}

function CountList({ title, items }: { title: string; items: Distribution[] }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  return (
    <section className={cardCls}>
      <h2 className={titleCls}>{title}</h2>
      {items.length === 0 && <p className="text-gray-500">Sem dados.</p>}
      {items.map((i) => (
        <Bar key={i.label} label={i.label} value={i.value} max={max} />
      ))}
    </section>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listGames()
      .then((games) => setData(buildDashboard(games.map(toDashboardGame))))
      .catch((e) =>
        setError(
          e instanceof ApiRequestError
            ? e.message
            : "Falha ao carregar estatísticas",
        ),
      );
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-gray-500">Carregando dashboard…</p>;

  const pct =
    data.completionRate == null
      ? "—"
      : `${Math.round(data.completionRate * 100)}%`;

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <div className={`${cardCls} items-start`}>
          <h3 className="m-0 mb-1 text-sm font-semibold text-gray-600">
            Horas totais jogadas
          </h3>
          <p className="m-0 text-3xl font-bold">
            {Math.round(data.totalHours).toLocaleString("pt-BR")}h
          </p>
        </div>
        <div className={cardCls}>
          <h3 className="m-0 mb-1 text-sm font-semibold text-gray-600">
            Taxa de conclusão
          </h3>
          <p className="m-0 text-3xl font-bold">{pct}</p>
          <p className="m-0 text-gray-500">zerados / (jogando + dropados)</p>
        </div>
        <div className={cardCls}>
          <h3 className="m-0 mb-1 text-sm font-semibold text-gray-600">
            Jogos zerados
          </h3>
          <p className="m-0 text-3xl font-bold">{data.finishedCounts.total}</p>
          <p className="m-0 text-gray-500">
            favorito: {data.favoritePlatforms[0]?.label ?? "—"} ·{" "}
            {data.favoriteGenres[0]?.label ?? "—"}
          </p>
        </div>
      </section>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <BarList title="Jogos mais jogados (horas)" items={data.topGamesByHours} />
        <BarList title="Gêneros mais jogados (horas)" items={data.favoriteGenres} />
        <BarList
          title="Plataformas mais jogadas (horas)"
          items={data.favoritePlatforms}
        />

        <section className={cardCls}>
          <h2 className={titleCls}>Horas por status</h2>
          {data.hoursByStatus.every((s) => s.value === 0) && (
            <p className="text-gray-500">Sem dados.</p>
          )}
          {data.hoursByStatus.map((s) => (
            <Bar
              key={s.label}
              label={
                Status[s.label.toUpperCase() as keyof typeof Status] ?? s.label
              }
              value={s.value}
              max={data.totalHours || 1}
              suffix="h"
            />
          ))}
        </section>

        <CountList
          title="Zerados por ano"
          items={data.finishedCounts.byYear.slice(0, 10)}
        />
        <CountList
          title="Zerados por plataforma"
          items={data.finishedCounts.byPlatform}
        />
        <CountList title="Zerados por gênero" items={data.finishedCounts.byGenre} />
      </div>
    </div>
  );
}

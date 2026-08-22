import { btn, btnDanger, cardCls, mainCls } from "../lib/ui";
import Header, { BackButton } from "./Header";
import type { MessageState } from "./Message";
import type { Game, GameList } from "../api";

interface Props {
  detail: Game | null;
  memberLists: (g: Game) => GameList[];
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => Promise<void> | void;
  message: MessageState;
}

export default function GameDetail({
  detail,
  memberLists,
  onBack,
  onEdit,
  onDelete,
  message,
}: Props) {
  const members = detail ? memberLists(detail) : [];
  const rows: [string, string][] = detail
    ? [
        ["Status", detail.status ?? ""],
        ["Horas jogadas", String(detail.hoursPlayed ?? "—")],
        ["Vezes terminado", String(detail.timesFinished ?? "—")],
        ["Nota", String(detail.rating ?? "—")],
        ["Review", detail.review || "—"],
        ["Gêneros", detail.game?.genres?.join(", ") || "—"],
        ["Plataformas", detail.game?.platforms?.join(", ") || "—"],
        ["Listas", members.length > 0 ? members.map((l) => l.name).join(", ") : "—"],
      ]
    : [];

  return (
    <main className={mainCls}>
      <Header title="Save State — Test Console">
        <BackButton onClick={onBack} />
      </Header>
      {message && (
        <p className={message.kind === "error" ? "text-red-600" : "text-green-600"}>
          {message.text}
        </p>
      )}
      {!detail && <p className="text-gray-500">Carregando…</p>}
      {detail && (
        <section className={cardCls}>
          <h2 className="text-base font-bold">{detail.game?.name ?? "(sem nome)"}</h2>
          <dl className="grid gap-2">
            {rows.map(([dt, dd]) => (
              <div key={dt} className="grid grid-cols-[10rem_1fr] gap-2">
                <dt className="font-semibold">{dt}</dt>
                <dd>{dd}</dd>
              </div>
            ))}
          </dl>
          <span className="flex gap-1.5">
            <button className={btn} onClick={() => onEdit(detail._id)}>
              editar
            </button>
            <button
              className={btnDanger}
              onClick={async () => {
                await onDelete(detail._id, detail.game?.name ?? "");
                onBack();
              }}
            >
              remover
            </button>
          </span>
        </section>
      )}
    </main>
  );
}

import { btn, btnDanger } from "../lib/ui";
import type { Game, GameList } from "../api";

interface Props {
  g: Game;
  lists: GameList[];
  memberLists: (g: Game) => GameList[];
  targetId: string;
  setTargetId: (id: string) => void;
  onAddOrCopy: (g: Game, listId: string, mode: "add" | "copy") => void;
  onMove: (g: Game, listId: string) => void;
  onRemoveFromList: (g: Game, listId: string) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

export default function GameRow({
  g,
  lists,
  memberLists,
  targetId,
  setTargetId,
  onAddOrCopy,
  onMove,
  onRemoveFromList,
  onView,
  onEdit,
  onDelete,
}: Props) {
  const members = memberLists(g);
  const nonMemberLists = lists.filter((l) => !(g.listIds ?? []).includes(l._id));

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-gray-200 py-1.5">
      <div>
        <strong>{g.game?.name ?? "(sem nome)"}</strong> — {g.status}
        {g.hoursPlayed != null && ` · ${g.hoursPlayed}h`}
        {g.rating != null && ` · nota ${g.rating}`}
      </div>

      <div className="my-1 flex flex-wrap gap-1.5">
        {members.length === 0 && <span className="text-gray-500">sem listas</span>}
        {members.map((l) => (
          <span
            key={l._id}
            className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 py-0.5 pl-2 pr-0.5 text-[0.78rem] text-indigo-900"
          >
            {l.name}
            <button
              className="cursor-pointer rounded-none border-none bg-transparent p-0 px-1 font-bold text-indigo-900 hover:brightness-110"
              title={`Remover de "${l.name}"`}
              onClick={() => onRemoveFromList(g, l._id)}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="flex w-full flex-wrap items-center gap-1.5">
        <select
          className="rounded-md border border-gray-300 px-1.5 py-1 text-[0.85rem]"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">escolher lista…</option>
          {nonMemberLists.map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </select>
        <button
          className={btn}
          disabled={!targetId}
          onClick={() => onAddOrCopy(g, targetId, members.length > 0 ? "copy" : "add")}
        >
          {members.length > 0 ? "copiar p/ lista" : "adicionar à lista"}
        </button>
        {members.length > 0 && (
          <select
            className="rounded-md border border-gray-300 px-1.5 py-1 text-[0.85rem]"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) void onMove(g, e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">mover para…</option>
            {nonMemberLists.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>
        )}
        <span className="ml-auto flex gap-1.5">
          <button className={btn} onClick={() => onView(g._id)}>
            ver jogo
          </button>
          <button className={btn} onClick={() => onEdit(g._id)}>
            editar
          </button>
          <button
            className={btnDanger}
            onClick={() => onDelete(g._id, g.game?.name ?? "")}
          >
            remover
          </button>
        </span>
      </div>
    </li>
  );
}

export function GameRowList({
  games,
  ...props
}: Omit<Props, "g" | "targetId" | "setTargetId"> & {
  games: Game[];
  targets: Record<string, string>;
  setTargets: (targets: Record<string, string>) => void;
}) {
  const { targets, setTargets, ...rest } = props;
  return (
    <ul className="list-none p-0">
      {games.map((g) => (
        <GameRow
          key={g._id}
          g={g}
          {...rest}
          targetId={targets[g._id] ?? ""}
          setTargetId={(id) => setTargets({ ...targets, [g._id]: id })}
        />
      ))}
    </ul>
  );
}

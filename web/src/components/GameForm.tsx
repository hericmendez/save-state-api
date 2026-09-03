
//src/components/GameForm.tsx
import { btn, cardCls, inputCls, labelCls, mutedCls } from "../lib/ui";

export const GAME_STATUSES = [
  "backlog",
  "playing",
  "replaying",
  "stalled",
  "dropped",
  "limbo",
  "endless",
  "achievement",
  "finished",
  "wishlist",
] as const;

export interface GameFormState {
  name: string;
  email: string;
  password: string;
  status: string;
  hoursPlayed: string;
  rating: string;
  cover: string;
  releaseDate: string;
  genres: string;
  platforms: string;
  developers: string;
  publishers: string;
  summary: string;
}

interface Props {
  editingId: string | null;
  form: GameFormState;
  setForm: (form: GameFormState) => void;
  activeListId: string;
  activeListName?: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function GameForm({
  editingId,
  form,
  setForm,
  activeListId,
  activeListName,
  onSubmit,
  onCancelEdit,
}: Props) {
  const set = (key: keyof GameFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <form onSubmit={onSubmit} className={cardCls}>
      <h2 className="text-base font-bold">
        {editingId ? "Editar jogo (PUT)" : "Adicionar jogo (POST)"}
      </h2>
      {activeListId && !editingId && (
        <p className={mutedCls}>
          Novo jogo será adicionado também à lista <strong>{activeListName}</strong>
        </p>
      )}
      <label className={labelCls}>
        Nome
        <input
          required
          className={inputCls}
          value={form.name}
          onChange={set("name")}
        />
      </label>
      <label className={labelCls}>
        Status
        <select
          className={inputCls}
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          {GAME_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <label className={labelCls}>
          Horas jogadas
          <input
            type="number"
            min={0}
            className={inputCls}
            value={form.hoursPlayed}
            onChange={set("hoursPlayed")}
          />
        </label>
        <label className={labelCls}>
          Nota (0–10)
          <input
            type="number"
            min={0}
            max={10}
            step={0.1}
            className={inputCls}
            value={form.rating}
            onChange={set("rating")}
          />
        </label>
        <label className={labelCls}>
          Lançamento
          <input
            type="date"
            className={inputCls}
            value={form.releaseDate}
            onChange={set("releaseDate")}
          />
        </label>
      </div>
      <details className="grid gap-3">
        <summary className="cursor-pointer text-sm font-semibold text-gray-600">
          Metadados do jogo (capa, gêneros, plataformas…)
        </summary>
        <label className={labelCls}>
          URL da capa
          <input
            type="url"
            placeholder="https://…"
            className={inputCls}
            value={form.cover}
            onChange={set("cover")}
          />
        </label>
        <label className={labelCls}>
          Gêneros (separados por vírgula)
          <input
            className={inputCls}
            placeholder="RPG, Action"
            value={form.genres}
            onChange={set("genres")}
          />
        </label>
        <label className={labelCls}>
          Plataformas (separadas por vírgula)
          <input
            className={inputCls}
            placeholder="NES, PS1"
            value={form.platforms}
            onChange={set("platforms")}
          />
        </label>
        <label className={labelCls}>
          Desenvolvedores (separados por vírgula)
          <input
            className={inputCls}
            value={form.developers}
            onChange={set("developers")}
          />
        </label>
        <label className={labelCls}>
          Publishers (separadas por vírgula)
          <input
            className={inputCls}
            value={form.publishers}
            onChange={set("publishers")}
          />
        </label>
        <label className={labelCls}>
          Sinopse
          <textarea
            rows={3}
            className={inputCls}
            value={form.summary}
            onChange={set("summary")}
          />
        </label>
      </details>
      <div>
        <button type="submit" className={btn}>
          {editingId ? "Salvar" : "Adicionar"}
        </button>
        {editingId && (
          <button type="button" className={btn} onClick={onCancelEdit}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export { splitList };

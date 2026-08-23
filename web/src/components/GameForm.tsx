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

export default function GameForm({
  editingId,
  form,
  setForm,
  activeListId,
  activeListName,
  onSubmit,
  onCancelEdit,
}: Props) {
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
          onChange={(e) => setForm({ ...form, name: e.target.value })}
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
      <label className={labelCls}>
        Horas jogadas
        <input
          type="number"
          min={0}
          className={inputCls}
          value={form.hoursPlayed}
          onChange={(e) => setForm({ ...form, hoursPlayed: e.target.value })}
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
          onChange={(e) => setForm({ ...form, rating: e.target.value })}
        />
      </label>
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

import { btn, btnDanger, btnLink, cardCls, inputCls, mutedCls } from "../lib/ui";
import type { GameList } from "../api";

interface Props {
  lists: GameList[];
  activeListId: string;
  newListName: string;
  setNewListName: (name: string) => void;
  renaming: { id: string; name: string } | null;
  setRenaming: (r: { id: string; name: string } | null) => void;
  onCreateList: (e: React.FormEvent) => void;
  onRenameList: (e: React.FormEvent) => void;
  onDeleteList: (id: string, name: string) => void;
  onSelectAll: () => void;
  onSelectList: (id: string) => void;
  onOpenList: (id: string) => void;
}

export default function ListsSection({
  lists,
  activeListId,
  newListName,
  setNewListName,
  renaming,
  setRenaming,
  onCreateList,
  onRenameList,
  onDeleteList,
  onSelectAll,
  onSelectList,
  onOpenList,
}: Props) {
  return (
    <section className={cardCls}>
      <h2 className="text-base font-bold">Listas</h2>
      <form onSubmit={onCreateList} className="mb-2 flex items-center gap-2">
        <input
          className={inputCls}
          placeholder="Nome da nova lista"
          required
          maxLength={100}
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
        />
        <button type="submit" className={btn}>
          Criar lista
        </button>
      </form>
      {lists.length === 0 && <p className={mutedCls}>Nenhuma lista criada.</p>}
      <ul className="list-none p-0">
        <li
          className={`flex flex-wrap items-center gap-2 border-b border-gray-200 py-1.5 ${
            !activeListId ? "rounded-md bg-blue-50" : ""
          }`}
        >
          <button className={btnLink} onClick={onSelectAll}>
            Todos os jogos
          </button>
          <span className={mutedCls} />
        </li>
        {lists.map((l) => (
          <li
            key={l._id}
            className={`flex flex-wrap items-center gap-2 border-b border-gray-200 py-1.5 ${
              activeListId === l._id ? "rounded-md bg-blue-50" : ""
            }`}
          >
            {renaming?.id === l._id ? (
              <form onSubmit={onRenameList} className="flex grow items-center gap-2">
                <input
                  required
                  maxLength={100}
                  autoFocus
                  className={inputCls}
                  value={renaming.name}
                  onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                />
                <button type="submit" className={btn}>
                  Salvar
                </button>
                <button type="button" className={btn} onClick={() => setRenaming(null)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <button className={btnLink} onClick={() => onSelectList(l._id)}>
                  📁 {l.name}
                </button>
                <span className={mutedCls}>({l.gameCount ?? 0})</span>
                <span className="ml-auto flex gap-1.5">
                  <button className={btn} onClick={() => onOpenList(l._id)}>
                    ver jogos
                  </button>
                  <button
                    className={btn}
                    onClick={() => setRenaming({ id: l._id, name: l.name })}
                  >
                    renomear
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => onDeleteList(l._id, l.name)}
                  >
                    excluir
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

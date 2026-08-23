import { useCallback, useEffect, useState } from "react";
import { api, ApiRequestError, type Game, type GameList, type SafeUser } from "./api";
import AuthForm, { type AuthFormState } from "./components/AuthForm";
import Dashboard from "./Dashboard";
import GameDetail from "./components/GameDetail";
import GameForm, { splitList, type GameFormState } from "./components/GameForm";
import ListsSection from "./components/ListsSection";
import Header, { BackButton, HeaderUser } from "./components/Header";
import Message from "./components/Message";
import { GameRowList } from "./components/GameRow";
import { btn, mainCls, mutedCls } from "./lib/ui";

type View = "home" | "list" | "detail" | "dashboard";
type AuthMode = "login" | "register";
type MessageData = { kind: "error" | "ok"; text: string } | null;

const emptyAuthForm: AuthFormState = {
  name: "",
  email: "",
  password: "",
};

const emptyGameForm: GameFormState = {
  name: "",
  email: "",
  password: "",
  status: "backlog",
  hoursPlayed: "",
  rating: "",
  cover: "",
  releaseDate: "",
  genres: "",
  platforms: "",
  developers: "",
  publishers: "",
  summary: "",
};

export default function App() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [auth, setAuth] = useState<AuthFormState>(emptyAuthForm);
  const [form, setForm] = useState<GameFormState>(emptyGameForm);
  const [games, setGames] = useState<Game[]>([]);
  const [lists, setLists] = useState<GameList[]>([]);
  const [activeListId, setActiveListId] = useState<string>("");
  const [newListName, setNewListName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [view, setView] = useState<View>("home");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Game | null>(null);
  const [message, setMessage] = useState<MessageData>(null);

  function notify(kind: "error" | "ok", text: string) {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 4000);
  }

  function onError(e: unknown) {
    if (e instanceof ApiRequestError && e.status === 401) setUser(null);
    notify("error", (e as Error).message);
  }

  const loadLists = useCallback(async () => {
    try {
      setLists((await api.listLists()) ?? []);
    } catch (e) {
      onError(e);
    }
  }, []);

  const loadGames = useCallback(async () => {
    try {
      setGames((await api.listGames(activeListId || undefined)) ?? []);
    } catch (e) {
      onError(e);
    }
  }, [activeListId]);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (user) {
      void loadLists();
      void loadGames();
    }
  }, [user, loadLists, loadGames]);

  useEffect(() => {
    if (view !== "detail" || !detailId) return;
    setDetail(null);
    api
      .getGame(detailId)
      .then(setDetail)
      .catch((e) => onError(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, detailId]);

  /* ---------- navigation ---------- */

  function openGame(id: string) {
    setDetailId(id);
    setView("detail");
  }

  function openList(listId: string) {
    setActiveListId(listId);
    setView("list");
  }

  function goHome() {
    setActiveListId("");
    setView("home");
  }

  /* ---------- auth ---------- */

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    try {
      const u =
        authMode === "login"
          ? await api.login(auth.email, auth.password)
          : await api.register(auth.name, auth.email, auth.password);
      // register does not set the cookie: log in right after
      if (authMode === "register") await api.login(auth.email, auth.password);
      setUser(u);
      setAuth(emptyAuthForm);
      notify("ok", `Autenticado como ${u.name}`);
    } catch (e) {
      notify("error", (e as Error).message);
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setGames([]);
      setLists([]);
      setActiveListId("");
      setEditingId(null);
      notify("ok", "Logout efetuado");
    }
  }

  /* ---------- lists ---------- */

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      await api.createList(newListName.trim());
      setNewListName("");
      notify("ok", "Lista criada");
      await loadLists();
    } catch (err) {
      onError(err);
    }
  }

  async function handleRenameList(e: React.FormEvent) {
    e.preventDefault();
    if (!renaming || !renaming.name.trim()) return;
    try {
      await api.renameList(renaming.id, renaming.name.trim());
      notify("ok", "Lista renomeada");
      setRenaming(null);
      await Promise.all([loadLists(), loadGames()]);
    } catch (err) {
      onError(err);
    }
  }

  async function handleDeleteList(id: string, name: string) {
    if (!confirm(`Excluir a lista "${name}"? Os jogos permanecem na biblioteca.`)) return;
    try {
      await api.deleteList(id);
      if (activeListId === id) setActiveListId("");
      notify("ok", "Lista excluída");
      await Promise.all([loadLists(), loadGames()]);
    } catch (err) {
      onError(err);
    }
  }

  /* ---------- games ---------- */

  async function handleCreateOrUpdate(e: React.FormEvent) {
    e.preventDefault();
    const game: Record<string, unknown> = { name: form.name };
    if (form.cover.trim()) game.cover = form.cover.trim();
    if (form.releaseDate) game.releaseDate = form.releaseDate;
    if (splitList(form.genres).length) game.genres = splitList(form.genres);
    if (splitList(form.platforms).length) game.platforms = splitList(form.platforms);
    if (splitList(form.developers).length) game.developers = splitList(form.developers);
    if (splitList(form.publishers).length) game.publishers = splitList(form.publishers);
    if (form.summary.trim()) game.summary = form.summary.trim();

    const payload: Record<string, unknown> = {
      game,
      status: form.status,
    };
    if (form.hoursPlayed !== "") payload.hoursPlayed = Number(form.hoursPlayed);
    if (form.rating !== "") payload.rating = Number(form.rating);

    try {
      if (editingId) {
        await api.updateGame(editingId, payload);
        notify("ok", "Jogo atualizado (PUT)");
      } else {
        const created = await api.createGame(payload);
        if (activeListId) {
          await api.addGameToList(created._id, activeListId);
        }
        notify("ok", "Jogo criado (POST)");
      }
      setEditingId(null);
      setForm({ ...emptyGameForm, status: form.status });
      await Promise.all([loadGames(), loadLists()]);
    } catch (err) {
      onError(err);
    }
  }

  async function startEdit(id: string): Promise<void> {
    try {
      const g = await api.getGame(id);
      setEditingId(id);
      setForm({
        ...emptyGameForm,
        name: g.game?.name ?? "",
        status: g.status ?? "backlog",
        hoursPlayed: g.hoursPlayed != null ? String(g.hoursPlayed) : "",
        rating: g.rating != null ? String(g.rating) : "",
        cover: g.game?.cover ?? "",
        releaseDate: g.game?.releaseDate ? g.game.releaseDate.slice(0, 10) : "",
        genres: (g.game?.genres ?? []).join(", "),
        platforms: (g.game?.platforms ?? []).join(", "),
        developers: (g.game?.developers ?? []).join(", "),
        publishers: (g.game?.publishers ?? []).join(", "),
        summary: g.game?.summary ?? "",
      });
    } catch (err) {
      onError(err);
    }
  }

  async function handleDeleteGame(id: string, name: string) {
    if (!confirm(`Remover "${name}" da biblioteca?`)) return;
    try {
      await api.deleteGame(id);
      notify("ok", "Jogo removido (DELETE)");
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyGameForm);
      }
      await Promise.all([loadGames(), loadLists()]);
    } catch (err) {
      onError(err);
    }
  }

  /* ---------- list ↔ game membership ---------- */

  function memberLists(g: Game): GameList[] {
    const ids = new Set(g.listIds ?? []);
    return lists.filter((l) => ids.has(l._id));
  }

  async function addOrCopy(g: Game, listId: string, mode: "add" | "copy") {
    if (!listId) return;
    try {
      await api.addGameToList(g._id, listId);
      notify("ok", mode === "copy" ? `Copiado para a lista` : "Adicionado à lista");
      await Promise.all([loadGames(), loadLists()]);
    } catch (err) {
      onError(err);
    }
  }

  async function move(g: Game, listId: string) {
    if (!listId) return;
    try {
      for (const l of memberLists(g)) {
        if (l._id !== listId) await api.removeGameFromList(g._id, l._id);
      }
      await api.addGameToList(g._id, listId);
      notify("ok", "Jogo movido de lista");
      await Promise.all([loadGames(), loadLists()]);
    } catch (err) {
      onError(err);
    }
  }

  async function removeFromList(g: Game, listId: string) {
    try {
      await api.removeGameFromList(g._id, listId);
      notify("ok", "Removido da lista");
      await Promise.all([loadGames(), loadLists()]);
    } catch (err) {
      onError(err);
    }
  }

  /* ---------- render ---------- */

  const gameRowProps = {
    lists,
    memberLists,
    onAddOrCopy: addOrCopy,
    onMove: move,
    onRemoveFromList: removeFromList,
    onView: openGame,
    onEdit: startEdit,
    onDelete: handleDeleteGame,
  };

  if (checking) return <p className={mutedCls}>Verificando sessão…</p>;

  if (!user) {
    return (
      <AuthForm
        authMode={authMode}
        setAuthMode={setAuthMode}
        form={auth}
        setForm={setAuth}
        onSubmit={handleAuth}
        message={message}
      />
    );
  }

  if (view === "dashboard") {
    return (
      <main className={mainCls}>
        <Header title="Save State — Dashboard">
          <BackButton onClick={goHome} />
        </Header>
        {message && <Message message={message} />}
        <Dashboard />
      </main>
    );
  }

  if (view === "detail") {
    return (
      <GameDetail
        detail={detail}
        memberLists={memberLists}
        onBack={() => setView("home")}
        onEdit={(id) => startEdit(id).then(() => setView("home"))}
        onDelete={handleDeleteGame}
        message={message}
      />
    );
  }

  if (view === "list") {
    const activeList = lists.find((l) => l._id === activeListId);
    return (
      <main className={mainCls}>
        <Header title="Save State — Test Console">
          <BackButton onClick={goHome} />
        </Header>
        {message && <Message message={message} />}
        <section>
          <h2 className="text-base font-bold">
            Jogos da lista: {activeList?.name ?? "?"}
          </h2>
          {games.length === 0 && (
            <p className={mutedCls}>Nenhum jogo nesta lista.</p>
          )}
          <GameRowList
            games={games}
            {...gameRowProps}
            targets={targets}
            setTargets={setTargets}
          />
        </section>
      </main>
    );
  }

  return (
    <main className={mainCls}>
      <Header title="Save State — Test Console">
        <HeaderUser name={user.name} email={user.email} />
        <button className={btn} onClick={() => setView("dashboard")}>
          Dashboard
        </button>
        <button className={btn} onClick={handleLogout}>
          Logout
        </button>
      </Header>

      {message && <Message message={message} />}

      <ListsSection
        lists={lists}
        activeListId={activeListId}
        newListName={newListName}
        setNewListName={setNewListName}
        renaming={renaming}
        setRenaming={setRenaming}
        onCreateList={handleCreateList}
        onRenameList={handleRenameList}
        onDeleteList={handleDeleteList}
        onSelectAll={() => setActiveListId("")}
        onSelectList={(id) => setActiveListId(id)}
        onOpenList={openList}
      />

      <GameForm
        editingId={editingId}
        form={form}
        setForm={setForm}
        activeListId={activeListId}
        activeListName={lists.find((l) => l._id === activeListId)?.name}
        onSubmit={handleCreateOrUpdate}
        onCancelEdit={() => {
          setEditingId(null);
          setForm(emptyGameForm);
        }}
      />

      <section>
        <h2 className="text-base font-bold">
          Biblioteca{" "}
          {activeListId &&
            `— lista: ${lists.find((l) => l._id === activeListId)?.name ?? "?"}`}
        </h2>
        {games.length === 0 && <p className={mutedCls}>Nenhum jogo encontrado.</p>}
        <GameRowList
          games={games}
          {...gameRowProps}
          targets={targets}
          setTargets={setTargets}
        />
      </section>
    </main>
  );
}

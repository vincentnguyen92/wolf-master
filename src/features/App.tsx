"use client";
import { Home } from "./Home";
import { useEffect, useRef, useState } from "react";
import { Moon } from "lucide-react";
import { defaultSettings, type Game, type GameConfig } from "../domain/types";
import { createGame, execute, type Command } from "../engine/engine";
import { replay } from "../events/replay";
import { deleteGame, loadGames, saveGame } from "../storage/db";
import { removeDraftJournal } from "../storage/draft";
import { demoConfig } from "../lib/demo";
import { rematchConfig } from "../lib/rematch";
import { GameButton } from "../components/ui";
import { SetupWizard } from "./SetupWizard";
import { Gameplay } from "./Gameplay";
import { Summary } from "./Summary";
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function App() {
  const [games, setGames] = useState<Game[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [offlineReady, setOfflineReady] = useState(false),
    [offline, setOffline] = useState(false),
    [install, setInstall] = useState<InstallPrompt | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    let alive = true;
    loadGames()
      .then((data) => {
        if (alive) {
          setGames(data);
          setSelected(sessionStorage.getItem("lang-trang-current"));
          setReady(true);
        }
      })
      .catch((e) => {
        setError(`Không mở được dữ liệu: ${(e as Error).message}`);
        setReady(true);
      });
    const connection = () => setOffline(!navigator.onLine);
    connection();
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", prompt);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          if (alive) setOfflineReady(true);
        })
        .catch((e) =>
          setError(`Chưa chuẩn bị được offline: ${(e as Error).message}`),
        );
    }
    return () => {
      alive = false;
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  const select = (id: string | null) => {
    setSelected(id);
    if (id) sessionStorage.setItem("lang-trang-current", id);
    else sessionStorage.removeItem("lang-trang-current");
    setError("");
  };
  const persist = async (next: Game) => {
    await saveGame(next);
    setGames((current) => [next, ...current.filter((g) => g.id !== next.id)]);
  };
  const run = async (work: () => Promise<void>): Promise<boolean> => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const game = games.find((g) => g.id === selected),
    state = game ? replay(game.events) : undefined;
  const command = (c: Command) =>
    run(async () => {
      if (!game) throw new Error("Không tìm thấy ván.");
      await persist(execute(game, c));
    });
  const saveSetup = (config: GameConfig) =>
    run(async () => {
      if (!game) return;
      await persist(execute(game, { type: "setup", config }));
    });
  const startSetup = async (config: GameConfig) => {
    await run(async () => {
      if (!game) return;
      const updated = execute(game, { type: "setup", config });
      await persist(updated);
      await persist(execute(updated, { type: "start" }));
    });
  };
  const defaultName = () =>
    `Làng Trăng · ${new Date().toLocaleDateString("vi-VN")}`;
  const newGame = (demo = false) =>
    void run(async () => {
      let g = createGame(
        demo
          ? demoConfig()
          : {
              name: defaultName(),
              players: [],
              settings: { ...defaultSettings },
            },
      );
      await persist(g);
      if (demo) {
        g = execute(g, { type: "start" });
        await persist(g);
      }
      select(g.id);
    });
  const removeGame = (id: string) =>
    void run(async () => {
      await deleteGame(id);
      removeDraftJournal(id);
      setGames((current) => current.filter((g) => g.id !== id));
      if (sessionStorage.getItem("lang-trang-current") === id)
        sessionStorage.removeItem("lang-trang-current");
    });
  const rematch = () =>
    void run(async () => {
      if (!state) throw new Error("Không tìm thấy ván.");
      const g = createGame(rematchConfig(state, defaultName()));
      await persist(g);
      select(g.id);
    });
  const home = () => select(null);
  if (!ready)
    return (
      <main className="loading">
        <Moon size={36} />
        <h1>Thắp đèn cho ngôi làng…</h1>
      </main>
    );
  const active = games.filter((g) => replay(g.events).phase !== "ended"),
    completed = games.filter((g) => replay(g.events).phase === "ended");
  return (
    <>
      {error && (
        <div className="global-error" role="alert">
          <strong>Chưa thể hoàn tất thao tác</strong>
          <p>{error}</p>
          <GameButton variant="secondary" onClick={() => setError("")}>
            Đóng thông báo
          </GameButton>
        </div>
      )}
      {game && state ? (
        state.phase === "setup" ? (
          <SetupWizard
            key={game.id}
            gameId={game.id}
            config={{
              name: state.name,
              players: state.players,
              settings: state.settings,
            }}
            onSave={saveSetup}
            onStart={startSetup}
            busy={busy}
            onHome={home}
          />
        ) : state.phase === "ended" ? (
          <Summary
            game={game}
            state={state}
            onHome={home}
            onUndo={() => void command({ type: "undo" })}
            onRematch={rematch}
            busy={busy}
          />
        ) : (
          <Gameplay
            game={game}
            state={state}
            onCommand={command}
            onHome={home}
            busy={busy}
          />
        )
      ) : (
        <Home
          active={active}
          completed={completed}
          offline={offline}
          offlineReady={offlineReady}
          busy={busy}
          canInstall={!!install}
          onInstall={async () => {
            if (!install) return;
            await install.prompt();
            await install.userChoice;
            setInstall(null);
          }}
          onCreate={newGame}
          onSelect={select}
          onDelete={removeGame}
        />
      )}
    </>
  );
}

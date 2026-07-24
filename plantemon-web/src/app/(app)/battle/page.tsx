"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { BackButton } from "@/components/back-button";
import { useGarden } from "@/components/garden-provider";
import {
  type Battle,
  createBattle,
  getBattleSession,
  hasResumableBattle,
  pickOpponentPlant,
  setBattleSession,
} from "@/lib/client/battle-session";
import { HealAction } from "@/lib/domain/heal-action";
import type { Plant } from "@/lib/domain/plant";
import { BattleState, type Action } from "@/lib/domain/types";

/** Delay between battle-log lines, from displayTurnResults. */
const LOG_LINE_MS = 1500;

/**
 * Adventure flow:
 *   - Resume the battle in progress, or start a new one.
 *   - Starting new: pick which Plantemon to fight with (the select card).
 *   - A new battle clones both plants at full health, so it's always a fresh
 *     session and the garden's real plants are never damaged. The opponent is a
 *     random plant that isn't the one the player chose.
 */
type Phase = "resume" | "select" | "fighting";

export default function BattlePage() {
  const { garden, ready } = useGarden();

  // Decided once at mount: offer resume when a battle is still in progress,
  // otherwise go straight to plant selection.
  const [phase, setPhase] = useState<Phase>(() => (hasResumableBattle() ? "resume" : "select"));
  const [battle, setBattle] = useState<Battle | null>(() => getBattleSession());

  const startBattle = useCallback(
    (chosen: Plant) => {
      const next = createBattle(chosen, pickOpponentPlant(garden, chosen));
      setBattleSession(next);
      setBattle(next);
      setPhase("fighting");
    },
    [garden],
  );

  const leaveToSelect = useCallback(() => {
    setBattleSession(null);
    setBattle(null);
    setPhase("select");
  }, []);

  // This is the one battle state that is server-rendered then hydrated, so it
  // stays minimal — the richer Centered layout triggered a hydration abort here.
  if (!ready) {
    return (
      <main
        className="screen flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: "url(/img/bg_battle.jpg)" }}
      >
        <p className="pixel-panel font-pixel px-4 py-3 text-xs">Loading…</p>
      </main>
    );
  }

  if (garden.length === 0) {
    return (
      <Centered>
        <p className="leading-relaxed">You need at least one plant to battle.</p>
        <a href="/scan" className="press pixel-button mt-4 inline-block px-3 py-2 text-[9px]">
          Scan a plant
        </a>
      </Centered>
    );
  }

  if (phase === "resume" && battle) {
    return (
      <ResumeOrNew onResume={() => setPhase("fighting")} onNew={leaveToSelect} />
    );
  }

  if (phase === "fighting" && battle) {
    return <BattleScreen battle={battle} onNewBattle={leaveToSelect} />;
  }

  return <SelectPlant garden={garden} onSelect={startBattle} />;
}

/** Offered when a battle is still in progress on re-entry. */
function ResumeOrNew({ onResume, onNew }: { onResume: () => void; onNew: () => void }) {
  return (
    <Centered>
      <p className="font-pixel text-[11px] leading-relaxed">Battle in progress</p>
      <p className="mt-2 text-[10px] leading-relaxed opacity-80">
        Pick up where you left off, or start a fresh fight.
      </p>
      <button
        type="button"
        onClick={onResume}
        style={{ background: "var(--color-hp-high)", color: "#fff" }}
        className="press pixel-button mt-4 w-full px-2 py-2 text-[9px]"
      >
        Resume battle
      </button>
      <button
        type="button"
        onClick={onNew}
        className="press pixel-button mt-2 w-full px-2 py-2 text-[9px]"
      >
        New battle
      </button>
    </Centered>
  );
}

/** The pre-battle card: choose which Plantemon to send in. */
function SelectPlant({ garden, onSelect }: { garden: Plant[]; onSelect: (plant: Plant) => void }) {
  return (
    <main
      className="screen flex flex-col bg-cover bg-center"
      style={{ backgroundImage: "url(/img/bg_battle.jpg)" }}
    >
      <div className="safe-top flex items-center px-3">
        <BackButton />
      </div>

      <h1 className="font-pixel text-outline px-4 text-center text-sm text-white">
        Choose your Plantemon
      </h1>

      <div className="safe-bottom grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-4">
        {garden.map((plant) => (
          <button
            key={plant.id}
            type="button"
            onClick={() => onSelect(plant)}
            className="press pixel-panel flex flex-col items-center gap-1 p-3"
          >
            {plant.spritePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={plant.spritePath} alt="" className="pixelated h-20 w-20 object-contain" />
            ) : (
              <Image src="/img/ic_pot_empty.png" alt="" width={80} height={80} className="h-20 w-20" />
            )}
            <span className="font-pixel max-w-full truncate text-[9px]">{plant.getName()}</span>
            <span className="text-[9px] opacity-70">
              HP {plant.getMaxHealth()} · SPD {plant.getSpeed()}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}

function BattleScreen({ battle, onNewBattle }: { battle: Battle; onNewBattle: () => void }) {
  // The battle model mutates in place, so `version` is what actually drives
  // re-renders — the role updateUI() played in the Android activity.
  const [, setVersion] = useState(0);
  const [log, setLog] = useState("Choose a move!");
  const [showingSpecial, setShowingSpecial] = useState(false);
  const [locked, setLocked] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // Cancel pending log timers if the player leaves mid-turn.
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => timeouts.forEach(clearTimeout);
  }, []);

  const playAction = useCallback(
    (action: Action) => {
      if (battle.handler.getState() !== BattleState.P1_MOVE) return;

      setLocked(true);
      battle.handler.applyAction(battle.player, action);

      const results = [...battle.handler.getLatestTurnResults()];
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];

      results.forEach((line, index) => {
        timeoutsRef.current.push(
          setTimeout(() => {
            setLog(line);
            refresh();
          }, index * LOG_LINE_MS),
        );
      });

      timeoutsRef.current.push(
        setTimeout(() => {
          const state = battle.handler.getState();
          if (state === BattleState.P1_MOVE) {
            setLocked(false);
            setLog("Choose a move!");
          } else if (state === BattleState.END) {
            setLog("Battle Over!");
          }
          refresh();
        }, results.length * LOG_LINE_MS),
      );
    },
    [battle, refresh],
  );

  const playerPlant = battle.player.getCurrentPlant();
  const opponentPlant = battle.opponent.getCurrentPlant();
  if (!playerPlant || !opponentPlant) return <Centered>Preparing battle…</Centered>;

  const moves = playerPlant.getMoves();
  const ended = battle.handler.getState() === BattleState.END;
  const healAmount = HealAction.calculateHealAmount(playerPlant);
  const healsLeft = battle.player.getRemainingHeals();

  return (
    <main className="screen flex flex-col">
      <Image src="/img/bg_battle.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />

      <div className="safe-top flex items-center px-3">
        <BackButton />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2 px-3 py-2">
        <Combatant
          name={battle.opponent.getUsername()}
          plantName={opponentPlant.getName()}
          current={opponentPlant.getCurrentHealth()}
          max={opponentPlant.getMaxHealth()}
          sprite={opponentPlant.spritePath}
          align="end"
        />

        <p className="pixel-panel font-pixel mx-auto max-w-xs px-3 py-3 text-center text-[9px] leading-relaxed">
          {log}
        </p>

        <Combatant
          name={battle.player.getUsername()}
          plantName={playerPlant.getName()}
          current={playerPlant.getCurrentHealth()}
          max={playerPlant.getMaxHealth()}
          sprite={playerPlant.spritePath}
          align="start"
        />
      </div>

      <div className="safe-bottom px-4 pt-2">
        <div className="grid grid-cols-2 gap-2">
          {showingSpecial ? (
            <>
              <button
                type="button"
                disabled={locked || ended || healsLeft <= 0}
                onClick={() => playAction(new HealAction())}
                className="press pixel-button px-2 py-3 text-[8px]"
              >
                Heal ({healAmount} HP) x{healsLeft}
              </button>
              <button type="button" disabled className="pixel-button px-2 py-3 text-[8px]">
                Switch (N/A)
              </button>
            </>
          ) : (
            moves.slice(0, 4).map((move, index) => (
              <button
                key={`${move.getName()}-${index}`}
                type="button"
                disabled={locked || ended}
                onClick={() => playAction(move)}
                className="press pixel-button px-2 py-3 text-[8px] leading-tight"
              >
                {move.getName()}
              </button>
            ))
          )}
        </div>

        {ended ? (
          <button
            type="button"
            onClick={onNewBattle}
            style={{ background: "var(--color-hp-high)", color: "#fff" }}
            className="press pixel-button mt-2 w-full px-2 py-3 text-[8px]"
          >
            New battle
          </button>
        ) : (
          <button
            type="button"
            disabled={locked}
            onClick={() => setShowingSpecial((s) => !s)}
            className="press pixel-button mt-2 w-full px-2 py-3 text-[8px]"
          >
            {showingSpecial ? "Back to Moves" : "Use Special"}
          </button>
        )}
      </div>
    </main>
  );
}

function Combatant({
  name,
  plantName,
  current,
  max,
  sprite,
  align,
}: {
  name: string;
  plantName: string;
  current: number;
  max: number;
  sprite: string | null;
  align: "start" | "end";
}) {
  const ratio = max > 0 ? current / max : 0;
  // Green above 50%, amber above 20%, red below — standard HP-bar banding.
  const barColor = ratio > 0.5 ? "bg-hp-high" : ratio > 0.2 ? "bg-hp-mid" : "bg-hp-low";

  return (
    <section className={`flex items-center gap-3 ${align === "end" ? "flex-row-reverse" : ""}`}>
      {sprite ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sprite} alt="" className="pixelated h-28 w-28 shrink-0 object-contain sm:h-32 sm:w-32" />
      ) : (
        <Image src="/img/ic_pot_empty.png" alt="" width={128} height={128} className="h-28 w-28 sm:h-32 sm:w-32" />
      )}

      <div className="pixel-panel min-w-0 flex-1 px-3 py-2">
        <p className="font-pixel truncate text-[8px] opacity-70">{name}</p>
        <p className="font-pixel mt-1 truncate text-[10px]">{plantName}</p>
        <div className="mt-2 h-3.5 w-full border-2 border-black bg-white">
          <div
            className={`h-full ${barColor} transition-[width] duration-300`}
            style={{ width: `${Math.max(0, ratio) * 100}%` }}
          />
        </div>
        <p className="font-pixel mt-1.5 text-[8px]">
          HP: {current}/{max}
        </p>
      </div>
    </section>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  // CSS background rather than a fill <Image>: this render is SSR'd then
  // hydrated, and a fill <Image> here produced a hydration mismatch that
  // aborted the whole route.
  return (
    <main
      className="screen flex flex-col bg-cover bg-center"
      style={{ backgroundImage: "url(/img/bg_battle.jpg)" }}
    >
      <div className="safe-top px-3">
        <BackButton />
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="pixel-panel w-full max-w-xs p-4 text-center text-xs leading-relaxed">
          {children}
        </div>
      </div>
    </main>
  );
}

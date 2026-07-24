"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { BackButton } from "@/components/back-button";
import { useGarden } from "@/components/garden-provider";
import { BattleHandler } from "@/lib/domain/battle-handler";
import { BotController, HumanController } from "@/lib/domain/controllers";
import { HealAction } from "@/lib/domain/heal-action";
import { Plant } from "@/lib/domain/plant";
import { Player } from "@/lib/domain/player";
import { randomInt } from "@/lib/domain/rng";
import { BattleState, type Action } from "@/lib/domain/types";

/**
 * Port of ui/BattleActivity.java + layout/activity_battle.xml.
 *
 * The battle model mutates Plant and Player in place, so React cannot see
 * changes by identity. A version counter is bumped after every mutation to
 * force a re-render — the same role updateUI() played in the activity.
 */

/** Delay between battle-log lines, from displayTurnResults. */
const LOG_LINE_MS = 1500;

interface Battle {
  player: Player;
  opponent: Player;
  handler: BattleHandler;
}

/** Port of setupBattle(): the bot mirrors the player's own garden. */
function createBattle(garden: Plant[]): Battle {
  const player = new Player("You", garden);
  const opponent = new Player("Gary (BOT)", garden.map((plant) => Plant.copyOf(plant)));

  player.setCurrentPlant(player.getGarden()[randomInt(player.getGarden().length)]);
  opponent.setCurrentPlant(opponent.getGarden()[randomInt(opponent.getGarden().length)]);

  return {
    player,
    opponent,
    handler: new BattleHandler(player, opponent, new HumanController(), new BotController()),
  };
}

/**
 * Gates on the garden loading, then hands off to BattleScreen. Splitting here
 * lets the battle be built in a lazy useState initializer — it runs exactly
 * once, with no effect and no restart-in-progress guard.
 */
export default function BattlePage() {
  const { garden, ready } = useGarden();

  // Deliberately a minimal, self-contained render. This is the one battle
  // state that is server-rendered and then hydrated, and the richer Centered
  // layout triggered a hydration abort here. The other states below only ever
  // render on the client, so they safely reuse Centered.
  if (!ready)
    return (
      <main
        className="screen flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: "url(/img/bg_battle.jpg)" }}
      >
        <p className="pixel-panel font-pixel px-4 py-3 text-xs">Loading…</p>
      </main>
    );

  if (garden.length === 0) {
    return (
      <Centered>
        <p className="leading-relaxed">You need at least one plant to battle.</p>
        <Link href="/scan" className="press pixel-button mt-4 inline-block px-3 py-2 text-[9px]">
          Scan a plant
        </Link>
      </Centered>
    );
  }

  return <BattleScreen garden={garden} />;
}

function BattleScreen({ garden }: { garden: Plant[] }) {
  // Built once on mount. The battle model then mutates in place, so `version`
  // is what actually drives re-renders — the role updateUI() played.
  const [battle] = useState<Battle>(() => createBattle(garden));
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

      // Replay the turn log one line at a time, as displayTurnResults did.
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

      {/*
        Arena fills all the space between the header and the controls, with the
        opponent pinned to the top, the player to the bottom, and the log
        centred — so there is no dead gap in the middle.
      */}
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

      {/* Move buttons */}
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

        <button
          type="button"
          disabled={locked || ended}
          onClick={() => setShowingSpecial((s) => !s)}
          className="press pixel-button mt-2 w-full px-2 py-3 text-[8px]"
        >
          {showingSpecial ? "Back to Moves" : "Use Special"}
        </button>

        {ended && (
          <Link
            href="/home"
            className="press pixel-button mt-2 block w-full px-2 py-3 text-center text-[8px]"
          >
            Leave battle
          </Link>
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
    <section
      className={`flex items-center gap-3 ${align === "end" ? "flex-row-reverse" : ""}`}
    >
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
  // Uses a CSS background rather than a fill <Image>. This render is server-side
  // rendered and then hydrated (unlike the main battle UI, which only ever
  // renders on the client), and a fill <Image> here produced a hydration
  // mismatch that aborted the whole route. A background-image sidesteps it.
  return (
    <main
      className="screen flex flex-col bg-cover bg-center"
      style={{ backgroundImage: "url(/img/bg_battle.jpg)" }}
    >
      <div className="safe-top px-3">
        <BackButton />
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="pixel-panel p-4 text-center text-xs leading-relaxed">{children}</div>
      </div>
    </main>
  );
}

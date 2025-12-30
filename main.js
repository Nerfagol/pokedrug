import { makeSupabase, fetchTop, insertEntry } from "./app/supabase.js";
import {
  $,
  setView,
  openRulesModal,
  openLeaderboardModal,
  renderLeaderboardTbody,
} from "./app/ui.js";
import { makeGameController } from "./app/game.js";
import { makeSubmitModal } from "./app/modals.js";

const supabase = makeSupabase();

const views = {
  welcome: $("welcomeView"),
  game: $("gameView"),
  leaderboard: $("leaderboardView"),
};

async function loadTop10() {
  const setLoading = (_metaId, bodyId) => {
    const body = $(bodyId);
    if (body)
      body.innerHTML = `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">…</td></tr>`;
  };

  setLoading("lbMeta", "lbTableBody");
  setLoading("lbMeta2", "lbTableBody2");

  const { data, error } = await fetchTop(supabase, 10);
  if (error) {
    if ($("lbMeta")) $("lbMeta").textContent = `Ошибка: ${error.message}`;
    if ($("lbMeta2")) $("lbMeta2").textContent = `Ошибка: ${error.message}`;
    if ($("lbTableBody"))
      $("lbTableBody").innerHTML = `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">Проверь RLS (SELECT для anon).</td></tr>`;
    if ($("lbTableBody2"))
      $("lbTableBody2").innerHTML = `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">Проверь RLS (SELECT для anon).</td></tr>`;
    return;
  }

  renderLeaderboardTbody($("lbTableBody"), $("lbMeta"), data);
  renderLeaderboardTbody($("lbTableBody2"), $("lbMeta2"), data);
}

const openSubmitModal = makeSubmitModal();

const game = makeGameController({
  setView: (name) => setView(views, name),
  loadTop10,
  openSubmitModal,
  insertEntry: (payload) => insertEntry(supabase, payload),
});

// Wire up
const bind = (id, handler) => {
  const el = $(id);
  if (el) el.addEventListener("click", handler);
};

bind("startBtn", game.startGame);
bind("restartBtn", game.restartGame);
bind("pokemonBtn", () => game.answer("pokemon"));
bind("drugBtn", () => game.answer("drug"));
bind("skipBtn", game.skip);
bind("submitBtn", game.submitFlow);

bind("showRulesBtn", openRulesModal);
bind("rulesBtnTop", openRulesModal);
bind("leaderboardRulesBtn", openRulesModal);

bind("lbBtnTop", () =>
  openLeaderboardModal({ fetchTop: () => fetchTop(supabase, 10) })
);

bind("refreshLbBtn", loadTop10);
bind("refreshLbBtn2", loadTop10);

bind("playAgainBtn", () => setView(views, "welcome"));

// init (важно: ждём init(), чтобы любые async-штуки не роняли остальной UI)
setView(views, "welcome");

(async () => {
  try {
    await game.init();
  } catch (e) {
    console.error(e);
    // UI всё равно должен жить
  } finally {
    loadTop10();
  }
})();

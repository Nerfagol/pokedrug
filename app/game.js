import { CONFIG } from "./config.js";
import { POKEMON } from "../data/pokemon.js";
import { DRUGS } from "../data/drugs.js";
import { buildProfile } from "./profiles.js";
import { $, pct, pctNum, normalizeNick, renderSegments } from "./ui.js";

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(maxQ) {
  const pool = [
    ...POKEMON.map((n) => ({ name: n, type: "pokemon" })),
    ...DRUGS.map((n) => ({ name: n, type: "drug" })),
  ];
  shuffle(pool);
  if (pool.length >= maxQ) return pool.slice(0, maxQ);
  const deck = [...pool];
  while (deck.length < maxQ) deck.push(pool[Math.floor(Math.random() * pool.length)]);
  return shuffle(deck);
}

function withCacheBuster(url) {
  const sep = url.includes("?") ? "&" : "?";
  return url + sep + "t=" + Date.now();
}

function pubChem2DRecordPngByName(drugName, size = "500x500") {
  return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
    drugName
  )}/record/PNG?record_type=2d&image_size=${encodeURIComponent(size)}`;
}

async function pokemonArtworkUrl(pokemonName) {
  const r = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemonName.toLowerCase())}`
  );
  if (!r.ok) return "";
  const j = await r.json();
  return j?.sprites?.other?.["official-artwork"]?.front_default || "";
}

async function resolveImageUrl(item) {
  if (item.type === "pokemon") return await pokemonArtworkUrl(item.name);
  return pubChem2DRecordPngByName(item.name, "500x500");
}

function resetImage() {
  const img = $("cardImage");
  img.style.display = "none";
  img.src = "";
  img.alt = "";
  img.onload = null;
  img.onerror = null;
}

async function revealImage(item) {
  const img = $("cardImage");
  resetImage();
  img.referrerPolicy = "no-referrer";

  const setAndShow = (url, alt) =>
    new Promise((resolve) => {
      img.alt = alt;
      img.onload = () => {
        img.style.display = "block";
        resolve(true);
      };
      img.onerror = () => {
        img.style.display = "none";
        resolve(false);
      };
      img.src = url;
    });

  try {
    const url = await resolveImageUrl(item);
    if (!url) return false;
    return await setAndShow(
      withCacheBuster(url),
      item.type === "pokemon" ? "Покемон" : "Структурная формула (PubChem)"
    );
  } catch {
    return false;
  }
}

export function makeGameController({ setView, loadTop10, openSubmitModal, insertEntry }) {
  const state = {
    phase: "welcome",
    mode: "question",
    maxQuestions: CONFIG.TOTAL_Q,
    indexShown: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    bestStreak: 0,
    streak: 0,
    current: null,
    deck: [],
    locked: false,
    autoNextTimer: null,
    lastSubmitAt: 0,
    outcomes: Array(CONFIG.TOTAL_Q).fill(""),
    byType: {
      pokemon: { correct: 0, total: 0 },
      drug: { correct: 0, total: 0 },
    },
  };

  const answeredTotal = () => state.correct + state.wrong + state.skipped;

  function clearFeedbackClasses() {
    $("pokemonBtn").classList.remove("correct", "wrong", "reveal");
    $("drugBtn").classList.remove("correct", "wrong", "reveal");
  }

  function showStatus(t) {
    $("status").textContent = t || "";
  }

  function showLbStatus(t) {
    $("lbStatus").textContent = t || "";
  }

  function setButtonsEnabled() {
    const isQuestion = state.phase === "game" && state.mode === "question";
    $("pokemonBtn").disabled = !isQuestion;
    $("drugBtn").disabled = !isQuestion;
    $("skipBtn").disabled = !isQuestion;
    $("submitBtn").disabled = !(state.phase === "game" && answeredTotal() >= CONFIG.MIN_SUBMIT_Q);
  }

  function renderStats() {
    $("stCorrect").textContent = String(state.correct);
    $("stWrong").textContent = String(state.wrong);
    $("stSkip").textContent = String(state.skipped);
    $("stAcc").textContent = pct(state.correct, answeredTotal());
  }

  function renderProgress() {
    $("barLeft").textContent = `${state.indexShown} / ${state.maxQuestions}`;
    $("barRight").textContent = `auto-next ${Math.round(CONFIG.AUTO_NEXT_MS / 1000)}s`;
    renderSegments($("segments"), state.outcomes);
    renderStats();
  }

  function clearAutoNext() {
    if (state.autoNextTimer) {
      clearTimeout(state.autoNextTimer);
      state.autoNextTimer = null;
    }
  }

  function scheduleAutoNext() {
    clearAutoNext();
    state.autoNextTimer = setTimeout(() => {
      state.autoNextTimer = null;
      if (state.phase === "game" && state.mode === "feedback") nextCard();
    }, CONFIG.AUTO_NEXT_MS);
  }

  function showCard(item) {
    state.current = item;
    $("cardName").textContent = item.name;
    $("cardHint").textContent = "Покемон или лекарство?";
    resetImage();
    clearFeedbackClasses();
    showStatus("");
  }

  function nextCard() {
    clearAutoNext();

    if (state.indexShown >= state.maxQuestions) {
      state.mode = "question";
      $("cardName").textContent = "Done";
      $("cardHint").textContent = `Сыграно: ${answeredTotal()}. Можно Submit (если ≥ ${CONFIG.MIN_SUBMIT_Q}) или Restart.`;
      resetImage();
      clearFeedbackClasses();
      setButtonsEnabled();
      renderProgress();
      return;
    }

    const item = state.deck[state.indexShown];
    state.indexShown += 1;
    state.mode = "question";
    showCard(item);
    setButtonsEnabled();
    renderProgress();
  }

  function startGame() {
    state.phase = "game";
    state.mode = "question";
    state.maxQuestions = CONFIG.TOTAL_Q;

    state.indexShown = 0;
    state.correct = 0;
    state.wrong = 0;
    state.skipped = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.outcomes = Array(CONFIG.TOTAL_Q).fill("");
    state.byType = {
      pokemon: { correct: 0, total: 0 },
      drug: { correct: 0, total: 0 },
    };

    state.deck = buildDeck(state.maxQuestions);
    state.current = null;
    state.locked = false;

    setView("game");
    setButtonsEnabled();
    renderProgress();
    nextCard();
  }

  function restartGame() {
    clearAutoNext();
    startGame();
  }

  function markFeedback(correct, truthType, chosenType) {
    const chosenBtn = chosenType === "pokemon" ? $("pokemonBtn") : $("drugBtn");
    chosenBtn.classList.add(correct ? "correct" : "wrong");

    const truthBtn = truthType === "pokemon" ? $("pokemonBtn") : $("drugBtn");
    truthBtn.classList.add("reveal");
    if (!correct) truthBtn.classList.add("correct");
  }

  async function answer(choiceType) {
    if (state.phase !== "game" || state.mode !== "question" || state.locked) return;
    if (!state.current) return;
    state.locked = true;

    const truth = state.current.type;
    const ok = choiceType === truth;

    state.byType[truth].total += 1;
    if (ok) state.byType[truth].correct += 1;

    if (ok) {
      state.correct += 1;
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      showStatus("✅ Верно!");
    } else {
      state.wrong += 1;
      state.streak = 0;
      showStatus(`❌ Нет — это ${truth === "pokemon" ? "покемон" : "лекарство"}.`);
    }

    const idx = state.indexShown - 1;
    state.outcomes[idx] = ok ? "correct" : "wrong";

    state.mode = "feedback";
    markFeedback(ok, truth, choiceType);
    setButtonsEnabled();
    renderProgress();

    await revealImage(state.current);

    $("cardHint").textContent = `Следующий через ${Math.round(CONFIG.AUTO_NEXT_MS / 1000)} сек…`;
    scheduleAutoNext();

    state.locked = false;
  }

  function skip() {
    if (state.phase !== "game" || state.mode !== "question" || state.locked) return;
    state.locked = true;

    state.skipped += 1;
    state.streak = 0;

    const idx = state.indexShown - 1;
    state.outcomes[idx] = "skip";

    state.mode = "feedback";
    clearFeedbackClasses();
    resetImage();
    showStatus("⏭️ Пропуск.");
    setButtonsEnabled();
    renderProgress();

    $("cardHint").textContent = `Следующий через ${Math.round(CONFIG.AUTO_NEXT_MS / 1000)} сек…`;
    scheduleAutoNext();

    state.locked = false;
  }

  async function submitFlow() {
    if (answeredTotal() < CONFIG.MIN_SUBMIT_Q) {
      showStatus(`Нужно минимум ${CONFIG.MIN_SUBMIT_Q} сыгранных вопросов.`);
      return;
    }

    const now = Date.now();
    if (now - state.lastSubmitAt < 1500) {
      showStatus("⏳ Подожди секунду и нажми Submit ещё раз.");
      return;
    }
    state.lastSubmitAt = now;

    const total = answeredTotal();
    const accTotal = pct(state.correct, total);
    const accDrug = pctNum(state.byType.drug.correct, state.byType.drug.total);
    const accPokemon = pctNum(state.byType.pokemon.correct, state.byType.pokemon.total);
    const profile = buildProfile({ accDrug, accPokemon });

    openSubmitModal({
      stats: {
        correct: state.correct,
        wrong: state.wrong,
        skipped: state.skipped,
        accTotal,
        accDrug,
        accPokemon,
        drugCorrect: state.byType.drug.correct,
        drugTotal: state.byType.drug.total,
        pokemonCorrect: state.byType.pokemon.correct,
        pokemonTotal: state.byType.pokemon.total,
        profileMessage: profile.message,
      },
      onSubmit: async (nickname, msgEl) => {
        const answered = answeredTotal();
        const accuracy = answered ? state.correct / answered : 0;

        const payload = {
          nickname: normalizeNick(nickname),
          score: state.correct,
          answered,
          accuracy,
          max_streak: state.bestStreak,
          user_agent: navigator.userAgent,
          acc_drug: accDrug ?? null,
          acc_pokemon: accPokemon ?? null,
        };

        const { error } = await insertEntry(payload);
        if (error) {
          msgEl.textContent = `❌ Ошибка: ${error.message}`;
          return;
        }

        msgEl.textContent = "✅ Готово. Открываю лидерборд…";
        await loadTop10();
        setView("leaderboard");
        showLbStatus(
          `Submitted: score=${payload.score}, answered=${payload.answered}, acc=${Math.round(
            payload.accuracy * 100
          )}%`
        );
        setTimeout(() => {
          const ov = document.querySelector(".overlay");
          if (ov) ov.remove();
        }, 350);
      },
    });
  }

  function init() {
    setView("welcome");
    setButtonsEnabled();
    renderProgress();
  }

  return {
    init,
    startGame,
    restartGame,
    answer,
    skip,
    submitFlow,
  };
}

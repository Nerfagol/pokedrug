import { CONFIG } from "./config.js";
import { POKEMON } from "../data/pokemon.js";
// drugs.json is fetched dynamically (GitHub Pages friendly)
import { buildProfile } from "./profiles.js";
import { $, pct, pctNum, normalizeNick, renderSegments } from "./ui.js";

let DRUGS = [];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function loadDrugs() {
  const url = new URL("../data/drugs.json", import.meta.url);
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`Failed to load drugs.json: ${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data)) throw new Error("drugs.json must be an array");
  DRUGS = data;
}

function buildDeck(maxQ) {
  const pool = [
    ...POKEMON.map((n) => ({ name: n, type: "pokemon", payload: null })),
    ...DRUGS.map((d) => ({ name: d.brand, type: "drug", payload: d })),
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

async function pokemonArtworkUrl(pokemonName) {
  const r = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemonName.toLowerCase())}`
  );
  if (!r.ok) return "";
  const j = await r.json();
  return j?.sprites?.other?.["official-artwork"]?.front_default || "";
}
function pubchem2dPngByCid(cid, size = "500x500") {
  return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${encodeURIComponent(
    String(cid)
  )}/PNG?image_size=${encodeURIComponent(size)}`;
}

async function resolveImageUrl(item) {
  if (item.type === "pokemon") {
    return await pokemonArtworkUrl(item.name);
  }

  const d = item.payload;
  if (!d) return "";

  if (!d.pubchem_cid) {
    return `./assets/${d.structure_asset || "no_data.png"}`;
  }

  if (d.drug_type !== "small_molecule") {
    return "./assets/antibodies.png";
  }

  return pubchem2dPngByCid(d.pubchem_cid, "500x500");
}

function resetImage() {
  const img = $("cardImage");
  img.style.display = "none";
  img.src = "";
  img.alt = "";
  img.onload = null;
  img.onerror = null;
}

function resetDrugInfo() {
  const box = $("drugInfo");
  if (!box) return;
  box.hidden = true;
  const inn = $("drugInn");
  const sum = $("drugSummary");
  if (inn) inn.textContent = "";
  if (sum) sum.textContent = "";
}

function showDrugInfo(item) {
  const box = $("drugInfo");
  if (!box) return;

  if (item.type !== "drug" || !item.payload) {
    box.hidden = true;
    return;
  }

  const d = item.payload;

  $("drugInn").textContent = d.generic_inn ? `INN: ${d.generic_inn}` : "";
  $("drugSummary").textContent = d.summary || "";

  // Show only when we have something meaningful.
  box.hidden = !(d.generic_inn || d.summary);
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

    const alt =
      item.type === "pokemon"
        ? "Покемон"
        : item.payload?.structure_asset || item.payload?.pubchem_cid
          ? "Химическая структура"
          : "Biologic / no structure";

    const finalUrl =
      url.includes("pubchem.ncbi.nlm.nih.gov/rest/pug/") ? url : withCacheBuster(url);

    return await setAndShow(finalUrl, alt);
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
    viewIndex: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    bestStreak: 0,
    streak: 0,
    current: null,
    deck: [],
    locked: false,
    lastSubmitAt: 0,
    outcomes: Array(CONFIG.TOTAL_Q).fill(""),
    answers: Array(CONFIG.TOTAL_Q).fill(null),
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

  function updateButtonLayout() {
    const isDone = state.phase === "game" && state.mode === "done";
    const grid = document.querySelector(".btnGrid");
    if (!grid) return;

    const pokemonBtn = $("pokemonBtn");
    const drugBtn = $("drugBtn");
    const skipBtn = $("skipBtn");
    const submitBtn = $("submitBtn");

    if (isDone) {
      grid.classList.add("single");
      const answersRow = document.querySelector(".btnRowAnswers");
      if (answersRow) answersRow.style.display = "none";
      if (skipBtn) skipBtn.style.display = "none";
      if (submitBtn) {
        submitBtn.style.display = "inline-flex";
        submitBtn.textContent = "Сохранить результат 💾";
      }
    } else {
      grid.classList.remove("single");
      const answersRow = document.querySelector(".btnRowAnswers");
      if (answersRow) answersRow.style.display = "";
      if (skipBtn) skipBtn.style.display = "";
      if (submitBtn) {
        submitBtn.style.display = "";
        submitBtn.textContent = "С меня хватит😵‍💫";
      }
    }
  }

  function setButtonsEnabled() {
    const isGame = state.phase === "game";
    const isQuestion = isGame && state.mode === "question";
    const isFeedback = isGame && state.mode === "feedback";
    const isReview = isGame && state.mode === "review";
    const canNext = isQuestion || isFeedback || isReview;
    const pokemonBtn = $("pokemonBtn");
    const drugBtn = $("drugBtn");
    const skipBtn = $("skipBtn");
    const submitBtn = $("submitBtn");
    if (pokemonBtn) pokemonBtn.disabled = !isQuestion;
    if (drugBtn) drugBtn.disabled = !isQuestion;
    if (skipBtn) skipBtn.disabled = !canNext;
    if (submitBtn) submitBtn.disabled = !(isGame && answeredTotal() >= CONFIG.MIN_SUBMIT_Q);
    updateButtonLayout();
  }

  function renderStats() {
    $("stCorrect").textContent = String(state.correct);
    $("stWrong").textContent = String(state.wrong);
    $("stSkip").textContent = String(state.skipped);
    $("stAcc").textContent = pct(state.correct, answeredTotal());
  }

  function renderProgress() {
    $("barLeft").textContent = `${state.indexShown} / ${state.maxQuestions}`;
    $("barRight").textContent = "";
    const segmentsEl = $("segments");
    const progress = state.maxQuestions ? state.indexShown / state.maxQuestions : 0;
    renderSegments(segmentsEl, progress);
    renderStats();
  }

    function showCard(item) {
    state.current = item;
    const nameEl = $("cardName");
    const hintEl = $("cardHint");
    const diagnosisEl = $("diagnosis");
    const diagnosisMessage = $("diagnosisMessage");
    nameEl.textContent = item.name;
    nameEl.style.display = "";
    hintEl.textContent = "Покемон или лекарство?";
    hintEl.style.display = "";
    if (diagnosisEl) diagnosisEl.hidden = true;
    if (diagnosisMessage) diagnosisMessage.textContent = "";
    resetImage();
    resetDrugInfo();
    clearFeedbackClasses();
    showStatus("");
  }

  function showReview(index) {
    const item = state.deck[index];
    if (!item) return;
    state.viewIndex = index;
    showCard(item);

    const ans = state.answers[index];
    if (ans) {
      state.mode = "review";
      if (ans.outcome === "skip") {
        showStatus("Пропущено.");
      } else {
        const truth = item.type;
        const correct = ans.outcome === "correct";
        markFeedback(correct, truth, ans.choice);
        showStatus(correct ? "Ок. Верно!" : `Нет. Это ${truth === "pokemon" ? "покемон" : "лекарство"}.`);
      }
      $("cardHint").textContent = "";
      revealImage(item).then(() => {
        if (state.current === item) showDrugInfo(item);
      });
    } else {
      state.mode = "question";
      showStatus("");
      $("cardHint").textContent = "Покемон или лекарство?";
    }
    setButtonsEnabled();
    renderProgress();
  }

  function showDone() {
    state.mode = "done";
    state.current = null;
    state.viewIndex = state.maxQuestions;
    showStatus("");

    const accDrug = pctNum(state.byType.drug.correct, state.byType.drug.total);
    const accPokemon = pctNum(state.byType.pokemon.correct, state.byType.pokemon.total);
    const profile = buildProfile({ accDrug, accPokemon });
    const diagnosisText = profile.message || "-";

    const nameEl = $("cardName");
    const hintEl = $("cardHint");
    const diagnosisEl = $("diagnosis");
    const diagnosisMessage = $("diagnosisMessage");
    const diagnosisDrugAcc = $("diagnosisDrugAcc");
    const diagnosisPokemonAcc = $("diagnosisPokemonAcc");
    const diagnosisDrugRaw = $("diagnosisDrugRaw");
    const diagnosisPokemonRaw = $("diagnosisPokemonRaw");
    nameEl.textContent = "Эксперимент завершён";
    nameEl.style.display = "none";
    hintEl.textContent =
      "Зафиксируйте результат в таблице или воспроизведите эксперимент заново.";
    hintEl.style.display = "";
    if (diagnosisEl) diagnosisEl.hidden = false;
    if (diagnosisMessage) diagnosisMessage.textContent = diagnosisText;
    if (diagnosisDrugAcc) diagnosisDrugAcc.textContent = accDrug == null ? "-" : `${accDrug}%`;
    if (diagnosisPokemonAcc) diagnosisPokemonAcc.textContent = accPokemon == null ? "-" : `${accPokemon}%`;
    if (diagnosisDrugRaw)
      diagnosisDrugRaw.textContent = `(${state.byType.drug.correct}/${state.byType.drug.total})`;
    if (diagnosisPokemonRaw)
      diagnosisPokemonRaw.textContent = `(${state.byType.pokemon.correct}/${state.byType.pokemon.total})`;

    resetImage();
    const img = $("cardImage");
    img.style.display = "block";
    img.alt = "Эксперимент завершён";
    img.src = "./assets/simpsons_drugs.gif";
    resetDrugInfo();
    clearFeedbackClasses();
    setButtonsEnabled();
    renderProgress();
  }

  function showNewQuestion() {
    if (state.indexShown >= state.maxQuestions) {
      showDone();
      return;
    }
    const item = state.deck[state.indexShown];
    state.viewIndex = state.indexShown;
    state.indexShown += 1;
    state.mode = "question";
    showCard(item);
    setButtonsEnabled();
    renderProgress();
  }

  function goPrev() {
    if (state.phase !== "game") return;
    if (state.viewIndex <= 0) return;
    if (state.mode === "done") {
      showReview(state.maxQuestions - 1);
      return;
    }
    showReview(state.viewIndex - 1);
  }

  function goNext() {
    if (state.phase !== "game" || state.mode === "done") return;
    if (state.viewIndex + 1 < state.indexShown) {
      showReview(state.viewIndex + 1);
      return;
    }
    if (state.viewIndex + 1 === state.indexShown) {
      showNewQuestion();
    }
  }

  function startGame() {
    if (!DRUGS.length) {
      showStatus("Ошибка: drugs.json не загрузился (проверьте /data/drugs.json).");
      return;
    }

    state.phase = "game";
    state.mode = "question";
    state.maxQuestions = CONFIG.TOTAL_Q;

    state.indexShown = 0;
    state.viewIndex = 0;
    state.correct = 0;
    state.wrong = 0;
    state.skipped = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.outcomes = Array(CONFIG.TOTAL_Q).fill("");
    state.answers = Array(CONFIG.TOTAL_Q).fill(null);
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
    showNewQuestion();
  }

  function restartGame() {
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
    if (state.answers[state.viewIndex]) return;
    state.locked = true;

    const truth = state.current.type;
    const ok = choiceType === truth;

    state.byType[truth].total += 1;
    if (ok) state.byType[truth].correct += 1;

    if (ok) {
      state.correct += 1;
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      showStatus("Ок. Верно!");
    } else {
      state.wrong += 1;
      state.streak = 0;
      showStatus(`Нет. Это ${truth === "pokemon" ? "покемон" : "лекарство"}.`);
    }

    const idx = state.viewIndex;
    state.outcomes[idx] = ok ? "correct" : "wrong";
    state.answers[idx] = { outcome: ok ? "correct" : "wrong", choice: choiceType };

    state.mode = "feedback";
    markFeedback(ok, truth, choiceType);
    setButtonsEnabled();
    renderProgress();

    const item = state.current;
    // Load image/info without blocking next card.
    revealImage(item).then(() => {
      if (state.current === item) showDrugInfo(item);
    });

      $("cardHint").textContent = "";
    state.locked = false;
  }

  function skip() {
    if (state.phase !== "game" || state.mode === "done") return;

    if (state.mode === "feedback" || state.mode === "review") {
      goNext();
      return;
    }

    const idx = state.indexShown - 1;
    state.skipped += 1;
    state.streak = 0;
    state.outcomes[idx] = "skip";
    state.answers[idx] = { outcome: "skip" };

    clearFeedbackClasses();
    goNext();
  }

  async function submitFlow() {
    if (answeredTotal() < CONFIG.MIN_SUBMIT_Q) {
      showStatus(`Нужно минимум ${CONFIG.MIN_SUBMIT_Q} вопросов.`);
      return;
    }

    const now = Date.now();
    if (now - state.lastSubmitAt < 1500) {
      showStatus("Пожалуйста, подождите перед повторным Submit.");
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
          msgEl.textContent = `Ошибка: ${error.message}`;
          return;
        }

        msgEl.textContent = "Готово. Открываю лидерборд…";
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

  async function init() {
    setView("welcome");
    setButtonsEnabled();
    renderProgress();

    try {
      await loadDrugs();
    } catch (e) {
      console.error(e);
      showStatus("Не удалось загрузить drugs.json. Проверьте /data/drugs.json.");
    }
  }

  return {
    init,
    startGame,
    restartGame,
    answer,
    skip,
    goPrev,
    goNext,
    submitFlow,
  };
}

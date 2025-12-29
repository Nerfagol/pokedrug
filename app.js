import { POKEMON } from "./data/pokemon.js";
import { DRUGS } from "./data/drugs.js";

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// CONFIG
const SUPABASE_URL = "https://jcivshbswkxwqgqhcike.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0K7HL0vgWOu6MarjbWxPeg_DfVICU-I";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AUTO_NEXT_MS = 2000;
const MIN_SUBMIT_Q = 20;
const TOTAL_Q = 100;

// Profile messages (10 profiles × 2–3 variants)
const PROFILE_MESSAGES = {
    "PERFECT_PERFECT": [
    "Идеальная классификация. Либо вы читали исходники, либо нейминг вам больше не угрожает.",
    "100% по всем категориям. Это либо талант, либо тревожный уровень внимательности.",
    "Вымысел и фарма не имеют над вами власти. Спокойно."
    ],
    "HIGH_DRUG_HIGH_POKEMON": [
    "Отличная дифференциация: фантазия и фармакология больше не маскируются.",
    "Вы уверенно отделяете вымысел от реальности. Редкий и полезный навык.",
    "Названия старались вас запутать. Не получилось."
    ],
    "HIGH_DRUG_MID_POKEMON": [
    "Реальные препараты распознаёте уверенно. Фантазийные названия иногда сбивают — как и задумано.",
    "Фарма — да. Покемоны иногда пролезают под радар.",
    "Химическая интуиция сильнее мифологии, но не всегда."
    ],
    "HIGH_DRUG_LOW_POKEMON": [
    "Ловец покемонов из вас никакой, но пилюля не проскочит неопознанной.",
    "Реальные молекулы — да. Милые существа — нет.",
    "Фармацевтическая бдительность компенсирует отсутствие покедекса."
    ],
    "MID_DRUG_HIGH_POKEMON": [
    "Искусственные имена распознаёте легко. Реальные препараты требуют большего доверия.",
    "В мире вымысла ориентируетесь лучше, чем в аптеке.",
    "Покемоны не обманули. Таблетки — да."
    ],
    "MID_DRUG_MID_POKEMON": [
    "Названия сбивают одинаково. Это честный результат для этой игры.",
    "Нейминг работает. И работает против вас.",
    "Рациональность и фантазия сегодня в равных долях."
    ],
    "MID_DRUG_LOW_POKEMON": [
    "Покемоны маскируются особенно успешно. Лекарства — чуть лучше.",
    "Фантазия выигрывает у структуры.",
    "Интуиция есть. Калибровка — в процессе."
    ],
    "LOW_DRUG_HIGH_POKEMON": [
    "Вымысел вам ясен. Аптечный нейминг — опасная зона.",
    "Фантазийные существа распознаются лучше реальных препаратов.",
    "Покемоны не подвели. Фарма — подвела."
    ],
    "LOW_DRUG_MID_POKEMON": [
    "Реальные препараты теряются среди звучных названий.",
    "Брендинг работает лучше, чем хотелось бы.",
    "Фарма сегодня звучит слишком правдоподобно."
    ],
    "LOW_DRUG_LOW_POKEMON": [
    "Всё звучит правдоподобно. И это, к сожалению, правда.",
    "Нейминг победил. Логику — нет.",
    "Если всё похоже на лекарство, это уже не ваша вина."
    ]
};

const el = (id) => document.getElementById(id);

const views = {
    welcome: el("welcomeView"),
    game: el("gameView"),
    leaderboard: el("leaderboardView"),
};

function setView(name){
    for (const k of Object.keys(views)) views[k].hidden = (k !== name);
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildDeck(maxQ) {
    const pool = [
    ...POKEMON.map(n => ({ name: n, type: "pokemon" })),
    ...DRUGS.map(n => ({ name: n, type: "drug" }))
    ];
    shuffle(pool);
    if (pool.length >= maxQ) return pool.slice(0, maxQ);
    const deck = [...pool];
    while (deck.length < maxQ) deck.push(pool[Math.floor(Math.random() * pool.length)]);
    return shuffle(deck);
}

function normalizeNick(raw){
    const s = (raw || "").trim();
    if (!s) return "anon";
    return s.replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 20) || "anon";
}

function pct(n, d){
    if (!d) return "0%";
    return Math.round((n/d)*100) + "%";
}

function pctNum(n, d){
    if (!d) return null;
    return Math.round((n/d)*100);
}

function bucketPercent(p){
    if (p === 100) return "PERFECT";
    if (p >= 70) return "HIGH";
    if (p >= 40) return "MID";
    return "LOW";
}

function pick(arr){
    if (!arr || !arr.length) return "";
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildProfile({ accDrug, accPokemon }){
    const d = (accDrug == null) ? 0 : accDrug;
    const p = (accPokemon == null) ? 0 : accPokemon;

    if (d === 100 && p === 100) {
    return { key: "PERFECT_PERFECT", message: pick(PROFILE_MESSAGES["PERFECT_PERFECT"]) };
    }

    const dk = bucketPercent(d);
    const pk = bucketPercent(p);

    const map = {
    "HIGH_DRUG_HIGH_POKEMON": "HIGH_DRUG_HIGH_POKEMON",
    "HIGH_DRUG_MID_POKEMON": "HIGH_DRUG_MID_POKEMON",
    "HIGH_DRUG_LOW_POKEMON": "HIGH_DRUG_LOW_POKEMON",
    "MID_DRUG_HIGH_POKEMON": "MID_DRUG_HIGH_POKEMON",
    "MID_DRUG_MID_POKEMON": "MID_DRUG_MID_POKEMON",
    "MID_DRUG_LOW_POKEMON": "MID_DRUG_LOW_POKEMON",
    "LOW_DRUG_HIGH_POKEMON": "LOW_DRUG_HIGH_POKEMON",
    "LOW_DRUG_MID_POKEMON": "LOW_DRUG_MID_POKEMON",
    "LOW_DRUG_LOW_POKEMON": "LOW_DRUG_LOW_POKEMON",
    };

    const key = `${dk}_DRUG_${pk}_POKEMON`;
    const storedKey = map[key] || "MID_DRUG_MID_POKEMON";

    return { key: storedKey, message: pick(PROFILE_MESSAGES[storedKey]) };
}

const state = {
    phase: "welcome",
    mode: "question", // question | feedback
    maxQuestions: TOTAL_Q,
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
    outcomes: Array(TOTAL_Q).fill(""), // "correct" | "wrong" | "skip" | ""
    byType: {
    pokemon: { correct: 0, total: 0 },
    drug: { correct: 0, total: 0 },
    }
};

function answeredTotal(){
    return state.correct + state.wrong + state.skipped;
}

function resetImage() {
    const img = el("cardImage");
    img.style.display = "none";
    img.src = "";
    img.alt = "";
    img.onload = null;
    img.onerror = null;
}

function withCacheBuster(url) {
    const sep = url.includes("?") ? "&" : "?";
    return url + sep + "t=" + Date.now();
}

function pubChem2DRecordPngByName(drugName, size="500x500") {
    return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(drugName)}/record/PNG?record_type=2d&image_size=${encodeURIComponent(size)}`;
}

async function pokemonArtworkUrl(pokemonName) {
    const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemonName.toLowerCase())}`);
    if (!r.ok) return "";
    const j = await r.json();
    return j?.sprites?.other?.["official-artwork"]?.front_default || "";
}

async function resolveImageUrl(item) {
    if (item.type === "pokemon") return await pokemonArtworkUrl(item.name);
    return pubChem2DRecordPngByName(item.name, "500x500");
}

async function revealImage(item) {
    const img = el("cardImage");
    resetImage();
    img.referrerPolicy = "no-referrer";

    const setAndShow = (url, alt) => new Promise((resolve) => {
    img.alt = alt;
    img.onload = () => { img.style.display = "block"; resolve(true); };
    img.onerror = () => { img.style.display = "none"; resolve(false); };
    img.src = url;
    });

    try {
    const url = await resolveImageUrl(item);
    if (!url) return false;
    return await setAndShow(withCacheBuster(url), item.type === "pokemon" ? "Покемон" : "Структурная формула (PubChem)");
    } catch {
    return false;
    }
}

function clearFeedbackClasses(){
    el("pokemonBtn").classList.remove("correct","wrong","reveal");
    el("drugBtn").classList.remove("correct","wrong","reveal");
}

function showStatus(t){ el("status").textContent = t || ""; }
function showLbStatus(t){ el("lbStatus").textContent = t || ""; }

function setButtonsEnabled(){
    const isQuestion = (state.phase === "game" && state.mode === "question");
    el("pokemonBtn").disabled = !isQuestion;
    el("drugBtn").disabled = !isQuestion;
    el("skipBtn").disabled = !isQuestion;
    el("submitBtn").disabled = !(state.phase === "game" && answeredTotal() >= MIN_SUBMIT_Q);
}

function ensureSegments(){
    const box = el("segments");
    if (!box.dataset.ready){
    box.innerHTML = Array.from({length: TOTAL_Q}).map((_, i) => `<div class="seg" data-i="${i}"></div>`).join("");
    box.dataset.ready = "1";
    }
}

function renderSegments(){
    ensureSegments();
    const box = el("segments");
    const nodes = box.querySelectorAll(".seg");
    nodes.forEach((n, i) => {
    n.classList.remove("correct","wrong","skip");
    const o = state.outcomes[i];
    if (o) n.classList.add(o);
    });
}

function renderStats(){
    el("stCorrect").textContent = String(state.correct);
    el("stWrong").textContent = String(state.wrong);
    el("stSkip").textContent = String(state.skipped);
    el("stAcc").textContent = pct(state.correct, answeredTotal());
}

function renderProgress(){
    el("barLeft").textContent = `${state.indexShown} / ${state.maxQuestions}`;
    el("barRight").textContent = `auto-next ${Math.round(AUTO_NEXT_MS/1000)}s`;
    renderSegments();
    renderStats();
}

function clearAutoNext(){
    if (state.autoNextTimer) {
    clearTimeout(state.autoNextTimer);
    state.autoNextTimer = null;
    }
}

function scheduleAutoNext(){
    clearAutoNext();
    state.autoNextTimer = setTimeout(() => {
    state.autoNextTimer = null;
    if (state.phase === "game" && state.mode === "feedback") nextCard();
    }, AUTO_NEXT_MS);
}

function showCard(item){
    state.current = item;
    el("cardName").textContent = item.name;
    el("cardHint").textContent = "Покемон или лекарство?";
    resetImage();
    clearFeedbackClasses();
    showStatus("");
}

function nextCard(){
    clearAutoNext();

    if (state.indexShown >= state.maxQuestions) {
    state.mode = "question";
    el("cardName").textContent = "Done";
    el("cardHint").textContent = `Сыграно: ${answeredTotal()}. Можно Submit (если ≥ ${MIN_SUBMIT_Q}) или Restart.`;
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

function startGame(){
    state.phase = "game";
    state.mode = "question";
    state.maxQuestions = TOTAL_Q;

    state.indexShown = 0;
    state.correct = 0;
    state.wrong = 0;
    state.skipped = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.outcomes = Array(TOTAL_Q).fill("");
    state.byType = {
    pokemon: { correct: 0, total: 0 },
    drug: { correct: 0, total: 0 },
    };

    state.deck = buildDeck(state.maxQuestions);
    state.current = null;
    state.locked = false;

    ensureSegments();
    setView("game");
    setButtonsEnabled();
    renderProgress();
    nextCard();
}

function restartGame(){ clearAutoNext(); startGame(); }

function markFeedback(correct, truthType, chosenType){
    const chosenBtn = chosenType === "pokemon" ? el("pokemonBtn") : el("drugBtn");
    chosenBtn.classList.add(correct ? "correct" : "wrong");

    const truthBtn = truthType === "pokemon" ? el("pokemonBtn") : el("drugBtn");
    truthBtn.classList.add("reveal");
    if (!correct) truthBtn.classList.add("correct");
}

async function answer(choiceType){
    if (state.phase !== "game" || state.mode !== "question" || state.locked) return;
    if (!state.current) return;
    state.locked = true;

    const truth = state.current.type; // "pokemon" | "drug"
    const ok = (choiceType === truth);

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

    el("cardHint").textContent = `Следующий через ${Math.round(AUTO_NEXT_MS/1000)} сек…`;
    scheduleAutoNext();

    state.locked = false;
}

function skip(){
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

    el("cardHint").textContent = `Следующий через ${Math.round(AUTO_NEXT_MS/1000)} сек…`;
    scheduleAutoNext();

    state.locked = false;
}

function renderTop10Rows(data, tbodyId, metaId){
    const tbody = el(tbodyId);
    if (!data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">Пока нет сабмитов.</td></tr>`;
    el(metaId).textContent = "Пусто";
    return;
    }

    el(metaId).textContent = `Обновлено: ${new Date().toLocaleTimeString()}`;
    tbody.innerHTML = data.map((e, i) => {
    const acc = Math.round((e.accuracy || 0) * 100) + "%";
    return `
        <tr>
        <td class="num">#${i+1}</td>
        <td>${e.nickname || "anon"}</td>
        <td class="num">${e.score}</td>
        <td class="num">${e.answered}</td>
        <td class="num">${acc}</td>
        <td class="num">💊${(e.acc_drug == null ? "—" : e.acc_drug)}/🐭${(e.acc_pokemon == null ? "—" : e.acc_pokemon)}</td>
        </tr>
    `;
    }).join("");
}

async function loadTop10(){
    const setLoading = (metaId, bodyId) => {
    if (el(metaId)) el(metaId).textContent = "Загрузка…";
    if (el(bodyId)) el(bodyId).innerHTML = `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">…</td></tr>`;
    };

    setLoading("lbMeta", "lbTableBody");
    setLoading("lbMeta2", "lbTableBody2");

    const { data, error } = await supabase
    .from("leaderboard_entries")
    .select("nickname, score, answered, accuracy, acc_drug, acc_pokemon, max_streak, created_at")
    .order("score", { ascending: false })
    .order("answered", { ascending: false })
    .order("accuracy", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);

    if (error){
    if (el("lbMeta")) el("lbMeta").textContent = `Ошибка: ${error.message}`;
    if (el("lbMeta2")) el("lbMeta2").textContent = `Ошибка: ${error.message}`;
    if (el("lbTableBody")) el("lbTableBody").innerHTML = `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">Проверь RLS (SELECT для anon).</td></tr>`;
    if (el("lbTableBody2")) el("lbTableBody2").innerHTML = `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">Проверь RLS (SELECT для anon).</td></tr>`;
    return;
    }

    renderTop10Rows(data, "lbTableBody", "lbMeta");
    renderTop10Rows(data, "lbTableBody2", "lbMeta2");
}

function openNickModal({ onSubmit }){
    const overlay = document.createElement("div");
    overlay.className = "overlay";

    const box = document.createElement("div");
    box.className = "modal";

    const total = answeredTotal();
    const accTotal = pct(state.correct, total);

    const accDrug = pctNum(state.byType.drug.correct, state.byType.drug.total);
    const accPokemon = pctNum(state.byType.pokemon.correct, state.byType.pokemon.total);

    const accDrugStr = (accDrug == null) ? "—" : `${accDrug}%`;
    const accPokemonStr = (accPokemon == null) ? "—" : `${accPokemon}%`;

    const profile = buildProfile({ accDrug, accPokemon });

    box.innerHTML = `
    <div class="modalHeader">
        <div class="t">Submit results</div>
        <button id="closeBtn" class="ghostBtn" style="min-height:40px; padding:10px 12px;">Close</button>
    </div>
    <div class="modalBody">
        <div class="muted" style="margin-bottom:8px;">Статистика сессии</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <div class="pill"><span class="dot ok"></span><span>correct:</span><span class="mono">${state.correct}</span></div>
        <div class="pill"><span class="dot bad"></span><span>wrong:</span><span class="mono">${state.wrong}</span></div>
        <div class="pill"><span class="dot sk"></span><span>skip:</span><span class="mono">${state.skipped}</span></div>
        <div class="pill"><span>accuracy:</span><span class="mono">${accTotal}</span></div>
        </div>

        <div class="muted" style="margin:12px 0 8px;">Разбивка по типам (без учёта skip)</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <div class="pill"><span>💊 drugs:</span><span class="mono">${accDrugStr}</span><span class="muted">(${state.byType.drug.correct}/${state.byType.drug.total})</span></div>
        <div class="pill"><span>🟡 pokemon:</span><span class="mono">${accPokemonStr}</span><span class="muted">(${state.byType.pokemon.correct}/${state.byType.pokemon.total})</span></div>
        </div>

        <div class="quote"><span class="muted">Диагноз по результатам:</span><br><b>${profile.message}</b></div>

        <div class="muted" style="margin-top:12px;">Введите никнейм для лидерборда (до 20 символов).</div>
        <div class="field">
        <label for="nickInput">Nickname</label>
        <input id="nickInput" type="text" maxlength="20" placeholder="EAP" autocomplete="nickname" />
        </div>
        <div class="btnRow" style="justify-content:flex-end; margin-top: 12px;">
        <button id="cancelBtn">Cancel</button>
        <button id="okBtn" class="primary">Submit</button>
        </div>
        <div id="modalMsg" class="muted" style="margin-top:10px; min-height:18px;"></div>
    </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener("click", (e)=>{ if (e.target === overlay) close(); });
    box.querySelector("#closeBtn").addEventListener("click", close);
    box.querySelector("#cancelBtn").addEventListener("click", close);

    const input = box.querySelector("#nickInput");
    const msg = box.querySelector("#modalMsg");
    const okBtn = box.querySelector("#okBtn");

    input.focus();

    const doSubmit = async () => {
    const nick = normalizeNick(input.value);
    okBtn.disabled = true;
    msg.textContent = "Отправка…";
    try {
        await onSubmit(nick, msg, { accDrug, accPokemon, profileKey: profile.key });
    } finally {
        okBtn.disabled = false;
    }
    };

    okBtn.addEventListener("click", doSubmit);
    input.addEventListener("keydown", (e)=>{
    if (e.key === "Enter") doSubmit();
    if (e.key === "Escape") close();
    });
}

async function submitFlow(){
    if (answeredTotal() < MIN_SUBMIT_Q) {
    showStatus(`Нужно минимум ${MIN_SUBMIT_Q} сыгранных вопросов.`);
    return;
    }

    const now = Date.now();
    if (now - state.lastSubmitAt < 1500) {
    showStatus("⏳ Подожди секунду и нажми Submit ещё раз.");
    return;
    }
    state.lastSubmitAt = now;

    openNickModal({
    onSubmit: async (nickname, msgEl, extra) => {
        const answered = answeredTotal();
        const accuracy = answered ? (state.correct / answered) : 0;

        const payload = {
        nickname: normalizeNick(nickname),
        score: state.correct,
        answered,
        accuracy,
        max_streak: state.bestStreak,
        user_agent: navigator.userAgent
        };

        // If you later add columns in Supabase (acc_drug, acc_pokemon, profile_key),
        // you can extend payload here:
        payload.acc_drug = (extra?.accDrug ?? null);
        payload.acc_pokemon = (extra?.accPokemon ?? null);
        // payload.profile_key = (extra?.profileKey ?? null);

        const { error } = await supabase.from("leaderboard_entries").insert(payload);

        if (error) {
        msgEl.textContent = `❌ Ошибка: ${error.message}`;
        return;
        }

        msgEl.textContent = "✅ Готово. Открываю лидерборд…";
        await loadTop10();
        setView("leaderboard");
        showLbStatus(`Submitted: score=${payload.score}, answered=${payload.answered}, acc=${Math.round(payload.accuracy*100)}%`);
        setTimeout(() => {
        const ov = document.querySelector(".overlay");
        if (ov) ov.remove();
        }, 350);
    }
    });
}

function alertStripModal(title, html){
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    const box = document.createElement("div");
    box.className = "modal";
    box.innerHTML = `
    <div class="modalHeader">
        <div class="t">${title}</div>
        <button id="tmpCloseBtn" class="ghostBtn" style="min-height:40px; padding:10px 12px;">Close</button>
    </div>
    <div class="modalBody">${html}</div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener("click", (e)=>{ if (e.target === overlay) close(); });
    box.querySelector("#tmpCloseBtn").addEventListener("click", close);
}

function showRules(){
    alertStripModal("Rules", `
    <div class="muted">
        <ul>
        <li>Выбирай: <b>🟡 покемон</b> или <b>💊 лекарство</b>.</li>
        <li>После ответа: feedback + картинка → auto-next через <b>${Math.round(AUTO_NEXT_MS/1000)} сек</b>.</li>
        <li><b>Submit</b> доступен после <b>${MIN_SUBMIT_Q}</b> сыгранных (answer/skip).</li>
        <li>Leaderboard: <b>score → answered → accuracy</b>.</li>
        </ul>
    </div>
    `);
}
function openLeaderboardModal(){
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    const box = document.createElement("div");
    box.className = "modal";

    box.innerHTML = `
    <div class="modalHeader">
        <div class="t">Leaderboard (Top-10)</div>
        <button id="lbCloseBtn" class="ghostBtn" style="min-height:40px; padding:10px 12px;">Close</button>
    </div>
    <div class="modalBody">
        <div class="muted" id="lbModalMeta" style="margin-bottom:10px;">Загрузка…</div>
        <div class="tableWrap" style="margin-top: 0;">
        <div style="overflow:auto;">
            <table>
            <thead>
                <tr>
                <th style="width:70px;">#</th>
                <th>nickname</th>
                <th style="width:120px;">score</th>
                <th style="width:120px;">answered</th>
                <th style="width:120px;">accuracy</th>
                <th style="width:110px;">split</th>
                </tr>
            </thead>
            <tbody id="lbModalBody">
                <tr><td colspan="6" class="muted" style="padding: 14px 12px;">…</td></tr>
            </tbody>
            </table>
        </div>
        </div>
        <div class="muted" style="margin-top:10px;">split = 💊drug/🐭pokemon (проценты без учёта skip)</div>
    </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener("click", (e)=>{ if (e.target === overlay) close(); });
    box.querySelector("#lbCloseBtn").addEventListener("click", close);

    // Load fresh top-10 into modal
    (async () => {
    const { data, error } = await supabase
        .from("leaderboard_entries")
        .select("nickname, score, answered, accuracy, acc_drug, acc_pokemon, created_at")
        .order("score", { ascending: false })
        .order("answered", { ascending: false })
        .order("accuracy", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(10);

    const meta = box.querySelector("#lbModalMeta");
    const body = box.querySelector("#lbModalBody");

    if (error) {
        meta.textContent = `Ошибка: ${error.message}`;
        body.innerHTML = `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">Не удалось загрузить данные.</td></tr>`;
        return;
    }

    meta.textContent = `Обновлено: ${new Date().toLocaleTimeString()}`;

    if (!data || !data.length) {
        body.innerHTML = `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">Пока нет сабмитов.</td></tr>`;
        return;
    }

    body.innerHTML = data.map((e, i) => {
        const acc = Math.round((e.accuracy || 0) * 100) + "%";
        const d = (e.acc_drug == null) ? "—" : String(e.acc_drug);
        const p = (e.acc_pokemon == null) ? "—" : String(e.acc_pokemon);
        const split = `💊${d}/🐭${p}`;
        return `
        <tr>
            <td class="num">#${i+1}</td>
            <td>${e.nickname || "anon"}</td>
            <td class="num">${e.score}</td>
            <td class="num">${e.answered}</td>
            <td class="num">${acc}</td>
            <td class="num">${split}</td>
        </tr>
        `;
    }).join("");
    })();
}


// Wire up
el("startBtn").addEventListener("click", startGame);
el("showRulesBtn").addEventListener("click", showRules);
el("lbBtnTop").addEventListener("click", openLeaderboardModal);
el("rulesBtnTop").addEventListener("click", showRules);
el("leaderboardRulesBtn").addEventListener("click", showRules);

el("pokemonBtn").addEventListener("click", () => answer("pokemon"));
el("drugBtn").addEventListener("click", () => answer("drug"));
el("skipBtn").addEventListener("click", skip);

el("restartBtn").addEventListener("click", restartGame);
el("submitBtn").addEventListener("click", submitFlow);

el("refreshLbBtn").addEventListener("click", loadTop10);
el("refreshLbBtn2").addEventListener("click", loadTop10);

el("playAgainBtn").addEventListener("click", () => {
    clearAutoNext();
    setView("welcome");
});

// init
setView("welcome");
loadTop10();
ensureSegments();
setButtonsEnabled();
renderProgress();
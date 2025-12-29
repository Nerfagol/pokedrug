import { CONFIG } from "./config.js";

export const $ = (id) => document.getElementById(id);

export function setView(views, name) {
  for (const k of Object.keys(views)) views[k].hidden = (k !== name);
}

export function pct(n, d) {
  if (!d) return "0%";
  return Math.round((n / d) * 100) + "%";
}

export function pctNum(n, d) {
  if (!d) return null;
  return Math.round((n / d) * 100);
}

export function normalizeNick(raw) {
  const s = (raw || "").trim();
  if (!s) return "anon";
  return s.replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 20) || "anon";
}

export function ensureSegments(containerEl) {
  if (!containerEl.dataset.ready) {
    containerEl.innerHTML = Array.from({ length: CONFIG.TOTAL_Q })
      .map((_, i) => `<div class="seg" data-i="${i}"></div>`)
      .join("");
    containerEl.dataset.ready = "1";
  }
}

export function renderSegments(containerEl, outcomes) {
  ensureSegments(containerEl);
  const nodes = containerEl.querySelectorAll(".seg");
  nodes.forEach((n, i) => {
    n.classList.remove("correct", "wrong", "skip");
    const o = outcomes[i];
    if (o) n.classList.add(o);
  });
}

export function renderSplit(accDrug, accPokemon) {
  const d = accDrug == null ? "—" : String(accDrug);
  const p = accPokemon == null ? "—" : String(accPokemon);
  return `💊${d}/🐭${p}`;
}

export function renderLeaderboardTbody(tbodyEl, metaEl, rows) {
  if (!rows || !rows.length) {
    tbodyEl.innerHTML =
      `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">Пока нет сабмитов.</td></tr>`;
    if (metaEl) metaEl.textContent = "Пусто";
    return;
  }
  //if (metaEl) metaEl.textContent = `Обновлено: ${new Date().toLocaleTimeString()}`;
  tbodyEl.innerHTML = rows
    .map((e, i) => {
      const acc = Math.round((e.accuracy || 0) * 100) + "%";
      const split = renderSplit(e.acc_drug, e.acc_pokemon);
      return `
        <tr>
          <td class="num">#${i + 1}</td>
          <td>${e.nickname || "anon"}</td>
          <td class="num">${e.score}</td>
          <td class="num">${e.answered}</td>
          <td class="num">${acc}</td>
          <td class="num">${split}</td>
        </tr>
      `;
    })
    .join("");
}

export function openModal({ title, bodyHtml }) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  const box = document.createElement("div");
  box.className = "modal";
  box.innerHTML = `
    <div class="modalHeader">
      <div class="t">${title}</div>
      <button id="modalCloseBtn" class="ghostBtn" style="min-height:40px; padding:10px 12px;">Close</button>
    </div>
    <div class="modalBody">${bodyHtml}</div>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  box.querySelector("#modalCloseBtn").addEventListener("click", close);

  return { overlay, box, close };
}

export function openRulesModal() {
  openModal({
    title: "Rules",
    bodyHtml: `
      <div class="muted">
        <ul>
          <li>Выбирай: <b>🟡 покемон</b> или <b>💊 лекарство</b>.</li>
          <li>После ответа: feedback + картинка → auto-next через <b>${Math.round(CONFIG.AUTO_NEXT_MS/1000)} сек</b>.</li>
          <li><b>Submit</b> доступен после <b>${CONFIG.MIN_SUBMIT_Q}</b> сыгранных (answer/skip).</li>
          <li>Leaderboard: <b>score → answered → accuracy</b>.</li>
        </ul>
      </div>
    `,
  });
}

export async function openLeaderboardModal({ fetchTop }) {
  const { box } = openModal({
    title: "Leaderboard (Top-10)",
    bodyHtml: `
      <div class="muted" id="lbModalMeta" style="margin-bottom:10px;"></div>
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
    `,
  });

  const meta = box.querySelector("#lbModalMeta");
  const tbody = box.querySelector("#lbModalBody");

  const { data, error } = await fetchTop();
  if (error) {
    meta.textContent = `Ошибка: ${error.message}`;
    tbody.innerHTML = `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">Не удалось загрузить данные.</td></tr>`;
    return;
  }

  renderLeaderboardTbody(tbody, meta, data);
}

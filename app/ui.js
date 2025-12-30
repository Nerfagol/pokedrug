import { CONFIG } from "./config.js";

export const $ = (id) => document.getElementById(id);

export function setView(views, name) {
  for (const k of Object.keys(views)) views[k].hidden = k !== name;
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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function ensureSegments(containerEl) {
  if (!containerEl || containerEl.dataset.ready) return;
  containerEl.innerHTML = "";
  containerEl.dataset.ready = "1";
}

export function renderSegments(containerEl, progress = 0) {
  if (!containerEl) return;
  ensureSegments(containerEl);
  const safe = Math.max(0, Math.min(1, progress));
  containerEl.style.setProperty("--progress", `${safe * 100}%`);
}

export function renderSplit(accDrug, accPokemon) {
  const d = accDrug == null ? "-" : String(accDrug);
  const p = accPokemon == null ? "-" : String(accPokemon);
  return `💊${d}/⚡${p}`;
}

export function renderLeaderboardTbody(tbodyEl, metaEl, rows) {
  if (!rows || !rows.length) {
    tbodyEl.innerHTML =
      `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">Данных пока нет.</td></tr>`;
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
          <td>${escapeHtml(e.nickname || "anon")}</td>
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
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  box.querySelector("#modalCloseBtn").addEventListener("click", close);

  return { overlay, box, close };
}

export function openRulesModal() {
  openModal({
    title: "📃 Правила",
    bodyHtml: `
      <div class="muted">
        <ul>
          <li>Выбирайте: <b>⚡ Покемон</b> или <b>💊 Лекарство</b>.</li>
          <li>После ответа нажмите <b>Следующий</b>, чтобы перейти к новой карточке.</li>
          <li>Посмотреть результаты можно после <b>${CONFIG.MIN_SUBMIT_Q}</b> вопросов.</li>
          <li>Сортировка в таблице лидеров: <b>Очки → Ответы → Общая точность</b>.</li>
        </ul>
      </div>
    `,
  });
}

export async function openLeaderboardModal({ fetchTop }) {
  const { box } = openModal({
    title: "Таблица лидеров (Топ-10)",
    bodyHtml: `
      <div class="muted" id="lbModalMeta" style="margin-bottom:10px;"></div>
      <div class="tableWrap" style="margin-top: 0;">
        <div style="overflow:auto;">
          <table>
            <thead>
              <tr>
                <th style="width:70px;">#</th>
                <th>Псевдоним</th>
                <th style="width:120px;">Очки</th>
                <th style="width:120px;">Ответы</th>
                <th style="width:140px;">Общая точность</th>
                <th style="width:140px;">По категориям</th>
              </tr>
            </thead>
            <tbody id="lbModalBody">
              <tr><td colspan="6" class="muted" style="padding: 14px 12px;">…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
  });

  const meta = box.querySelector("#lbModalMeta");
  const tbody = box.querySelector("#lbModalBody");

  const { data, error } = await fetchTop();
  if (error) {
    meta.textContent = `Ошибка: ${error.message}`;
    tbody.innerHTML = `<tr><td colspan="6" class="muted" style="padding: 14px 12px;">Не удалось загрузить таблицу.</td></tr>`;
    return;
  }

  renderLeaderboardTbody(tbody, meta, data);
}

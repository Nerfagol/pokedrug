import { openModal, normalizeNick } from "./ui.js";

export function makeSubmitModal() {
  function openSubmitModal({ stats, onSubmit }) {
    const accDrugStr = stats.accDrug == null ? "—" : `${stats.accDrug}%`;
    const accPokemonStr = stats.accPokemon == null ? "—" : `${stats.accPokemon}%`;

    const { box, close } = openModal({
      title: "Результаты игры",
      bodyHtml: `
        <div class="muted" style="margin-bottom:8px;">Статистика сессии</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <div class="pill"><span class="dot ok"></span><span>Верно:</span><span class="mono">${stats.correct}</span></div>
          <div class="pill"><span class="dot bad"></span><span>Ошибка:</span><span class="mono">${stats.wrong}</span></div>
          <div class="pill"><span class="dot sk"></span><span>Пропущено:</span><span class="mono">${stats.skipped}</span></div>
          <div class="pill"><span>Общая точность:</span><span class="mono">${stats.accTotal}</span></div>
        </div>

        <div class="muted" style="margin:12px 0 8px;">Разбивка по типам</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <div class="pill"><span>💊 Препараты:</span><span class="mono">${accDrugStr}</span><span class="muted">(${stats.drugCorrect}/${stats.drugTotal})</span></div>
          <div class="pill"><span>⚡ Покемоны:</span><span class="mono">${accPokemonStr}</span><span class="muted">(${stats.pokemonCorrect}/${stats.pokemonTotal})</span></div>
        </div>

        <div class="quote"><span class="muted">Диагноз по результатам:</span><br><b>${stats.profileMessage}</b></div>

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
      `,
    });

    const input = box.querySelector("#nickInput");
    const msg = box.querySelector("#modalMsg");
    const okBtn = box.querySelector("#okBtn");

    input.focus();
    box.querySelector("#cancelBtn").addEventListener("click", close);

    const doSubmit = async () => {
      const nick = normalizeNick(input.value);
      okBtn.disabled = true;
      msg.textContent = "Отправка…";
      try {
        await onSubmit(nick, msg);
      } finally {
        okBtn.disabled = false;
      }
    };

    okBtn.addEventListener("click", doSubmit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSubmit();
      if (e.key === "Escape") close();
    });
  }

  return openSubmitModal;
}

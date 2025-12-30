import { PROFILE_MESSAGES } from "../data/profiles.js";

function pick(arr) {
  if (!arr || !arr.length) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

function bucketPercent(p) {
  if (p === 100) return "PERFECT";
  if (p >= 70) return "HIGH";
  if (p >= 40) return "MID";
  return "LOW";
}

export function buildProfile({ accDrug, accPokemon }) {
  const d = accDrug == null ? 0 : accDrug;
  const p = accPokemon == null ? 0 : accPokemon;

  if (d === 100 && p === 100) {
    return { key: "PERFECT_PERFECT", message: pick(PROFILE_MESSAGES["PERFECT_PERFECT"]) };
  }

  let dk = bucketPercent(d);
  let pk = bucketPercent(p);

  // If a PERFECT key is missing, degrade to HIGH for that axis.
  if (dk === "PERFECT" && !PROFILE_MESSAGES[`PERFECT_DRUG_${pk}_POKEMON`]) {
    dk = "HIGH";
  }
  if (pk === "PERFECT" && !PROFILE_MESSAGES[`${dk}_DRUG_PERFECT_POKEMON`]) {
    pk = "HIGH";
  }

  const key = `${dk}_DRUG_${pk}_POKEMON`;
  const valid = PROFILE_MESSAGES[key] ? key : "MID_DRUG_MID_POKEMON";
  return { key: valid, message: pick(PROFILE_MESSAGES[valid]) };
}

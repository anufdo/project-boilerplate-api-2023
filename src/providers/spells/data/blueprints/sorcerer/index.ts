import { SpellsBlueprint } from "@rpg-engine/shared";
import { spellCorruptionRuneCreation } from "./SpellCorruptionRuneCreation";
import { spellCurseOfWeakness } from "./SpellCurseOfWeakness";
import { spellDarkRuneCreation } from "./SpellDarkRuneCreation";
import { spellPolymorph } from "./SpellPolymorph";

export const sorcererSpellsIndex = {
  [SpellsBlueprint.CorruptionRuneCreationSpell]: spellCorruptionRuneCreation,
  [SpellsBlueprint.DarkRuneCreationSpell]: spellDarkRuneCreation,
  [SpellsBlueprint.CurseOfWeakness]: spellCurseOfWeakness,
  [SpellsBlueprint.SpellPolymorph]: spellPolymorph,
};

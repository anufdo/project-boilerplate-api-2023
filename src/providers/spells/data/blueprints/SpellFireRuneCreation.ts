import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { AnimationEffectKeys, SpellCastingType } from "@rpg-engine/shared";
import { ISpell, SpellsBlueprint } from "../types/SpellsBlueprintTypes";
import { container } from "@providers/inversify/container";
import { MagicsBlueprint } from "@providers/item/data/types/itemsBlueprintTypes";
import { CharacterItemInventory } from "@providers/character/characterItems/CharacterItemInventory";
import { CharacterInventory } from "@providers/character/CharacterInventory";

export const spellFireRuneCreation: Partial<ISpell> = {
  key: SpellsBlueprint.FireRuneCreationSpell,

  name: "Fire Rune Creation Spell",
  description: "A spell that converts a blank rune, in your inventory, into fire rune.",

  castingType: SpellCastingType.SelfCasting,
  magicWords: "iquar ansr maskan",
  manaCost: 40,
  minLevelRequired: 2,
  minMagicLevelRequired: 3,
  animationKey: AnimationEffectKeys.LevelUp,

  requiredItem: MagicsBlueprint.Rune,

  usableEffect: async (character: ICharacter) => {
    const characterItemInventory = container.get(CharacterItemInventory);
    const characterInventory = container.get(CharacterInventory);

    const removed = await characterItemInventory.decrementItemFromInventory(MagicsBlueprint.Rune, character, 1);
    if (!removed) {
      return;
    }

    const added = await characterItemInventory.addItemToInventory(MagicsBlueprint.FireRune, character);

    if (added || removed) {
      await characterInventory.sendInventoryUpdateEvent(character);
    }
  },
};

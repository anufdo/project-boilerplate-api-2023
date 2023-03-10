import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { IItem } from "@entities/ModuleInventory/ItemModel";
import { container } from "@providers/inversify/container";
import { EffectableAttribute, ItemUsableEffect } from "@providers/item/helper/ItemUsableEffect";
import { ItemSubType, ItemType } from "@rpg-engine/shared";
import round from "lodash/round";
import { PotionsBlueprint } from "../../types/itemsBlueprintTypes";

export const itemGreaterManaPotion: Partial<IItem> = {
  key: PotionsBlueprint.GreaterManaPotion,
  type: ItemType.Consumable,
  subType: ItemSubType.Potion,
  textureAtlas: "items",
  texturePath: "potions/greater-mana-potion.png",

  name: "Mana Potion",
  description: "A greater flask containing blue liquid of a mana potion.",
  weight: 0.5,
  basePrice: 40,
  maxStackSize: 100,
  canSell: false,
  usableEffect: (character: ICharacter) => {
    const itemUsableEffect = container.get(ItemUsableEffect);

    const characterManaPercentage = round(character.mana * 0.15); // 15% of char mana

    itemUsableEffect.apply(character, EffectableAttribute.Mana, characterManaPercentage);
  },
};

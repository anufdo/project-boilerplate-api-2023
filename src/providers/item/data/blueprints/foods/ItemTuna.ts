import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { container } from "@providers/inversify/container";
import { ItemUsableEffect } from "@providers/item/helper/ItemUsableEffect";
import { IConsumableItemBlueprint, ItemSubType, ItemType } from "@rpg-engine/shared";
import { FoodsBlueprint } from "../../types/itemsBlueprintTypes";

export const itemTuna: IConsumableItemBlueprint = {
  key: FoodsBlueprint.Tuna,
  type: ItemType.Consumable,
  subType: ItemSubType.Food,
  textureAtlas: "items",
  texturePath: "foods/tuna.png",
  name: "Tuna",
  description: "Tuna is widely consumed by humans, and is one of the most popular seafoods in the world.",
  weight: 0.25,
  maxStackSize: 100,
  basePrice: 4,
  canSell: false,

  usableEffect: (character: ICharacter) => {
    const itemUsableEffect = container.get(ItemUsableEffect);

    itemUsableEffect.applyEatingEffect(character, 3);
  },
};

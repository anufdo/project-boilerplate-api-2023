import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemUsableEffect } from "@providers/item/helper/ItemUsableEffect";
import { ItemSubType, ItemType } from "@rpg-engine/shared";
import { FoodsBlueprint } from "../../types/itemsBlueprintTypes";

export const itemIceMushroom: Partial<IItem> = {
  key: FoodsBlueprint.IceMushroom,
  type: ItemType.Consumable,
  subType: ItemSubType.Food,
  textureAtlas: "items",
  texturePath: "foods/ice-mushroom.png",
  name: "Ice Mushroom",
  description: "An edible mushroom that can be eaten to restore health.",
  weight: 0.25,
  maxStackSize: 100,
  basePrice: 5,
  canSell: false,

  usableEffect: (character: ICharacter) => {
    ItemUsableEffect.applyEatingEffect(character, 1.5);
  },
};

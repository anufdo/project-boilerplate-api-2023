import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemSlotType, ItemSubType, ItemType } from "@rpg-engine/shared";
import { EntityAttackType } from "@rpg-engine/shared/dist/types/entity.types";
import { SwordBlueprint } from "../../types/itemsBlueprintTypes";

export const itemElvenSword: Partial<IItem> = {
  key: SwordBlueprint.ElvenSword,
  type: ItemType.Weapon,
  subType: ItemSubType.Sword,
  textureAtlas: "items",
  texturePath: "swords/elven-sword.png",
  textureKey: "elven-sword",
  name: "Elven Sword",
  description: "A fine and slender sword crafted by elves.",
  attack: 8,
  defense: 0,
  weight: 1,
  allowedEquipSlotType: [ItemSlotType.LeftHand, ItemSlotType.RightHand],
  rangeType: EntityAttackType.Melee,
};

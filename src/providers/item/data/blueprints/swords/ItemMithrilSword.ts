import { IItem } from "@entities/ModuleInventory/ItemModel";
import { EntityAttackType, ItemSlotType, ItemSubType, ItemType } from "@rpg-engine/shared";
import { SwordsBlueprint } from "../../types/itemsBlueprintTypes";

export const itemMithrilSword: Partial<IItem> = {
  key: SwordsBlueprint.MithrilSword,
  type: ItemType.Weapon,
  subType: ItemSubType.Sword,
  textureAtlas: "items",
  texturePath: "swords/mithril-sword.png",
  name: "Mithril Sword",
  description: "A sword made of mithril, a fictional metal known for its strength and light weight",
  weight: 0.5,
  allowedEquipSlotType: [ItemSlotType.LeftHand, ItemSlotType.RightHand],
  attack: 10,
  defense: 2,
  rangeType: EntityAttackType.Melee,
  basePrice: 70,
};

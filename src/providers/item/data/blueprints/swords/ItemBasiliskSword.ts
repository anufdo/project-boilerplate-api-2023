import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemSlotType, ItemSubType, ItemType } from "@rpg-engine/shared";
import { EntityAttackType } from "@rpg-engine/shared/dist/types/entity.types";
import { SwordBlueprint } from "../../types/itemsBlueprintTypes";

export const itemBasiliskSword: Partial<IItem> = {
  key: SwordBlueprint.BasiliskSword,
  type: ItemType.Weapon,
  subType: ItemSubType.Sword,
  textureAtlas: "items",
  texturePath: "swords/basilisk-sword.png",
  textureKey: "basilisk-sword",
  name: "Basilisk Sword",
  description: "A sword crafted from the remains of a basilisk.",
  attack: 10,
  defense: 3,
  weight: 1,
  allowedEquipSlotType: [ItemSlotType.LeftHand, ItemSlotType.RightHand],
  rangeType: EntityAttackType.Melee,
};

import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemSlotType, ItemSubType, ItemType } from "@rpg-engine/shared";

export const itemRoyalSpear: Partial<IItem> = {
  key: "royal-spear",
  type: ItemType.Weapon,
  subType: ItemSubType.Spear,
  textureAtlas: "items",
  texturePath: "spears/royal-spear.png",
  textureKey: "royal-spear",
  name: "Royal Spear",
  description: "A spear whose elegance is immediately apparent. It was the sole preserve of royalty.",
  defense: 3,
  attack: 10,
  weight: 8,
  allowedEquipSlotType: [ItemSlotType.LeftHand, ItemSlotType.RightHand],
};

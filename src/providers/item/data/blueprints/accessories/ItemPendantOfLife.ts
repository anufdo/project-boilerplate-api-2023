import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemSlotType, ItemSubType, ItemType } from "@rpg-engine/shared";
import { AccessoriesBlueprint } from "../../types/itemsBlueprintTypes";

export const itemPendantOfLife: Partial<IItem> = {
  key: AccessoriesBlueprint.PendantOfLife,
  type: ItemType.Accessory,
  subType: ItemSubType.Accessory,
  textureAtlas: "items",
  texturePath: "accessories/pendand-of-life.png",
  name: "Pendant Of Life",
  description:
    "This enchanted pendant is said to hold the essence of life itself, granting its wearer the ability to restore health and vitality to themselves and others.",
  attack: 0,
  defense: 0,
  weight: 0.1,
  allowedEquipSlotType: [ItemSlotType.Ring],
  basePrice: 5000,
};

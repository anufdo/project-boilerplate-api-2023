import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemSlotType, ItemSubType, ItemType } from "@rpg-engine/shared";
import { RangedWeaponsBlueprint } from "../../types/itemsBlueprintTypes";

export const itemFireBolt: Partial<IItem> = {
  key: RangedWeaponsBlueprint.FireBolt,
  type: ItemType.Weapon,
  subType: ItemSubType.Ranged,
  textureAtlas: "items",
  texturePath: "ranged-weapons/fire-bolt.png",
  name: "Fire Bolt",
  description:
    "An arrow imbued with fire magic. It is said to be able to ignite the air around it and to be capable of causing great damage when it hits its target.",
  attack: 18,
  weight: 0.012,
  allowedEquipSlotType: [ItemSlotType.Accessory],
  maxStackSize: 110,
  basePrice: 15,
  canSell: false,
};

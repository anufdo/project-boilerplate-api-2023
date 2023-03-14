import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemSlotType, ItemSubType, ItemType } from "@rpg-engine/shared";
import { EntityAttackType } from "@rpg-engine/shared/dist/types/entity.types";
import { RangedWeaponRange } from "../../types/RangedWeaponTypes";
import { RangedWeaponsBlueprint } from "../../types/itemsBlueprintTypes";

export const itemCrossbow: Partial<IItem> = {
  key: RangedWeaponsBlueprint.Crossbow,
  type: ItemType.Weapon,
  rangeType: EntityAttackType.Ranged,
  subType: ItemSubType.Ranged,
  textureAtlas: "items",
  texturePath: "ranged-weapons/crossbow.png",
  name: "Crossbow",
  description:
    "A weapon used for shooting bolts and usually made of a strip of wood bent by a cord connecting the two end.",
  attack: 12,
  defense: 5,
  weight: 3,
  allowedEquipSlotType: [ItemSlotType.LeftHand, ItemSlotType.RightHand],
  maxRange: RangedWeaponRange.Short,
  requiredAmmoKeys: [RangedWeaponsBlueprint.Bolt, RangedWeaponsBlueprint.ElvenBolt],
  isTwoHanded: true,
  basePrice: 89,
};

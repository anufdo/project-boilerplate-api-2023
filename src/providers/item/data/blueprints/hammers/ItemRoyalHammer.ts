import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemSlotType, ItemSubType, ItemType } from "@rpg-engine/shared";
import { EntityAttackType } from "@rpg-engine/shared/dist/types/entity.types";
import { HammersBlueprint } from "../../types/itemsBlueprintTypes";

export const itemRoyalHammer: Partial<IItem> = {
  key: HammersBlueprint.RoyalHammer,
  type: ItemType.Tool,
  subType: ItemSubType.Other,
  textureAtlas: "items",
  texturePath: "hammers/royal-hammer.png",
  name: "Royal Hammer",
  description:
    "A large hammer with an ornate handle and head, often made of gold or other precious materials. It is traditionally wielded by royalty as a symbol of their power.",
  attack: 9,
  defense: 5,
  weight: 3,
  allowedEquipSlotType: [ItemSlotType.LeftHand, ItemSlotType.RightHand],
  rangeType: EntityAttackType.Melee,
};

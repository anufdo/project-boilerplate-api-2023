import { IItemUseWith } from "@providers/useWith/useWithTypes";
import { ItemSubType, ItemType } from "@rpg-engine/shared";
import { CraftingResourcesBlueprint } from "../../types/itemsBlueprintTypes";

export const itemWaterBottle: Partial<IItemUseWith> = {
  key: CraftingResourcesBlueprint.WaterBottle,
  type: ItemType.CraftingResource,
  subType: ItemSubType.CraftingResource,
  textureAtlas: "items",
  texturePath: "crafting-resources/water-bottle.png",
  name: "Water",
  description: "A bottle of water",
  weight: 0.05,
  maxStackSize: 100,
  basePrice: 0.1,
};

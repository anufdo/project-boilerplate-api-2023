import { CraftingResourcesBlueprint, PotionsBlueprint } from "@providers/item/data/types/itemsBlueprintTypes";
import { IUseWithCraftingRecipe } from "@providers/useWith/useWithTypes";

export const recipeLightLifePotion: IUseWithCraftingRecipe = {
  outputKey: PotionsBlueprint.LightLifePotion,
  outputQtyRange: [1, 2],
  requiredItems: [
    {
      key: CraftingResourcesBlueprint.Herb,
      qty: 3,
    },
    {
      key: CraftingResourcesBlueprint.WaterBottle,
      qty: 1,
    },
  ],
};

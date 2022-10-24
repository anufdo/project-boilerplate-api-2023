import { CraftingResourcesBlueprint } from "../../types/itemsBlueprintTypes";
import { itemBatsWing } from "./ItemBatsWing";
import { itemBlueFeather } from "./ItemBlueFeather";
import { itemBlueSapphire } from "./ItemBlueSapphire";
import { itemColoredFeather } from "./ItemColoredFeather";
import { itemDiamond } from "./ItemDiamond";
import { itemFeather } from "./ItemFeather";
import { itemGoldenIngot } from "./ItemGoldenIngot";
import { itemGreaterWoodLog } from "./ItemGreaterWoodLog";
import { itemHerb } from "./ItemHerb";
import { itemIronIngot } from "./ItemIronIngot";
import { itemLeather } from "./ItemLeather";
import { itemObsidian } from "./ItemObsidian";
import { itemSilk } from "./ItemSilk";
import { itemWheat } from "./ItemWheat";
import { itemWolfTooth } from "./ItemWolfTooth";

export const craftingResourcesBlueprintIndex = {
  [CraftingResourcesBlueprint.BlueSapphire]: itemBlueSapphire,
  [CraftingResourcesBlueprint.BlueFeather]: itemBlueFeather,
  [CraftingResourcesBlueprint.Leather]: itemLeather,
  [CraftingResourcesBlueprint.BatsWing]: itemBatsWing,
  [CraftingResourcesBlueprint.Silk]: itemSilk,
  [CraftingResourcesBlueprint.ColoredFeather]: itemColoredFeather,
  [CraftingResourcesBlueprint.Diamond]: itemDiamond,
  [CraftingResourcesBlueprint.Feather]: itemFeather,
  [CraftingResourcesBlueprint.GoldenIngot]: itemGoldenIngot,
  [CraftingResourcesBlueprint.Herb]: itemHerb,
  [CraftingResourcesBlueprint.GreaterWoodLog]: itemGreaterWoodLog,
  [CraftingResourcesBlueprint.IronIngot]: itemIronIngot,
  [CraftingResourcesBlueprint.Obsidian]: itemObsidian,
  [CraftingResourcesBlueprint.Wheat]: itemWheat,
  [CraftingResourcesBlueprint.WolfTooth]: itemWolfTooth,
};

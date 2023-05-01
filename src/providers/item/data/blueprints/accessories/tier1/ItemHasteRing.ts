import { CharacterAttributes, ItemSlotType, ItemSubType, ItemType } from "@rpg-engine/shared";
import { IEquippableAccessoryTier1Blueprint } from "../../../types/TierBlueprintTypes";
import { AccessoriesBlueprint } from "../../../types/itemsBlueprintTypes";

export const itemHasteRing: IEquippableAccessoryTier1Blueprint = {
  key: AccessoriesBlueprint.HasteRing,
  type: ItemType.Accessory,
  subType: ItemSubType.Accessory,
  textureAtlas: "items",
  texturePath: "rings/haste-ring.png",
  name: "Haste Ring",
  description:
    "A magical ring that imbues its wearer with the power of speed and quickness. It is said to grant the ability to move and react with lightning-fast reflexes.",
  attack: 5,
  defense: 4,
  tier: 1,
  weight: 0.1,
  allowedEquipSlotType: [ItemSlotType.Ring],
  basePrice: 4500,
  equippedBuff: {
    type: "characterAttribute",
    trait: CharacterAttributes.Speed,
    buffPercentage: 10,
    durationType: "permanent",
    options: {
      messages: {
        activation: "You feel the power of speed and quickness flowing through your body. (+10% speed)",
        deactivation: "You feel the power of speed and quickness leaving your body. (-10% speed)",
      },
    },
  },
};

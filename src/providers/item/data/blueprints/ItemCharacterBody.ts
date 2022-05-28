import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemSubType, ItemType } from "@rpg-engine/shared";
import dayjs from "dayjs";

export const itemCharacterBody: Partial<IItem> = {
  key: "character-body",
  type: ItemType.Container,
  subType: ItemSubType.Body,
  textureAtlas: "death",
  texturePath: "character.png",
  textureKey: "character",
  name: "Character's Body",
  description: "You see a character's body.",
  weight: 100,
  isStorable: false,
  isItemContainer: true, // this will automatically create a container once an this is spawned
  decayTime: dayjs(new Date()).add(1, "hour").toDate(),
};

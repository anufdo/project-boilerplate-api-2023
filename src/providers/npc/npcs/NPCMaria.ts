import { CharacterGender } from "@rpg-engine/shared";
import { generateRandomMovement } from "./abstractions/BaseNeutralNPC";

export const npcMariaMetaData = {
  ...generateRandomMovement(),
  key: "maria",
  name: "Maria",
  textureKey: "female-npc",
  gender: CharacterGender.Female,
};

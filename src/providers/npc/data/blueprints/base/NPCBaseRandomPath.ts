import { INPC } from "@entities/ModuleNPC/NPCModel";
import { FriendlyNPCsBlueprint } from "@providers/npc/data/types/npcsBlueprintTypes";
import { generateRandomMovement } from "../../abstractions/BaseNeutralNPC";

export const npcBaseRandomPath = {
  ...generateRandomMovement(),
  key: FriendlyNPCsBlueprint.BaseRandomPath,
} as Partial<INPC>;

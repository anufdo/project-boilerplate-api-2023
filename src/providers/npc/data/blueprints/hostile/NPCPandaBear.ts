import { INPC } from "@entities/ModuleNPC/NPCModel";
import { Dice } from "@providers/constants/DiceConstants";
import { MovementSpeed } from "@providers/constants/MovementConstants";
import { EXP_RATIO } from "@providers/constants/SkillConstants";
import { FoodsBlueprint } from "@providers/item/data/types/itemsBlueprintTypes";
import { HostileNPCsBlueprint } from "@providers/item/data/types/npcsBlueprintTypes";
import { NPCAlignment } from "@rpg-engine/shared";
import { EntityAttackType } from "@rpg-engine/shared/dist/types/entity.types";
import { generateMoveTowardsMovement } from "../../abstractions/BaseNeutralNPC";

export const npcPandaBear = {
  ...generateMoveTowardsMovement(),
  name: "Panda Bear",
  key: HostileNPCsBlueprint.PandaBear,
  textureKey: HostileNPCsBlueprint.PandaBear,
  alignment: NPCAlignment.Hostile,
  attackType: EntityAttackType.Melee,
  speed: MovementSpeed.Slow,
  baseHealth: 95,
  healthRandomizerDice: Dice.D6,
  canSwitchToRandomTarget: true,
  skills: {
    level: 9,
    strength: {
      level: 9,
    },
    dexterity: {
      level: 6,
    },
  },
  fleeOnLowHealth: true,
  experience: 72 * EXP_RATIO,
  loots: [
    {
      itemBlueprintKey: FoodsBlueprint.Fish,
      chance: 30,
    },
    {
      itemBlueprintKey: FoodsBlueprint.Salmon,
      chance: 20,
    },
    {
      itemBlueprintKey: FoodsBlueprint.Banana,
      chance: 15,
    },
  ],
} as Partial<INPC>;

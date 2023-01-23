import { ISkill, Skill } from "@entities/ModuleCharacter/SkillsModel";
import { INPC, NPC } from "@entities/ModuleNPC/NPCModel";
import { rollDice } from "@providers/constants/DiceConstants";
import { GridManager } from "@providers/map/GridManager";
import { INPCSeedData, NPCLoader } from "@providers/npc/NPCLoader";
import { ToGridX, ToGridY } from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";
import _ from "lodash";

@provide(NPCSeeder)
export class NPCSeeder {
  constructor(private npcLoader: NPCLoader, private gridManager: GridManager) {}

  public async seed(): Promise<void> {
    const npcSeedData = this.npcLoader.loadNPCSeedData();

    for (const [key, NPCData] of npcSeedData.entries()) {
      const npcFound = (await NPC.findOne({ tiledId: NPCData.tiledId, scene: NPCData.scene })) as unknown as INPC;

      NPCData.targetCharacter = undefined; // reset any targets

      await this.setInitialNPCPositionAsSolid(NPCData);

      if (!npcFound) {
        await this.createNewNPCWithSkills(NPCData);
      } else {
        // if npc already exists, restart initial position

        // console.log(`🧍 Updating NPC ${NPCData.key} database data...`);

        await this.resetNPC(npcFound, NPCData);

        await this.updateNPCSkills(NPCData, npcFound);

        const updateData = _.omit(NPCData, ["skills"]);

        await NPC.updateOne(
          { key: key },
          {
            $set: {
              ...updateData,
            },
          },
          {
            upsert: true,
          }
        );
      }
    }
  }

  private async resetNPC(npc: INPC, NPCData: INPCSeedData): Promise<void> {
    try {
      const randomMaxHealth = this.setNPCRandomHealth(NPCData);

      if (randomMaxHealth) {
        npc.health = randomMaxHealth;
        npc.maxHealth = randomMaxHealth;
      } else {
        npc.health = npc.maxHealth;
      }

      npc.mana = npc.maxMana;
      npc.x = npc.initialX;
      npc.y = npc.initialY;
      npc.targetCharacter = undefined;
      npc.currentMovementType = npc.originalMovementType;

      await npc.save();
    } catch (error) {
      console.log(`❌ Failed to reset NPC ${NPCData.key}`);
      console.error(error);
    }
  }

  private async updateNPCSkills(NPCData: INPCSeedData, npc: INPC): Promise<void> {
    const skills = this.setNPCRandomSkillLevel(NPCData);

    if (NPCData.skills) {
      await Skill.updateOne(
        {
          owner: npc._id,
          ownerType: "NPC",
        },
        {
          ...skills,
        }
      );
    }
  }

  private async createNewNPCWithSkills(NPCData: INPCSeedData): Promise<void> {
    try {
      const skills = new Skill({ ...(this.setNPCRandomSkillLevel(NPCData) as unknown as ISkill), ownerType: "NPC" }); // randomize skills present in the metadata only
      const npcHealth = this.setNPCRandomHealth(NPCData);

      const newNPC = new NPC({
        ...NPCData,
        health: npcHealth,
        maxHealth: npcHealth,
        skills: skills._id,
      });
      await newNPC.save();

      skills.owner = newNPC._id;

      await skills.save();
    } catch (error) {
      console.log(`❌ Failed to spawn NPC ${NPCData.key}. Is the blueprint for this NPC missing?`);

      console.error(error);
    }
  }

  private setNPCRandomSkillLevel(NPCData: INPCSeedData): Object {
    // Deep cloning object because all equals NPCs seeds references the same object.
    const clonedNPC = _.cloneDeep(NPCData);
    if (!clonedNPC.skillRandomizerDice) return clonedNPC.skills;

    /**
     * If we have skills to be randomized we apply the randomDice value to that
     * if not we get all skills added in the blueprint to change it's level
     */
    const skillKeys: string[] = clonedNPC.skillsToBeRandomized
      ? clonedNPC.skillsToBeRandomized
      : Object.keys(clonedNPC.skills);

    for (const skill of skillKeys) {
      if (!clonedNPC.skills[skill]) continue;

      if (skill === "level") {
        clonedNPC.skills[skill] = clonedNPC.skills[skill] + rollDice(clonedNPC.skillRandomizerDice);
      } else {
        clonedNPC.skills[skill].level = clonedNPC.skills[skill].level + rollDice(clonedNPC.skillRandomizerDice);
      }
    }

    return clonedNPC.skills;
  }

  private setNPCRandomHealth(NPCData: INPCSeedData): number {
    if (NPCData.healthRandomizerDice && NPCData.baseHealth) {
      return NPCData.baseHealth + rollDice(NPCData.healthRandomizerDice);
    }

    return NPCData.maxHealth;
  }

  private async setInitialNPCPositionAsSolid(NPCData: INPCSeedData): Promise<void> {
    const { gridOffsetX, gridOffsetY } = this.gridManager.getMapOffset(NPCData.scene)!;

    try {
      // mark NPC initial position as solid on the map (pathfinding)
      await this.gridManager.setWalkable(
        NPCData.scene,
        ToGridX(NPCData.x) + gridOffsetX,
        ToGridY(NPCData.y) + gridOffsetY,
        false
      );
    } catch (error) {
      console.log(
        `❌ Failed to set NPC ${NPCData.key} initial position (${NPCData.x}, ${NPCData.y}) as solid on the map (${NPCData.scene})`
      );

      console.error(error);
    }
  }
}

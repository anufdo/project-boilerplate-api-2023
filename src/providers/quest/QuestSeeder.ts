import { provide } from "inversify-binding-decorators";
import { QuestLoader } from "./QuestLoader";
import { IQuest as IQuestModel, Quest } from "@entities/ModuleQuest/QuestModel";
import { IQuest, QuestStatus, QuestType } from "@rpg-engine/shared";
import {
  IQuestObjectiveInteraction,
  IQuestObjectiveKill,
  QuestObjectiveInteraction,
  QuestObjectiveKill,
} from "@entities/ModuleQuest/QuestObjectiveModel";
import { QuestReward } from "@entities/ModuleQuest/QuestRewardModel";
import { QuestRecord } from "@entities/ModuleQuest/QuestRecordModel";
import _ from "lodash";

@provide(QuestSeeder)
export class QuestSeeder {
  constructor(private questLoader: QuestLoader) {}

  public async seed(): Promise<void> {
    const questSeedData = await this.questLoader.loadQuestSeedData();

    if (_.isEmpty(questSeedData)) {
      console.log("🤷 No Quest data to seed");
    }

    for (const [, QuestData] of questSeedData.entries()) {
      const questFound = (await Quest.findOne({
        npcId: QuestData.npcId,
        key: QuestData.key,
      })) as unknown as IQuestModel;

      if (!questFound) {
        console.log(`🌱 Seeding database with Quest data for Quest with key: ${QuestData.key}`);

        await this.createNewQuest(QuestData as IQuest);
      } else {
        // if quest already exists, reset all objectives to pending
        // and remove all existing quest records
        // in case someone started it

        console.log(`🔎 Updating Quest ${QuestData.key} database data...`);
        const isPending = await questFound.hasStatus(QuestStatus.Pending);
        if (!isPending) {
          const objectives = await questFound.objectivesDetails;
          for (const obj of objectives) {
            obj.status = QuestStatus.Pending;
            await obj.save();
          }

          await QuestRecord.deleteMany({
            objective: { $in: questFound.objectives },
          });
        }
      }
    }
  }

  private async createNewQuest(QuestData: IQuest): Promise<void> {
    try {
      const newQuestData: Partial<IQuest> = {
        npcId: QuestData.npcId,
        title: QuestData.title,
        key: QuestData.key,
        description: QuestData.description,
        rewards: [],
        objectives: [],
      };

      for (const reward of QuestData.rewards) {
        let newReward = new QuestReward({
          ...reward,
        });
        newReward = await newReward.save();
        newQuestData.rewards!.push(newReward._id);
      }

      let newQuest = new Quest({
        ...newQuestData,
      });
      newQuest = await newQuest.save();

      for (const obj of QuestData.objectives) {
        let newObj: IQuestObjectiveKill | IQuestObjectiveInteraction;
        switch (obj.type) {
          case QuestType.Kill:
            newObj = new QuestObjectiveKill({
              ...obj,
              quest: newQuest._id,
            });
            newObj = await newObj.save();
            break;
          case QuestType.Interaction:
            newObj = new QuestObjectiveInteraction({
              ...obj,
              quest: newQuest._id,
            });
            newObj = await newObj.save();
            break;
          default:
            throw new Error(`Invalid quest type ${obj.type}`);
        }
        newQuest.objectives!.push(newObj._id);
      }
      await newQuest.save();
    } catch (error) {
      console.log(`❌ Failed to spawn Quest ${QuestData.key}. Is the blueprint for this Quest missing?`);
      console.error(error);
    }
  }
}

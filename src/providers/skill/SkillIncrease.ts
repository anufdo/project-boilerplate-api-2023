import { Character, ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { Equipment, IEquipment } from "@entities/ModuleCharacter/EquipmentModel";
import { ISkill, Skill } from "@entities/ModuleCharacter/SkillsModel";
import { IItem } from "@entities/ModuleInventory/ItemModel";
import { INPC } from "@entities/ModuleNPC/NPCModel";
import { AnimationEffect } from "@providers/animation/AnimationEffect";
import { CharacterView } from "@providers/character/CharacterView";
import { CharacterWeapon } from "@providers/character/CharacterWeapon";
import { CharacterWeight } from "@providers/character/CharacterWeight";
import { CharacterBonusPenalties } from "@providers/character/characterBonusPenalties/CharacterBonusPenalties";
import { CharacterClassBonusOrPenalties } from "@providers/character/characterBonusPenalties/CharacterClassBonusOrPenalties";
import { CharacterRaceBonusOrPenalties } from "@providers/character/characterBonusPenalties/CharacterRaceBonusOrPenalties";
import { CharacterBuffSkill } from "@providers/character/characterBuff/CharacterBuffSkill";
import { NPC_GIANT_FORM_EXPERIENCE_MULTIPLIER } from "@providers/constants/NPCConstants";
import {
  BASIC_INCREASE_HEALTH_MANA,
  SP_CRAFTING_INCREASE_RATIO,
  SP_INCREASE_RATIO,
  SP_MAGIC_INCREASE_TIMES_MANA,
} from "@providers/constants/SkillConstants";
import { InMemoryHashTable } from "@providers/database/InMemoryHashTable";
import { SocketMessaging } from "@providers/sockets/SocketMessaging";
import { SpellLearn } from "@providers/spells/SpellLearn";
import {
  AnimationEffectKeys,
  CharacterClass,
  CharacterSocketEvents,
  ICharacterAttributeChanged,
  IUIShowMessage,
  LifeBringerRaces,
  ShadowWalkerRaces,
  UISocketEvents,
} from "@rpg-engine/shared";
import { ItemSubType } from "@rpg-engine/shared/dist/types/item.types";
import {
  BasicAttribute,
  IIncreaseSPResult,
  IIncreaseXPResult,
  ISkillDetails,
  ISkillEventFromServer,
  SKILLS_MAP,
  SkillEventType,
  SkillSocketEvents,
} from "@rpg-engine/shared/dist/types/skills.types";
import { provide } from "inversify-binding-decorators";
import _ from "lodash";
import { Types } from "mongoose";
import { SkillCalculator } from "./SkillCalculator";
import { SkillCraftingMapper } from "./SkillCraftingMapper";
import { SkillFunctions } from "./SkillFunctions";
import { SkillGainValidation } from "./SkillGainValidation";
import { CraftingSkillsMap } from "./constants";

@provide(SkillIncrease)
export class SkillIncrease {
  constructor(
    private skillCalculator: SkillCalculator,
    private socketMessaging: SocketMessaging,
    private characterView: CharacterView,
    private animationEffect: AnimationEffect,
    private spellLearn: SpellLearn,
    private characterBonusPenalties: CharacterBonusPenalties,
    private skillFunctions: SkillFunctions,
    private skillGainValidation: SkillGainValidation,
    private characterWeapon: CharacterWeapon,
    private inMemoryHashTable: InMemoryHashTable,
    private characterClassBonusOrPenalties: CharacterClassBonusOrPenalties,
    private characterRaceBonusOrPenalties: CharacterRaceBonusOrPenalties,
    private characterWeight: CharacterWeight,
    private characterBuffSkill: CharacterBuffSkill,
    private skillMapper: SkillCraftingMapper
  ) {}

  /**
   * Calculates the sp gained according to weapons used and the xp gained by a character every time it causes damage in battle.
   * If new skill level is reached, sends the corresponding event to the character
   *
   */
  public async increaseSkillsOnBattle(attacker: ICharacter, target: ICharacter | INPC, damage: number): Promise<void> {
    // Get character skills and equipment to upgrade them
    const skills = (await Skill.findById(attacker.skills).lean()) as ISkill;
    if (!skills) {
      throw new Error(`skills not found for character ${attacker.id}`);
    }

    const equipment = await Equipment.findById(attacker.equipment).lean();
    if (!equipment) {
      throw new Error(`equipment not found for character ${attacker.id}`);
    }

    const weapon = await this.characterWeapon.getWeapon(attacker);

    const weaponSubType = weapon?.item ? weapon?.item.subType || "None" : "None";
    const skillName = SKILLS_MAP.get(weaponSubType);

    if (!skillName) {
      throw new Error(`Skill not found for weapon ${weaponSubType}`);
    }

    await this.recordXPinBattle(attacker, target, damage);

    const canIncreaseSP = this.skillGainValidation.canUpdateSkills(skills, skillName);

    if (!canIncreaseSP) {
      return;
    }

    // stronger the opponent, higher SP per hit it gives in your combat skills
    const bonus = await this.skillFunctions.calculateBonus(target.skills);
    const increasedWeaponSP = await this.increaseSP(attacker, skills, weaponSubType, undefined, SKILLS_MAP, bonus);

    let increasedStrengthSP;
    if (weaponSubType !== ItemSubType.Magic && weaponSubType !== ItemSubType.Staff) {
      increasedStrengthSP = await this.increaseSP(attacker, skills, BasicAttribute.Strength);
    }

    await this.skillFunctions.updateSkills(skills, attacker);

    await this.characterBonusPenalties.applyRaceBonusPenalties(attacker, weaponSubType);

    if (weaponSubType !== ItemSubType.Magic && weaponSubType !== ItemSubType.Staff) {
      await this.characterBonusPenalties.applyRaceBonusPenalties(attacker, BasicAttribute.Strength);
    }

    // If character strength skill level increased, send level up event
    if (increasedStrengthSP && increasedStrengthSP.skillLevelUp && attacker.channelId) {
      await this.skillFunctions.sendSkillLevelUpEvents(increasedStrengthSP, attacker, target);
      await this.characterWeight.updateCharacterWeight(attacker);
    }

    // If character skill level increased, send level up event specifying the skill that upgraded
    if (increasedWeaponSP.skillLevelUp && attacker.channelId) {
      await this.skillFunctions.sendSkillLevelUpEvents(increasedWeaponSP, attacker, target);
    }
  }

  public async increaseShieldingSP(character: ICharacter): Promise<void> {
    const characterWithRelations = (await Character.findById(character.id)
      .populate({
        path: "skills",
        model: "Skill",
      })
      .lean()
      .populate({
        path: "equipment",
        model: "Equipment",

        populate: {
          path: "rightHand leftHand",
          model: "Item",
        },
      })
      .lean()) as ICharacter;

    if (!characterWithRelations) {
      throw new Error(`character not found for id ${character.id}`);
    }
    const skills = characterWithRelations.skills as ISkill;

    const canIncreaseSP = this.skillGainValidation.canUpdateSkills(skills as ISkill, "shielding");

    if (!canIncreaseSP) {
      return;
    }

    const equipment = characterWithRelations.equipment as IEquipment;

    const rightHandItem = equipment?.rightHand as IItem;
    const leftHandItem = equipment?.leftHand as IItem;

    let result = {} as IIncreaseSPResult;
    if (rightHandItem?.subType === ItemSubType.Shield) {
      result = await this.increaseSP(character, skills, rightHandItem.subType);
    } else {
      if (leftHandItem?.subType === ItemSubType.Shield) {
        result = await this.increaseSP(character, skills, leftHandItem.subType);
      }
    }

    await this.skillFunctions.updateSkills(skills, character);
    if (!_.isEmpty(result)) {
      if (result.skillLevelUp && characterWithRelations.channelId) {
        await this.skillFunctions.sendSkillLevelUpEvents(result, characterWithRelations);
      }

      if (rightHandItem?.subType === ItemSubType.Shield) {
        await this.characterBonusPenalties.applyRaceBonusPenalties(character, ItemSubType.Shield);
      } else {
        if (leftHandItem?.subType === ItemSubType.Shield) {
          await this.characterBonusPenalties.applyRaceBonusPenalties(character, ItemSubType.Shield);
        }
      }
    }
  }

  public async increaseMagicSP(character: ICharacter, power: number): Promise<void> {
    await this.increaseBasicAttributeSP(character, BasicAttribute.Magic, this.getMagicSkillIncreaseCalculator(power));
  }

  public async increaseMagicResistanceSP(character: ICharacter, power: number): Promise<void> {
    await this.increaseBasicAttributeSP(
      character,
      BasicAttribute.MagicResistance,
      this.getMagicSkillIncreaseCalculator(power)
    );
  }

  public async increaseBasicAttributeSP(
    character: ICharacter,
    attribute: BasicAttribute,
    skillPointsCalculator?: Function
  ): Promise<void> {
    const skills = (await Skill.findById(character.skills).lean()) as ISkill;
    if (!skills) {
      throw new Error(`skills not found for character ${character.id}`);
    }

    const canIncreaseSP = this.skillGainValidation.canUpdateSkills(skills as ISkill, attribute);

    if (!canIncreaseSP) {
      return;
    }

    const result = await this.increaseSP(character, skills, attribute, skillPointsCalculator);
    await this.skillFunctions.updateSkills(skills, character);

    if (result.skillLevelUp && character.channelId) {
      // If BasicAttribute(except dexterity) level up we clean the data from Redis
      if (attribute !== BasicAttribute.Dexterity && skills.owner) {
        await this.inMemoryHashTable.delete(skills.owner.toString(), "totalAttack");
        await this.inMemoryHashTable.delete(skills.owner.toString(), "totalDefense");
      }

      await this.skillFunctions.sendSkillLevelUpEvents(result, character);
    }

    await this.characterBonusPenalties.applyRaceBonusPenalties(character, attribute);
  }

  public async increaseCraftingSP(character: ICharacter, craftedItemKey: string): Promise<void> {
    const skillToUpdate = this.skillMapper.getCraftingSkillToUpdate(craftedItemKey);

    if (!skillToUpdate) {
      throw new Error(`skill not found for item ${craftedItemKey}`);
    }

    const skills = (await Skill.findById(character.skills)) as ISkill;
    if (!skills) {
      throw new Error(`skills not found for character ${character.id}`);
    }

    const canIncreaseSP = this.skillGainValidation.canUpdateSkills(skills as ISkill, skillToUpdate);

    if (!canIncreaseSP) {
      return;
    }

    const craftSkillPointsCalculator = (skillDetails: ISkillDetails): number => {
      return this.calculateNewCraftSP(skillDetails);
    };

    const result = await this.increaseSP(
      character,
      skills,
      craftedItemKey,
      craftSkillPointsCalculator,
      CraftingSkillsMap
    );
    await this.skillFunctions.updateSkills(skills, character);

    await this.characterBonusPenalties.applyRaceBonusPenalties(character, skillToUpdate);

    if (result.skillLevelUp && character.channelId) {
      await this.skillFunctions.sendSkillLevelUpEvents(result, character);
    }
  }

  /**
   * This function distributes
   * the xp stored in the xpToRelease array to the corresponding
   * characters and notifies them if leveled up
   */
  public async releaseXP(target: INPC): Promise<void> {
    let levelUp = false;
    let previousLevel = 0;
    // The xp gained is released once the NPC dies.
    // Store the xp in the xpToRelease array
    // before adding the character to the array, check if the character already caused some damage
    while (target.xpToRelease && target.xpToRelease.length) {
      const record = target.xpToRelease.shift();

      // Get attacker character data
      const character = (await Character.findById(record!.charId)) as ICharacter;
      if (!character) {
        // if attacker does not exist anymore
        // call again the function without this record
        return this.releaseXP(target);
      }

      // Get character skills
      const skills = (await Skill.findById(character.skills).lean()) as ISkill;

      if (!skills) {
        // if attacker skills does not exist anymore
        // call again the function without this record
        return this.releaseXP(target);
      }

      const exp = record!.xp! * (target.isGiantForm ? NPC_GIANT_FORM_EXPERIENCE_MULTIPLIER : 1);

      skills.experience += exp;
      skills.xpToNextLevel = this.skillCalculator.calculateXPToNextLevel(skills.experience, skills.level + 1);

      while (skills.xpToNextLevel <= 0) {
        if (previousLevel === 0) {
          previousLevel = skills.level;
        }
        skills.level++;
        skills.xpToNextLevel = this.skillCalculator.calculateXPToNextLevel(skills.experience, skills.level + 1);
        levelUp = true;
      }

      await this.skillFunctions.updateSkills(skills, character);

      if (levelUp) {
        await this.increaseMaxManaMaxHealth(character._id);

        await this.sendExpLevelUpEvents({ level: skills.level, previousLevel, exp }, character, target);
        setTimeout(async () => {
          await this.spellLearn.learnLatestSkillLevelSpells(character._id, true);
        }, 5000);
      }

      await this.warnCharactersAroundAboutExpGains(character, exp);
    }

    await target.save();
  }

  private async sendExpLevelUpEvents(
    expData: IIncreaseXPResult,
    character: ICharacter,
    target: INPC | ICharacter
  ): Promise<void> {
    this.socketMessaging.sendEventToUser<IUIShowMessage>(character.channelId!, UISocketEvents.ShowMessage, {
      message: `You advanced from level ${expData.level - 1} to level ${expData.level}.`,
      type: "info",
    });

    const payload = {
      characterId: character.id,
      eventType: SkillEventType.LevelUp,
    };

    this.socketMessaging.sendEventToUser(character.channelId!, SkillSocketEvents.SkillGain, payload);
    await this.animationEffect.sendAnimationEventToCharacter(character, AnimationEffectKeys.LevelUp);

    await this.socketMessaging.sendEventToCharactersAroundCharacter(character, SkillSocketEvents.SkillGain, payload);
  }

  private async warnCharactersAroundAboutExpGains(character: ICharacter, exp: number): Promise<void> {
    const levelUpEventPayload: Partial<ISkillEventFromServer> = {
      characterId: character.id,
      exp,
    };

    const nearbyCharacters = await this.characterView.getCharactersInView(character);

    for (const nearbyCharacter of nearbyCharacters) {
      this.socketMessaging.sendEventToUser(
        nearbyCharacter.channelId!,
        SkillSocketEvents.ExperienceGain,
        levelUpEventPayload
      );
    }

    // warn character about his experience gain
    this.socketMessaging.sendEventToUser(character.channelId!, SkillSocketEvents.ExperienceGain, levelUpEventPayload);

    // refresh skills (lv, xp, xpToNextLevel)
    const skill = await Skill.findById(character.skills).lean();

    this.socketMessaging.sendEventToUser(character.channelId!, SkillSocketEvents.ReadInfo, {
      skill,
    });
  }

  private async increaseSP(
    character: ICharacter,
    skills: ISkill,
    skillKey: string,
    skillPointsCalculator?: Function,
    skillsMap: Map<string, string> = SKILLS_MAP,
    bonus?: number
  ): Promise<IIncreaseSPResult> {
    let skillLevelUp = false;
    const skillToUpdate = skillsMap.get(skillKey) ?? this.skillMapper.getCraftingSkillToUpdate(skillKey);

    if (!skillToUpdate) {
      throw new Error(`skill not found for item subtype ${skillKey}`);
    }

    if (!skillPointsCalculator) {
      skillPointsCalculator = (skillDetails: ISkillDetails, bonus?: number): number => {
        return this.calculateNewSP(skillDetails, bonus);
      };
    }

    const updatedSkillDetails = skills[skillToUpdate] as ISkillDetails;

    updatedSkillDetails.level = await this.characterBuffSkill.getSkillLevelWithoutBuffs(
      character,
      skills,
      skillToUpdate
    );

    updatedSkillDetails.skillPoints = skillPointsCalculator(updatedSkillDetails, bonus);
    updatedSkillDetails.skillPointsToNextLevel = this.skillCalculator.calculateSPToNextLevel(
      updatedSkillDetails.skillPoints,
      updatedSkillDetails.level + 1
    );

    if (updatedSkillDetails.skillPointsToNextLevel <= 0) {
      skillLevelUp = true;
      updatedSkillDetails.level++;
      updatedSkillDetails.skillPointsToNextLevel = this.skillCalculator.calculateSPToNextLevel(
        updatedSkillDetails.skillPoints,
        updatedSkillDetails.level + 1
      );
    }

    skills[skillToUpdate] = updatedSkillDetails;

    return {
      skillName: skillToUpdate,
      skillLevelBefore: updatedSkillDetails.level - 1,
      skillLevelAfter: updatedSkillDetails.level,
      skillLevelUp,
      skillPoints: updatedSkillDetails.skillPoints,
      skillPointsToNextLevel: updatedSkillDetails.skillPointsToNextLevel,
    };
  }

  private calculateNewSP(skillDetails: ISkillDetails, bonus?: number): number {
    let spIncreaseRatio = SP_INCREASE_RATIO;
    if (typeof bonus === "number") {
      spIncreaseRatio += bonus;
    }
    return Math.round((skillDetails.skillPoints + spIncreaseRatio) * 100) / 100;
  }

  private calculateNewCraftSP(skillDetails: ISkillDetails): number {
    return Math.round((skillDetails.skillPoints + SP_CRAFTING_INCREASE_RATIO) * 100) / 100;
  }

  /**
   * Calculates the xp gained by a character every time it causes damage in battle
   * In case the target is NPC, it stores the character's xp gained in the xpToRelease array
   */
  public async recordXPinBattle(attacker: ICharacter, target: ICharacter | INPC, damage: number): Promise<void> {
    // For now, only supported increasing XP when target is NPC
    if (target.type === "NPC" && damage > 0) {
      target = target as INPC;

      // Store the xp in the xpToRelease array
      // before adding the character to the array, check if the character already caused some damage
      if (typeof target.xpToRelease !== "undefined") {
        let found = false;
        for (const i in target.xpToRelease) {
          if (target.xpToRelease[i].charId?.toString() === attacker.id) {
            found = true;
            target.xpToRelease[i].xp! += target.xpPerDamage * damage;
            break;
          }
        }
        if (!found) {
          target.xpToRelease.push({ charId: attacker.id, xp: target.xpPerDamage * damage });
        }
      } else {
        target.xpToRelease = [{ charId: attacker.id, xp: target.xpPerDamage * damage }];
      }

      await target.save();
    }
  }

  private getMagicSkillIncreaseCalculator(spellPower: number): Function {
    return ((power: number, skillDetails: ISkillDetails): number => {
      const manaSp = Math.round((power ?? 0) * SP_MAGIC_INCREASE_TIMES_MANA * 100) / 100;
      return this.calculateNewSP(skillDetails) + manaSp;
    }).bind(this, spellPower);
  }

  private calculateIncreaseRate(maxValue: number): number {
    let increaseRate = 1.05;

    if (maxValue >= 900) {
      increaseRate = 1.01;
    } else if (maxValue >= 700) {
      increaseRate = 1.02;
    } else if (maxValue >= 500) {
      increaseRate = 1.03;
    }

    return increaseRate;
  }

  public async increaseMaxManaMaxHealth(characterId: Types.ObjectId): Promise<void> {
    const character = (await Character.findById(characterId).lean()) as ICharacter;
    const skills = (await Skill.findById(character.skills).lean()) as ISkill;

    const classBonusOrPenalties = this.characterClassBonusOrPenalties.getClassBonusOrPenalties(
      character.class as CharacterClass
    );

    const raceBonusOrPenaltises = this.characterRaceBonusOrPenalties.getRaceBonusOrPenaltises(
      character.race as LifeBringerRaces | ShadowWalkerRaces
    );

    const level = skills.level;
    const baseValue = 100;

    const totalStrength =
      Math.round(
        (classBonusOrPenalties.basicAttributes.strength + raceBonusOrPenaltises.basicAttributes.strength) * 100
      ) / 100;
    const increaseRateStrength = 1 + BASIC_INCREASE_HEALTH_MANA * (1 + totalStrength);
    const maxHealth = Math.round(baseValue * Math.pow(increaseRateStrength, level - 1));

    const totalMagic =
      Math.round((classBonusOrPenalties.basicAttributes.magic + raceBonusOrPenaltises.basicAttributes.magic) * 100) /
      100;
    const increaseRateMagic = 1 + BASIC_INCREASE_HEALTH_MANA * (1 + totalMagic);
    const maxMana = Math.round(baseValue * Math.pow(increaseRateMagic, level - 1));

    const result = await this.updateEntitiesAttributes(character._id, { maxHealth, maxMana });

    if (!result) {
      throw new Error(`Failed to increase max health and mana. Character ${character._id} not found.`);
    }
  }

  private async updateEntitiesAttributes(
    characterId: Types.ObjectId,
    updateAttributes: { maxHealth: number; maxMana: number }
  ): Promise<boolean> {
    const { maxHealth, maxMana } = Object.freeze(updateAttributes);

    const character = (await Character.findOneAndUpdate(
      { _id: characterId },
      { maxHealth, maxMana },
      { new: true }
    ).lean()) as ICharacter;

    if (!character) {
      return false;
    }

    const payload: ICharacterAttributeChanged = {
      targetId: character._id,
      maxHealth,
      maxMana,
    };

    this.socketMessaging.sendEventToUser(character.channelId!, CharacterSocketEvents.AttributeChanged, payload);

    if (character.maxHealth === maxHealth && character.maxMana === maxMana) {
      return true;
    }

    return false;
  }
}

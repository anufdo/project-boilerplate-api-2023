import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { CharacterTextureChange } from "@providers/character/CharacterTextureChange";
import { CharacterBuffActivator } from "@providers/character/characterBuff/CharacterBuffActivator";
import { container } from "@providers/inversify/container";
import {
  AnimationEffectKeys,
  BasicAttribute,
  CharacterBuffDurationType,
  CharacterBuffType,
  CharacterClass,
  SpellCastingType,
} from "@rpg-engine/shared";
import { SpellCalculator } from "../../abstractions/SpellCalculator";
import { ISpell, SpellsBlueprint } from "../../types/SpellsBlueprintTypes";

export const spellShapeshift: Partial<ISpell> = {
  key: SpellsBlueprint.DruidShapeshift,
  name: "Shapeshift Spell",
  description: "A spell designed to turn a druid into a Bear. Raise Attack and Resistance.",
  castingType: SpellCastingType.SelfCasting,
  magicWords: "talas qabi",
  manaCost: 150,
  minLevelRequired: 8,
  minMagicLevelRequired: 5,
  cooldown: 15,
  castingAnimationKey: AnimationEffectKeys.ManaHeal,
  characterClass: [CharacterClass.Druid],

  usableEffect: async (character: ICharacter) => {
    const characterBuffActivator = container.get(CharacterBuffActivator);
    const characterTextureChange = container.get(CharacterTextureChange);
    const spellCalculator = container.get(SpellCalculator);

    const timeoutInSecs = await spellCalculator.calculateTimeoutBasedOnSkillLevel(character, BasicAttribute.Magic, {
      min: 15,
      max: 60,
    });

    const buffPercentage = await spellCalculator.calculateBuffBasedOnSkillLevel(character, BasicAttribute.Magic, {
      min: 10,
      max: 20,
    });

    await characterBuffActivator.enableTemporaryBuff(character, {
      type: CharacterBuffType.Skill,
      trait: BasicAttribute.Strength,
      buffPercentage: buffPercentage,
      durationSeconds: timeoutInSecs,
      durationType: CharacterBuffDurationType.Temporary,
      options: {
        messages: {
          activation:
            "You feel stronger as a bear. Your strength and resistance are increased by " + buffPercentage + "%.",
          deactivation: "You feel weaker again.",
        },
      },
    });

    await characterBuffActivator.enableTemporaryBuff(character, {
      type: CharacterBuffType.Skill,
      trait: BasicAttribute.Resistance,
      buffPercentage: buffPercentage,
      durationSeconds: timeoutInSecs,
      durationType: CharacterBuffDurationType.Temporary,
    });

    await characterTextureChange.changeTexture(character, "brown-bear", timeoutInSecs, "shapeshift");
  },
};

import { Character, ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { ISkill } from "@entities/ModuleCharacter/SkillsModel";
import { AnimationEffect } from "@providers/animation/AnimationEffect";
import { CharacterValidation } from "@providers/character/CharacterValidation";
import { CharacterBonusPenalties } from "@providers/character/characterBonusPenalties/CharacterBonusPenalties";
import { CharacterItems } from "@providers/character/characterItems/CharacterItems";
import { itemsBlueprintIndex } from "@providers/item/data/index";
import { EffectableAttribute, ItemUsableEffect } from "@providers/item/helper/ItemUsableEffect";
import { SkillIncrease } from "@providers/skill/SkillIncrease";
import { SocketMessaging } from "@providers/sockets/SocketMessaging";
import { ISpell } from "@providers/spells/data/types/SpellsBlueprintTypes";
import { BasicAttribute, CharacterSocketEvents, ICharacterAttributeChanged } from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";
import { spellsBlueprints } from "./data/blueprints/index";
import { CharacterEntitiesBuff } from "@providers/character/CharacterBuffer/CharacterEntitiesBuff";
import { SpellValidation } from "./SpellValidation";
import { InMemoryHashTable } from "@providers/database/InMemoryHashTable";

@provide(SpellCast)
export class SpellCast {
  constructor(
    private socketMessaging: SocketMessaging,
    private characterValidation: CharacterValidation,
    private animationEffect: AnimationEffect,
    private characterItems: CharacterItems,
    private skillIncrease: SkillIncrease,
    private characterBonusPenalties: CharacterBonusPenalties,
    private itemUsableEffect: ItemUsableEffect,
    private characterEntitiesBuff: CharacterEntitiesBuff,
    private spellValidation: SpellValidation,
    private inMemoryHashTable: InMemoryHashTable
  ) {}

  public isSpellCasting(msg: string): boolean {
    return !!this.getSpell(msg);
  }

  public async castSpell(magicWords: string, character: ICharacter): Promise<boolean> {
    if (!this.characterValidation.hasBasicValidation(character)) {
      return false;
    }

    const spell = this.getSpell(magicWords);
    if (!(await this.isSpellCastingValid(spell, character))) {
      return false;
    }

    const namespace = `character-skill-buff:${character.skills}`;
    const key = spell.attribute;

    if (key) {
      const buffActivated = await this.inMemoryHashTable.get(namespace, key);

      if (buffActivated) {
        this.socketMessaging.sendErrorMessageToCharacter(character, `Sorry, ${spell.name} is already activated.`);
        return false;
      }
    }

    await spell.usableEffect(character);

    this.itemUsableEffect.apply(character, EffectableAttribute.Mana, -1 * spell.manaCost);
    await character.save();

    await this.sendPostSpellCastEvents(character, spell);

    await this.skillIncrease.increaseMagicSP(character, spell.manaCost);

    await this.characterBonusPenalties.applyRaceBonusPenalties(character, BasicAttribute.Magic);

    return true;
  }

  private async isSpellCastingValid(spell, character: ICharacter): Promise<boolean> {
    if (!spell) {
      this.socketMessaging.sendErrorMessageToCharacter(character, "Sorry, spell not found.");
      return false;
    }

    if (!character.learnedSpells || character.learnedSpells.indexOf(spell.key) < 0) {
      this.socketMessaging.sendErrorMessageToCharacter(character, "Sorry, you have not learned this spell.");
      return false;
    }

    const cannotCastMsg = "Sorry, you can not cast this spell.";
    if (!this.spellValidation.isAvailableForCharacterClass(spell, character)) {
      this.socketMessaging.sendErrorMessageToCharacter(character, cannotCastMsg);
      return false;
    }

    if (character.mana < spell.manaCost) {
      this.socketMessaging.sendErrorMessageToCharacter(character, "Sorry, you do not have mana to cast this spell.");
      return false;
    }

    if (spell.requiredItem) {
      const required = itemsBlueprintIndex[spell.requiredItem];
      if (!required) {
        this.socketMessaging.sendErrorMessageToCharacter(character, cannotCastMsg);

        console.log(`❌ SpellCast: Missing item blueprint for key ${spell.requiredItem}`);
        return false;
      }

      const hasItem = await this.characterItems.hasItemByKey(required.key, character, "inventory");
      if (!hasItem) {
        this.socketMessaging.sendErrorMessageToCharacter(
          character,
          `Sorry, you must have a ${required.name} in inventory to cast this spell.`
        );
        return false;
      }
    }

    const updatedCharacter = (await Character.findOne({ _id: character._id }).populate(
      "skills"
    )) as unknown as ICharacter;
    const skills = updatedCharacter.skills as unknown as ISkill;

    if (!skills) {
      this.socketMessaging.sendErrorMessageToCharacter(
        character,
        "Sorry, you can not cast this spell without any skills."
      );
      return false;
    }

    if (skills.level < spell.minLevelRequired) {
      this.socketMessaging.sendErrorMessageToCharacter(
        character,
        "Sorry, you can not cast this spell at this character level."
      );
      return false;
    }

    if (skills.magic.level < spell.minMagicLevelRequired) {
      this.socketMessaging.sendErrorMessageToCharacter(
        character,
        "Sorry, you can not cast this spell at this character magic level."
      );
      return false;
    }

    return true;
  }

  private getSpell(magicWords: string): any {
    for (const key in spellsBlueprints) {
      const spell = spellsBlueprints[key];
      if (spell.magicWords === magicWords.toLocaleLowerCase()) {
        return spell;
      }
    }
    return null;
  }

  private async sendPostSpellCastEvents(character: ICharacter, spell: ISpell): Promise<void> {
    const updatedCharacter = (await Character.findById(character._id).lean()) as ICharacter;

    const payload: ICharacterAttributeChanged = {
      targetId: updatedCharacter._id,
      health: updatedCharacter.health,
      mana: updatedCharacter.mana,
      speed: updatedCharacter.speed,
    };

    this.socketMessaging.sendEventToUser(updatedCharacter.channelId!, CharacterSocketEvents.AttributeChanged, payload);
    await this.socketMessaging.sendEventToCharactersAroundCharacter(
      updatedCharacter,
      CharacterSocketEvents.AttributeChanged,
      payload
    );

    await this.animationEffect.sendAnimationEventToCharacter(updatedCharacter, spell.animationKey);
  }
}

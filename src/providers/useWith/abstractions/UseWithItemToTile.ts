import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { ItemContainer } from "@entities/ModuleInventory/ItemContainerModel";
import { Item } from "@entities/ModuleInventory/ItemModel";
import { AnimationEffect } from "@providers/animation/AnimationEffect";
import { CharacterItemContainer } from "@providers/character/characterItems/CharacterItemContainer";
import { CharacterItemInventory } from "@providers/character/characterItems/CharacterItemInventory";
import { itemsBlueprintIndex } from "@providers/item/data/index";
import { SocketMessaging } from "@providers/sockets/SocketMessaging";
import { IEquipmentAndInventoryUpdatePayload, IItem, IItemContainer, ItemSocketEvents } from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";
import { isArray, isMap } from "lodash";
import random from "lodash/random";
import { IUseWithTargetTile } from "../useWithTypes";

export interface IUseWithItemToTileReward {
  key: string;
  qty: number[] | number;
  chance: number;
}

export interface IUseWithItemToTileOptions {
  targetTile: IUseWithTargetTile;
  requiredResource?: {
    key: string | string[]; // In case is an array, it is one OR another
    decrementQty: number;
    errorMessage: string;
  };
  targetTileAnimationEffectKey?: string;

  successAnimationEffectKey?: string;
  errorAnimationEffectKey?: string;
  errorMessages?: string[];
  successMessages?: string[];
  rewards: IUseWithItemToTileReward[] | Map<string, IUseWithItemToTileReward[]>; // Rewards can be an array of rewards, or a map where the keys correspond to the required resource item key and the value is its corresponding rewards
}

@provide(UseWithItemToTile)
export class UseWithItemToTile {
  constructor(
    private animationEffect: AnimationEffect,
    private characterItemInventory: CharacterItemInventory,
    private socketMessaging: SocketMessaging,
    private characterItemContainer: CharacterItemContainer
  ) {}

  public async execute(character: ICharacter, options: IUseWithItemToTileOptions): Promise<void> {
    const {
      targetTile,
      requiredResource,
      targetTileAnimationEffectKey,
      errorMessages,
      rewards,
      successAnimationEffectKey,
      successMessages,
      errorAnimationEffectKey,
    } = options;

    let resourceKey = "";

    if (requiredResource) {
      let hasRequiredItem: string | undefined;
      if (typeof requiredResource.key === "string") {
        hasRequiredItem = await this.characterItemInventory.checkItemInInventoryByKey(requiredResource.key, character);
        resourceKey = requiredResource.key;
      } else {
        // requiredResource is an array
        // check if have AT LEAST one
        for (const k of requiredResource.key) {
          hasRequiredItem = await this.characterItemInventory.checkItemInInventoryByKey(k, character);
          if (hasRequiredItem) {
            // check if have required qty
            const item = (await Item.findById(hasRequiredItem).lean()) as IItem;
            if (requiredResource.decrementQty && (item?.stackQty || 0) >= requiredResource.decrementQty) {
              resourceKey = k;
              break;
            }
          }
        }
      }

      if (!hasRequiredItem) {
        this.socketMessaging.sendErrorMessageToCharacter(character, requiredResource.errorMessage);
        return;
      }

      if (requiredResource.decrementQty) {
        const decrementRequiredItem = await this.characterItemInventory.decrementItemFromInventoryByKey(
          resourceKey,
          character,
          requiredResource.decrementQty
        );

        if (!decrementRequiredItem) {
          this.socketMessaging.sendErrorMessageToCharacter(character);
          return;
        }
      }
    }

    if (targetTileAnimationEffectKey) {
      await this.animationEffect.sendAnimationEventToXYPosition(
        character,
        targetTileAnimationEffectKey,
        targetTile.x,
        targetTile.y
      );
    }

    let reward: IUseWithItemToTileReward[];

    if (isMap(rewards)) {
      const fetchedReward = rewards.get(resourceKey);

      if (!fetchedReward) {
        throw new Error(`No reward found for resource key ${resourceKey}`);
      }

      reward = fetchedReward;
    } else {
      reward = rewards;
    }

    const addedRewardToInventory = await this.addRewardToInventory(character, reward);

    if (!addedRewardToInventory) {
      if (errorMessages) {
        this.sendRandomMessageToCharacter(character, errorMessages);
      }

      if (errorAnimationEffectKey) {
        await this.animationEffect.sendAnimationEventToCharacter(character, errorAnimationEffectKey);
      }
      await this.refreshInventory(character);

      return;
    }

    if (successAnimationEffectKey) {
      await this.animationEffect.sendAnimationEventToCharacter(character, successAnimationEffectKey);
    }

    if (successMessages) {
      this.sendRandomMessageToCharacter(character, successMessages);
    }

    await this.refreshInventory(character);
  }

  private sendRandomMessageToCharacter(character: ICharacter, randomMessages: string[]): void {
    this.socketMessaging.sendErrorMessageToCharacter(character, randomMessages[random(0, randomMessages.length - 1)]);
  }

  private async addRewardToInventory(character: ICharacter, rewards: IUseWithItemToTileReward[]): Promise<boolean> {
    rewards = rewards.sort((a, b) => a.chance - b.chance);

    const n = random(0, 100);
    for (const reward of rewards) {
      if (n < reward.chance) {
        const itemBlueprint = itemsBlueprintIndex[reward.key];

        const item = new Item({
          ...itemBlueprint,
          stackQty: isArray(reward.qty) ? random(reward.qty[0], reward.qty[1]) : reward.qty,
        });
        await item.save();

        const inventory = await character.inventory;
        const inventoryContainerId = inventory.itemContainer as unknown as string;

        // add it to the character's inventory
        return await this.characterItemContainer.addItemToContainer(item, character, inventoryContainerId);
      }
    }

    return false;
  }

  private async refreshInventory(character: ICharacter): Promise<void> {
    const inventory = await character.inventory;
    const inventoryContainer = (await ItemContainer.findById(inventory.itemContainer)) as unknown as IItemContainer;

    const payloadUpdate: IEquipmentAndInventoryUpdatePayload = {
      inventory: inventoryContainer,
      openEquipmentSetOnUpdate: false,
      openInventoryOnUpdate: true,
    };

    this.socketMessaging.sendEventToUser<IEquipmentAndInventoryUpdatePayload>(
      character.channelId!,
      ItemSocketEvents.EquipmentAndInventoryUpdate,
      payloadUpdate
    );
  }
}

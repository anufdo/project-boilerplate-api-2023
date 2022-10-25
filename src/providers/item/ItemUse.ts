import { Character, ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { IItemContainer, ItemContainer } from "@entities/ModuleInventory/ItemContainerModel";
import { IItem, Item } from "@entities/ModuleInventory/ItemModel";
import { CharacterValidation } from "@providers/character/CharacterValidation";
import { CharacterView } from "@providers/character/CharacterView";
import { CharacterWeight } from "@providers/character/CharacterWeight";
import { EquipmentEquip } from "@providers/equipment/EquipmentEquip";
import { itemsBlueprintIndex } from "@providers/item/data/index";
import { SocketMessaging } from "@providers/sockets/SocketMessaging";
import { ItemValidation } from "./validation/ItemValidation";

import { AnimationEffect } from "@providers/animation/AnimationEffect";
import { CharacterItems } from "@providers/character/characterItems/CharacterItems";
import {
  AnimationEffectKeys,
  CharacterSocketEvents,
  ICharacterAttributeChanged,
  IEquipmentAndInventoryUpdatePayload,
  ItemSocketEvents,
  ItemSubType,
} from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";
import { ItemUseCycle } from "./ItemUseCycle";

@provide(ItemUse)
export class ItemUse {
  constructor(
    private characterValidation: CharacterValidation,
    private itemValidation: ItemValidation,
    private socketMessaging: SocketMessaging,
    private equipmentEquip: EquipmentEquip,
    private characterWeight: CharacterWeight,
    private characterView: CharacterView,
    private animationEffect: AnimationEffect,
    private characterItems: CharacterItems
  ) {}

  public async performItemUse(itemUse: any, character: ICharacter): Promise<boolean> {
    if (!this.characterValidation.hasBasicValidation(character)) {
      return false;
    }

    const isItemInCharacterInventory = await this.itemValidation.isItemInCharacterInventory(character, itemUse.itemId);
    if (!isItemInCharacterInventory) {
      return false;
    }

    const useItem = (await Item.findById(itemUse.itemId)) as IItem;

    if (!useItem) {
      this.socketMessaging.sendErrorMessageToCharacter(character, "Sorry, you cannot use this item.");
      return false;
    }

    const bluePrintItem = itemsBlueprintIndex[useItem.key];
    if (!bluePrintItem || !bluePrintItem.usableEffect) {
      this.socketMessaging.sendErrorMessageToCharacter(character, "Sorry, you cannot use this item.");
      return false;
    }

    this.applyItemUsage(bluePrintItem, character.id);

    const inventoryContainer = (await this.getInventoryContainer(character)) as unknown as IItemContainer;

    await this.consumeItem(character, inventoryContainer, useItem);

    await this.characterWeight.updateCharacterWeight(character);

    const updatedInventoryContainer = await this.getInventoryContainer(character);

    const payloadUpdate: IEquipmentAndInventoryUpdatePayload = {
      inventory: {
        _id: updatedInventoryContainer?._id,
        parentItem: updatedInventoryContainer!.parentItem.toString(),
        owner: updatedInventoryContainer?.owner?.toString() || character.name,
        name: updatedInventoryContainer?.name,
        slotQty: updatedInventoryContainer!.slotQty,
        slots: updatedInventoryContainer?.slots,
        allowedItemTypes: this.equipmentEquip.getAllowedItemTypes(),
        isEmpty: updatedInventoryContainer!.isEmpty,
      },
    };

    this.updateInventoryCharacter(payloadUpdate, character);

    return true;
  }

  private applyItemUsage(bluePrintItem: Partial<IItem>, characterId: string): void {
    const intervals = bluePrintItem.subType === ItemSubType.Food ? 5 : 1;

    new ItemUseCycle(async () => {
      const character = await Character.findOne({ _id: characterId });

      if (character) {
        bluePrintItem.usableEffect(character);
        await character.save();
        await this.sendItemConsumptionEvent(character);
      }
    }, intervals);
  }

  private async consumeItem(character: ICharacter, inventoryContainer: IItemContainer, item: IItem): Promise<void> {
    let stackReduced = false;

    if (item.isStackable && item.stackQty && item.stackQty > 1) {
      item.stackQty -= 1;
      await item.save();

      for (let i = 0; i < inventoryContainer.slotQty; i++) {
        const slotItem = inventoryContainer.slots?.[i];
        if (slotItem && slotItem.key === item.key && !stackReduced) {
          inventoryContainer.slots[i].stackQty = item.stackQty;
          stackReduced = true;
        }
      }

      inventoryContainer.markModified("slots");
      await inventoryContainer.save();
    }

    if (!stackReduced) {
      await this.characterItems.deleteItemFromContainer(item._id, character, "inventory");
      await Item.deleteOne({ _id: item._id });
    }
  }

  private async getInventoryContainer(character: ICharacter): Promise<IItemContainer | null> {
    const inventory = await character.inventory;
    return await ItemContainer.findById(inventory.itemContainer);
  }

  private async sendItemConsumptionEvent(character: ICharacter): Promise<void> {
    const nearbyCharacters = await this.characterView.getCharactersInView(character);

    const payload: ICharacterAttributeChanged = {
      targetId: character._id,
      health: character.health,
    };

    for (const nearbyCharacter of nearbyCharacters) {
      this.socketMessaging.sendEventToUser(nearbyCharacter.channelId!, CharacterSocketEvents.AttributeChanged, payload);
    }

    if (character.channelId) {
      this.socketMessaging.sendEventToUser(character.channelId, CharacterSocketEvents.AttributeChanged, payload);
    }

    await this.animationEffect.sendAnimationEvent(character, AnimationEffectKeys.LifeHeal);
  }

  private updateInventoryCharacter(payloadUpdate: IEquipmentAndInventoryUpdatePayload, character: ICharacter): void {
    this.socketMessaging.sendEventToUser<IEquipmentAndInventoryUpdatePayload>(
      character.channelId!,
      ItemSocketEvents.EquipmentAndInventoryUpdate,
      payloadUpdate
    );
  }
}

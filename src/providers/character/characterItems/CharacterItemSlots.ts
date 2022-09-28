import { IItemContainer, ItemContainer } from "@entities/ModuleInventory/ItemContainerModel";
import { IItem } from "@entities/ModuleInventory/ItemModel";
import { OperationStatus } from "@providers/types/ValidationTypes";

import { provide } from "inversify-binding-decorators";
import { ICharacterItemResult } from "./CharacterItems";

@provide(CharacterItemSlots)
export class CharacterItemSlots {
  public async updateItemOnSlot(
    slotIndex: number,
    targetContainer: IItemContainer,
    payload: Record<string, any>
  ): Promise<void> {
    const slotItem = targetContainer.slots[slotIndex];

    targetContainer.slots[slotIndex] = {
      ...slotItem,
      ...payload,
    };

    targetContainer.markModified("slots");
    await targetContainer.save();
  }

  public async hasAvailableSlot(targetContainerId: string): Promise<boolean> {
    const targetContainer = (await ItemContainer.findById(targetContainerId)) as unknown as IItemContainer;

    if (!targetContainer) {
      return false;
    }

    return targetContainer.firstAvailableSlotId !== null;
  }

  public async addItemOnFirstAvailableSlot(
    selectedItem: IItem,
    targetContainer: IItemContainer
  ): Promise<ICharacterItemResult | undefined> {
    const firstAvailableSlotIndex = targetContainer.firstAvailableSlotId;

    if (firstAvailableSlotIndex === null) {
      return {
        status: OperationStatus.Error,
        message: "Sorry, your inventory is full.",
      };
    }

    if (firstAvailableSlotIndex >= 0) {
      targetContainer.slots[firstAvailableSlotIndex] = selectedItem;

      await ItemContainer.updateOne(
        {
          _id: targetContainer.id,
        },
        {
          $set: {
            slots: targetContainer.slots,
          },
        }
      );

      return {
        status: OperationStatus.Success,
      };
    }
  }
}

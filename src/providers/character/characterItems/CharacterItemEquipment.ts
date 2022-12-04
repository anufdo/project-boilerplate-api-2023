import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { Equipment } from "@entities/ModuleCharacter/EquipmentModel";
import { IItem, Item } from "@entities/ModuleInventory/ItemModel";
import { EquipmentSlots } from "@providers/equipment/EquipmentSlots";
import { SocketMessaging } from "@providers/sockets/SocketMessaging";
import { isSameKey } from "@providers/dataStructures/KeyHelper";

import { provide } from "inversify-binding-decorators";

@provide(CharacterItemEquipment)
export class CharacterItemEquipment {
  constructor(private equipmentSlots: EquipmentSlots, private socketMessaging: SocketMessaging) {}

  public async deleteItemFromEquipment(itemId: string, character: ICharacter): Promise<boolean> {
    const item = (await Item.findById(itemId)) as unknown as IItem;

    if (!item) {
      this.socketMessaging.sendErrorMessageToCharacter(
        character,
        "Oops! The item to be deleted from your equipment was not found."
      );
      return false;
    }

    const equipment = await Equipment.findById(character.equipment);

    if (!equipment) {
      this.socketMessaging.sendErrorMessageToCharacter(character, "Oops! Your equipment was not found.");
      return false;
    }

    return await this.removeItemFromEquipmentSet(item, character);
  }

  public async checkItemEquipment(itemId: string, character: ICharacter): Promise<boolean> {
    const equipment = await Equipment.findById(character.equipment);

    if (!equipment) {
      return false;
    }

    const equipmentSlots = await this.equipmentSlots.getEquipmentSlots(equipment._id);

    for (const [, value] of Object.entries(equipmentSlots)) {
      if (String(value?._id) === String(itemId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * checkItemEquipmentByKey returns the item id if found, otherwise returns undefined
   * @param itemKey
   * @param character
   * @returns the item id if found, otherwise returns undefined
   */
  public async checkItemEquipmentByKey(itemKey: string, character: ICharacter): Promise<string | undefined> {
    const equipment = await Equipment.findById(character.equipment);

    if (!equipment) {
      return;
    }

    const equipmentSlots = await this.equipmentSlots.getEquipmentSlots(equipment._id);

    for (let [, value] of Object.entries(equipmentSlots)) {
      if (!value) {
        continue;
      }

      if (!value.key) {
        value = (await Item.findById(value as any)) as unknown as IItem;
      }

      // item not found, continue
      if (!value) {
        continue;
      }

      if (isSameKey(value.key, itemKey)) {
        return value._id;
      }
    }
  }

  private async removeItemFromEquipmentSet(item: IItem, character: ICharacter): Promise<boolean> {
    const equipmentSetId = character.equipment;
    const equipmentSet = await Equipment.findById(equipmentSetId);

    if (!equipmentSet) {
      this.socketMessaging.sendErrorMessageToCharacter(character, "Oops! Your equipment was not found.");
      return false;
    }

    let targetSlot = "";
    const itemSlotTypes = [
      "head",
      "neck",
      "leftHand",
      "rightHand",
      "ring",
      "legs",
      "boot",
      "accessory",
      "armor",
      "inventory",
    ];

    for (const itemSlotType of itemSlotTypes) {
      if (equipmentSet[itemSlotType] && equipmentSet[itemSlotType].toString() === item._id.toString()) {
        targetSlot = itemSlotType;
      }
    }

    if (!targetSlot) {
      return false;
    }

    equipmentSet[targetSlot] = undefined;

    await equipmentSet.save();

    return true;
  }
}

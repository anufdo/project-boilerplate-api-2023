import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";

import { provide } from "inversify-binding-decorators";
import { CharacterItemEquipment } from "./CharacterItemEquipment";
import { CharacterItemInventory } from "./CharacterItemInventory";

export interface IItemByKeyResult {
  itemId: string | undefined;
  container: string;
}

@provide(CharacterItems)
export class CharacterItems {
  constructor(
    private characterItemInventory: CharacterItemInventory,
    private characterItemEquipment: CharacterItemEquipment
  ) {}

  //! Warning: This completely WIPES OUT the item from the inventory or equipment. It DOES NOT DROP IT. Once it's executed, it's gone! If you want to drop an item, check ItemDrop.ts
  public async deleteItemFromContainer(
    itemId: string,
    character: ICharacter,
    container: "inventory" | "equipment" | "both"
  ): Promise<boolean> {
    switch (container) {
      case "inventory":
        return await this.characterItemInventory.deleteItemFromInventory(itemId, character);
      case "equipment":
        return await this.characterItemEquipment.deleteItemFromEquipment(itemId, character);
      case "both":
        return (
          (await this.characterItemInventory.deleteItemFromInventory(itemId, character)) ||
          (await this.characterItemEquipment.deleteItemFromEquipment(itemId, character))
        );
      default:
        return false;
    }
  }

  public async hasItem(
    itemId: string,
    character: ICharacter,
    container: "inventory" | "equipment" | "both"
  ): Promise<boolean> {
    switch (container) {
      case "inventory":
        return await this.characterItemInventory.checkItemInInventory(itemId, character);
      case "equipment":
        return await this.characterItemEquipment.checkItemEquipment(itemId, character);
      case "both":
        return (
          (await this.characterItemInventory.checkItemInInventory(itemId, character)) ||
          (await this.characterItemEquipment.checkItemEquipment(itemId, character))
        );
      default:
        return false;
    }
  }

  /**
   * hasItemByKey checks if a character has an item by its key
   * @param itemKey
   * @param character
   * @param container
   * @returns ItemByKeyResult with item id and the container where it was found. returns undefined if not found
   */
  public async hasItemByKey(
    itemKey: string,
    character: ICharacter,
    container: "inventory" | "equipment" | "both"
  ): Promise<IItemByKeyResult | undefined> {
    const result: IItemByKeyResult = {} as IItemByKeyResult;
    switch (container) {
      case "inventory":
        result.itemId = await this.characterItemInventory.checkItemInInventoryByKey(itemKey, character);
        result.container = container;
        break;
      case "equipment":
        result.itemId = await this.characterItemEquipment.checkItemEquipmentByKey(itemKey, character);
        result.container = container;
        break;
      case "both":
        let itemId = await this.characterItemInventory.checkItemInInventoryByKey(itemKey, character);
        if (itemId) {
          result.itemId = itemId;
          result.container = "inventory";
          return result;
        }
        itemId = await this.characterItemEquipment.checkItemEquipmentByKey(itemKey, character);
        result.itemId = itemId;
        result.container = "equipment";
        break;
    }

    if (!result.itemId) {
      return;
    }

    return result;
  }
}

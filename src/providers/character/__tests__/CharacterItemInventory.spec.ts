import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { IItemContainer, ItemContainer } from "@entities/ModuleInventory/ItemContainerModel";
import { IItem } from "@entities/ModuleInventory/ItemModel";
import { container, unitTestHelper } from "@providers/inversify/container";
import { OthersBlueprint, SwordsBlueprint } from "@providers/item/data/types/itemsBlueprintTypes";
import { CharacterItemInventory } from "../characterItems/CharacterItemInventory";
import { CharacterTradingBalance } from "../CharacterTradingBalance";

describe("CharacterItemInventory.ts", () => {
  let characterItemInventory: CharacterItemInventory;
  let testCharacter: ICharacter;
  let inventory: IItem;
  let inventoryContainer: IItemContainer;
  let characterTradingBalance: CharacterTradingBalance;

  beforeAll(async () => {
    await unitTestHelper.beforeAllJestHook();

    characterItemInventory = container.get<CharacterItemInventory>(CharacterItemInventory);
    characterTradingBalance = container.get<CharacterTradingBalance>(CharacterTradingBalance);
  });

  beforeEach(async () => {
    await unitTestHelper.beforeEachJestHook(true);

    testCharacter = await unitTestHelper.createMockCharacter(null, { hasInventory: true, hasEquipment: true });
    inventory = await testCharacter.inventory;
    inventoryContainer = (await ItemContainer.findById(inventory.itemContainer)) as unknown as IItemContainer;
  });

  afterEach(async () => {
    for (let i = 0; i < inventoryContainer.slotQty; i++) {
      inventoryContainer.slots[i] = null;
    }
    inventoryContainer.markModified("slots");
    await inventoryContainer.save();
  });

  it("should properly get the item in the inventory slot", async () => {
    await characterItemInventory.addEquipmentToCharacter(testCharacter);

    const inventory = await testCharacter.inventory;

    expect(inventory.name).toBe("Backpack");
  });

  it("should properly decrement a STACKABLE item from the inventory", async () => {
    const goldCoins = await unitTestHelper.createMockItemFromBlueprint(OthersBlueprint.GoldCoin, {
      stackQty: 25,
    });

    inventoryContainer.slots[0] = goldCoins.toJSON({ virtuals: true }); // if we dont do this, isStackable will be undefined, because its a virtual field!
    inventoryContainer.markModified("slots");
    await inventoryContainer.save();

    await characterItemInventory.decrementItemFromInventory(OthersBlueprint.GoldCoin, testCharacter, 20);

    const newBalance = await characterTradingBalance.getTotalGoldInInventory(testCharacter);

    expect(newBalance).toBe(5);
  });

  it("should properly decrement a STACKABLE item from the inventory for decimal quantity", async () => {
    const goldCoins = await unitTestHelper.createMockItemFromBlueprint(OthersBlueprint.GoldCoin, {
      stackQty: 2.3,
    });

    inventoryContainer.slots[0] = goldCoins.toJSON({ virtuals: true }); // if we dont do this, isStackable will be undefined, because its a virtual field!
    inventoryContainer.markModified("slots");
    await inventoryContainer.save();

    await characterItemInventory.decrementItemFromInventory(OthersBlueprint.GoldCoin, testCharacter, 0.1);

    const newBalance = await characterTradingBalance.getTotalGoldInInventory(testCharacter);

    expect(newBalance).toBe(2.2);
  });

  it("should delete a STACKABLE item from the inventory if qty becomes zero", async () => {
    const goldCoins = await unitTestHelper.createMockItemFromBlueprint(OthersBlueprint.GoldCoin, {
      stackQty: 25,
    });

    inventoryContainer.slots[0] = goldCoins.toJSON({ virtuals: true }); // if we dont do this, isStackable will be undefined, because its a virtual field!
    inventoryContainer.markModified("slots");
    await inventoryContainer.save();

    await characterItemInventory.decrementItemFromInventory(OthersBlueprint.GoldCoin, testCharacter, 25);

    const updatedInventoryContainer = (await ItemContainer.findById(
      inventory.itemContainer
    )) as unknown as IItemContainer;

    expect(updatedInventoryContainer.slots[0]).toBe(null);

    const newBalance = await characterTradingBalance.getTotalGoldInInventory(testCharacter);
    expect(newBalance).toBe(0);
  });

  it("should decrement first STACKABLE item from the inventory if multiple stacks of same item", async () => {
    const goldCoins1 = await unitTestHelper.createMockItemFromBlueprint(OthersBlueprint.GoldCoin, {
      stackQty: 100,
    });
    const goldCoins2 = await unitTestHelper.createMockItemFromBlueprint(OthersBlueprint.GoldCoin, {
      stackQty: 50,
    });

    inventoryContainer.slots[0] = goldCoins1.toJSON({ virtuals: true }); // if we dont do this, isStackable will be undefined, because its a virtual field!
    inventoryContainer.slots[1] = goldCoins2.toJSON({ virtuals: true });
    inventoryContainer.markModified("slots");
    await inventoryContainer.save();

    await characterItemInventory.decrementItemFromInventory(OthersBlueprint.GoldCoin, testCharacter, 25);

    const updatedInventoryContainer = (await ItemContainer.findById(
      inventory.itemContainer
    )) as unknown as IItemContainer;
    expect(updatedInventoryContainer.slots[0]).not.toBe(null);
    expect(updatedInventoryContainer.slots[1]).not.toBe(null);

    expect(updatedInventoryContainer.slots[0].stackQty).toBe(75);
    expect(updatedInventoryContainer.slots[1].stackQty).toBe(50);

    const newBalance = await characterTradingBalance.getTotalGoldInInventory(testCharacter);
    expect(newBalance).toBe(125);
  });

  it("should remove first STACKABLE item and decrement from second if qty to decrement is more than qty of one stack", async () => {
    const goldCoins1 = await unitTestHelper.createMockItemFromBlueprint(OthersBlueprint.GoldCoin, {
      stackQty: 100,
    });
    const goldCoins2 = await unitTestHelper.createMockItemFromBlueprint(OthersBlueprint.GoldCoin, {
      stackQty: 50,
    });

    inventoryContainer.slots[0] = goldCoins1.toJSON({ virtuals: true }); // if we dont do this, isStackable will be undefined, because its a virtual field!
    inventoryContainer.slots[1] = goldCoins2.toJSON({ virtuals: true });
    inventoryContainer.markModified("slots");
    await inventoryContainer.save();

    await characterItemInventory.decrementItemFromInventory(OthersBlueprint.GoldCoin, testCharacter, 125);

    const updatedInventoryContainer = (await ItemContainer.findById(
      inventory.itemContainer
    )) as unknown as IItemContainer;
    expect(updatedInventoryContainer.slots[0]).toBe(null);
    expect(updatedInventoryContainer.slots[1]).not.toBe(null);

    expect(updatedInventoryContainer.slots[1].stackQty).toBe(25);

    const newBalance = await characterTradingBalance.getTotalGoldInInventory(testCharacter);
    expect(newBalance).toBe(25);
  });

  it("should properly decrement a NON-STACKABLE item from the inventory", async () => {
    const shortSword = await unitTestHelper.createMockItem();

    inventoryContainer.slots[0] = shortSword.toJSON({ virtuals: true }); // if we dont do this, isStackable will be undefined, because its a virtual field!
    inventoryContainer.markModified("slots");
    await inventoryContainer.save();

    await characterItemInventory.decrementItemFromInventory(SwordsBlueprint.ShortSword, testCharacter, 1);

    const updatedInventoryContainer = (await ItemContainer.findById(
      inventory.itemContainer
    )) as unknown as IItemContainer;

    expect(updatedInventoryContainer.slots[0]).toBe(null);
  });

  it("should properly decrement multiple NON-STACKABLE items from the inventory", async () => {
    const shortSword1 = await unitTestHelper.createMockItem();
    const shortSword2 = await unitTestHelper.createMockItem();

    inventoryContainer.slots[0] = shortSword1.toJSON({ virtuals: true }); // if we dont do this, isStackable will be undefined, because its a virtual field!
    inventoryContainer.slots[1] = shortSword2.toJSON({ virtuals: true });
    inventoryContainer.markModified("slots");
    await inventoryContainer.save();

    await characterItemInventory.decrementItemFromInventory(SwordsBlueprint.ShortSword, testCharacter, 2);

    const updatedInventoryContainer = (await ItemContainer.findById(
      inventory.itemContainer
    )) as unknown as IItemContainer;

    expect(updatedInventoryContainer.slots[0]).toBe(null);
    expect(updatedInventoryContainer.slots[1]).toBe(null);
  });

  it("should properly decrement a NON-STACKABLE item from multiple same items in the inventory", async () => {
    const shortSword1 = await unitTestHelper.createMockItem();
    const shortSword2 = await unitTestHelper.createMockItem();

    inventoryContainer.slots[0] = shortSword1.toJSON({ virtuals: true }); // if we dont do this, isStackable will be undefined, because its a virtual field!
    inventoryContainer.slots[1] = shortSword2.toJSON({ virtuals: true });
    inventoryContainer.markModified("slots");
    await inventoryContainer.save();

    await characterItemInventory.decrementItemFromInventory(SwordsBlueprint.ShortSword, testCharacter, 1);

    const updatedInventoryContainer = (await ItemContainer.findById(
      inventory.itemContainer
    )) as unknown as IItemContainer;

    expect(updatedInventoryContainer.slots[0]).toBe(null);
    expect(updatedInventoryContainer.slots[1]).not.toBe(null);
  });

  afterAll(async () => {
    await unitTestHelper.afterAllJestHook();
  });
});

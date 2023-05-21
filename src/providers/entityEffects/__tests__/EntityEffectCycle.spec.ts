import { Character, ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { INPC, NPC } from "@entities/ModuleNPC/NPCModel";
import { TimerWrapper } from "@providers/helpers/TimerWrapper";
import { unitTestHelper } from "@providers/inversify/container";
import { EntityEffectCycle } from "../EntityEffectCycle";
import { entityEffectsBlueprintsIndex } from "../data";
import { IEntityEffect } from "../data/blueprints/entityEffect";
import { EntityEffectBlueprint } from "../data/types/entityEffectBlueprintTypes";

jest.useFakeTimers({ advanceTimers: true });
describe("EntityEffectCycle", () => {
  let testAttacker: INPC;
  let testTarget: ICharacter;
  let testTargetNPC: INPC;
  let entityEffect: IEntityEffect;

  beforeEach(async () => {
    entityEffect = entityEffectsBlueprintsIndex[EntityEffectBlueprint.Poison];

    entityEffect.effect = jest.fn().mockImplementation(() => Promise.resolve(1));

    testAttacker = await unitTestHelper.createMockNPC(null, {});
    testAttacker.entityEffects = [entityEffect.key];
    await testAttacker.save();

    testTarget = await unitTestHelper.createMockCharacter(null, {});
    testTargetNPC = await unitTestHelper.createMockNPC(null, {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  it("executes the effect intervals properly", async () => {
    const mockFn = jest.fn().mockImplementation();
    const mockTarget = {
      isAlive: true,
      appliedEntityEffects: [{ key: entityEffect.key }],
      markModified: mockFn,
    };

    const getTargetMock = jest.spyOn(EntityEffectCycle.prototype as any, "getTarget");
    getTargetMock.mockImplementation(() => {
      return Promise.resolve(mockTarget);
    });

    const applyChangesMock = jest.spyOn(EntityEffectCycle.prototype as any, "applyCharacterChanges");
    applyChangesMock.mockImplementation(() => {
      return Promise.resolve(true);
    });

    const timerMock = jest.spyOn(TimerWrapper.prototype, "setTimeout");
    timerMock.mockImplementation();

    new EntityEffectCycle(entityEffect, testTarget._id, testTarget.type, testAttacker._id, testAttacker.type);

    async function verifyEffectCycle(lastIteration: boolean): Promise<void> {
      await waitUntil(() => {
        return timerMock.mock.calls.length > 0;
      }, 100);

      expect(timerMock).toHaveBeenCalledTimes(lastIteration ? 0 : 1);

      if (!lastIteration) {
        expect(timerMock.mock.calls[0][1]).toBe(entityEffect.intervalMs);
      }

      expect(getTargetMock).toHaveBeenCalledTimes(2);
      expect(getTargetMock).toHaveBeenCalledWith(testTarget._id, testTarget.type);

      getTargetMock.mockClear();

      if (!lastIteration) {
        expect(mockTarget.appliedEntityEffects[0]).toBeDefined();
        expect(mockTarget.appliedEntityEffects[0].key).toStrictEqual(entityEffect.key);
      } else {
        expect(mockTarget.appliedEntityEffects[0]).not.toBeDefined();
      }

      expect(applyChangesMock).toHaveBeenCalledTimes(1);
      expect(applyChangesMock).toHaveBeenCalledWith(mockTarget, entityEffect, 1);
      applyChangesMock.mockClear();
    }

    const iterations = entityEffect.totalDurationMs! / entityEffect.intervalMs;

    for (let index = 0; index <= iterations; index++) {
      const lastIteration = index === iterations;

      await verifyEffectCycle(lastIteration);

      if (!lastIteration) {
        const callback = timerMock.mock.calls[0][0];

        timerMock.mockClear();

        callback();
      }
    }
  });

  it("should retrieve the target correctly based on the targetId and targetType", async () => {
    // Mock the getTarget method to return a dummy target object
    const getTargetSpy = jest
      // @ts-expect-error
      .spyOn(EntityEffectCycle.prototype, "getTarget")
      // @ts-expect-error
      .mockImplementation(() => Promise.resolve({ _id: testTarget._id, type: testTarget.type } as any));

    const mockCharacterDeath = jest.fn().mockImplementation();

    const handleDeathMock = jest.spyOn(EntityEffectCycle.prototype as any, "handleDeath");
    handleDeathMock.mockImplementation(() => {
      return Promise.resolve(mockCharacterDeath());
    });

    new EntityEffectCycle(entityEffect, testTarget._id, testTarget.type, testAttacker._id, testAttacker.type);

    await waitUntil(() => {
      return getTargetSpy.mock.calls.length > 0;
    }, 2000);

    // Ensure the getTarget method was called with the correct arguments
    expect(getTargetSpy).toHaveBeenCalledTimes(1);
    expect(getTargetSpy).toHaveBeenCalledWith(testTarget._id, testTarget.type);

    // Reset the mock
    getTargetSpy.mockRestore();
  });

  it("should apply character changes when target is of type 'Character'", async () => {
    // mock the Character.updateOne method
    const updateOneCharacterMock = jest.spyOn(Character, "updateOne");
    updateOneCharacterMock.mockImplementation(jest.fn());

    // create an instance of the class and call the method
    const cycle = new EntityEffectCycle(
      entityEffect,
      testTarget._id,
      testTarget.type,
      testAttacker._id,
      testAttacker.type
    );

    // Make sure you await the method here if it's asynchronous
    await (cycle as any).applyCharacterChanges(testTarget, entityEffect, 10);

    // assert that the Character.updateOne method was called with the right arguments
    expect(updateOneCharacterMock).toHaveBeenCalledWith(
      { _id: testTarget.id },
      {
        $set: {
          appliedEntityEffects: testTarget.appliedEntityEffects,
          health: testTarget.health - 10,
        },
      }
    );

    // cleanup
    updateOneCharacterMock.mockRestore();
  });

  it("should apply NPC changes when target is of type 'NPC'", async () => {
    // mock the NPC.updateOne method
    const updateOneNPCMock = jest.spyOn(NPC, "updateOne");
    updateOneNPCMock.mockImplementation(jest.fn());

    // create an instance of the class and call the method
    const cycle = new EntityEffectCycle(
      entityEffect,
      testTargetNPC._id,
      testTargetNPC.type,
      testAttacker._id,
      testAttacker.type
    );

    // Make sure you await the method here if it's asynchronous
    await (cycle as any).applyCharacterChanges(testTargetNPC, entityEffect, 10);

    // assert that the NPC.updateOne method was called with the right arguments
    expect(updateOneNPCMock).toHaveBeenCalledWith(
      { _id: testTargetNPC.id },
      {
        $set: {
          appliedEntityEffects: testTargetNPC.appliedEntityEffects,
          health: testTargetNPC.health - 10,
        },
      }
    );

    // cleanup
    updateOneNPCMock.mockRestore();
  });

  it("handles the death of a character correctly", async () => {
    const mockCharacterDeath = jest.fn().mockImplementation();
    const mockTarget = {
      isAlive: false,
    };

    const getTargetMock = jest.spyOn(EntityEffectCycle.prototype as any, "getTarget");
    getTargetMock.mockImplementation(() => {
      return Promise.resolve(mockTarget);
    });

    const handleDeathMock = jest.spyOn(EntityEffectCycle.prototype as any, "handleDeath");
    handleDeathMock.mockImplementation(() => {
      return Promise.resolve(mockCharacterDeath());
    });

    new EntityEffectCycle(entityEffect, testTarget._id, testTarget.type, testAttacker._id, testAttacker.type);

    await waitUntil(() => {
      return handleDeathMock.mock.calls.length > 0;
    }, 100);

    expect(getTargetMock).toHaveBeenCalledTimes(1);
    expect(getTargetMock).toHaveBeenCalledWith(testTarget._id, testTarget.type);

    expect(handleDeathMock).toHaveBeenCalledTimes(1);
    expect(handleDeathMock).toHaveBeenCalledWith(mockTarget);

    getTargetMock.mockClear();
    handleDeathMock.mockClear();
  });
});

function waitUntil(fn: Function, timeout?: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (fn()) {
        resolveFn();
      }
    }, 100);

    const timeoutInstance = setTimeout(() => {
      resolveFn();
    }, timeout ?? 1000);

    function resolveFn(): void {
      clearTimeout(timeoutInstance);
      clearInterval(interval);
      resolve();
    }
  });
}

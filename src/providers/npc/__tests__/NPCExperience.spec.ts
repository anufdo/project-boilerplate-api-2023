import { EXP_RATIO } from "@providers/constants/SkillConstants";
import { container, unitTestHelper } from "@providers/inversify/container";
import { NPCExperience } from "../NPCExperience";

describe("NPCExperience", () => {
  let npcExperience: NPCExperience;
  beforeAll(async () => {
    await unitTestHelper.beforeAllJestHook();
    npcExperience = container.get<NPCExperience>(NPCExperience);
  });
  beforeEach(async () => {
    await unitTestHelper.beforeEachJestHook(true);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  afterAll(async () => {
    await unitTestHelper.afterAllJestHook();
  });

  describe("calculateExperience", () => {
    it("should return the correct experience value for a given set of skills and base health", () => {
      const baseHealth = 50;
      const skills = {
        level: 5,
        strength: { level: 10 },
        dexterity: { level: 15 },
        resistance: { level: 20 },
      };

      const result = npcExperience.calculateExperience(baseHealth, skills);

      expect(result).toBe(Math.floor(((50 + 5 + 10 + 15 + 20) * EXP_RATIO) / 5));
    });
  });
});

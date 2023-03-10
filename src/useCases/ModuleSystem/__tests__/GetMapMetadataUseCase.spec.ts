import { DYNAMIC_MAP_DARKNESS } from "@providers/constants/MapConstants";
import { STATIC_PATH } from "@providers/constants/PathConstants";
import { BadRequestError } from "@providers/errors/BadRequestError";
import { MapTiles } from "@providers/map/MapTiles";
import fs from "fs";
import { GetMapMetadataUseCase } from "../map/GetMapMetadataUseCase";

describe("GetMapMetadataUseCase", () => {
  let getMapMetadataUseCase: GetMapMetadataUseCase;
  let mapTiles: MapTiles;

  beforeAll(() => {
    mapTiles = {
      getMapLayers: jest.fn(() => ["Layer 1", "Layer 2"]),
    } as unknown as MapTiles;

    // Create an instance of GetMapMetadataUseCase with the MapTiles mock object
    getMapMetadataUseCase = new GetMapMetadataUseCase(mapTiles);
  });

  beforeEach(async () => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should throw a BadRequestError for an invalid map name", () => {
    const mapName = "Invalid Map";

    // Call the execute method
    expect(() => getMapMetadataUseCase.execute(mapName)).toThrowError(BadRequestError);
  });

  it("should return the map metadata for the given map name", () => {
    // Mock the map versions file
    jest.spyOn(fs, "readFileSync").mockImplementation(() => '{"example": 1}');

    // Mock the map file
    jest.doMock(`${STATIC_PATH}/maps/example.json`, () => ({
      tilesets: [{ name: "test-tileset" }],
      tilewidth: 32,
      tileheight: 32,
      width: 100,
      height: 100,
    }));

    // Mock the map layers
    jest.spyOn(mapTiles, "getMapLayers").mockImplementation(() => ["layer1", "layer2"]);

    const mapMetadata = getMapMetadataUseCase.execute("example");

    expect(mapMetadata).toEqual({
      key: "example",
      lightening: { type: "Static", value: DYNAMIC_MAP_DARKNESS },
      name: "example",
      version: 1,
      layers: ["layer1", "layer2"],
      tilesets: [{ name: "test-tileset" }],
      tileWidth: 32,
      tileHeight: 32,
      width: 100,
      height: 100,
    });
  });
});

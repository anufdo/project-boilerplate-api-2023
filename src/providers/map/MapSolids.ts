import { ITiled, MapLayers } from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";
import { MapLoader } from "./MapLoader";
import { MapTiles } from "./MapTiles";

export interface ILayersSolidData {
  layer: number;
  isSolid: boolean;
}

@provide(MapSolids)
export class MapSolids {
  constructor(private mapTilesManager: MapTiles) {}

  public generateGridSolids(map: string, currentMap: ITiled): void {
    const gridMap = MapLoader.grids.get(map);
    if (!gridMap) {
      console.log(`❌ Failed to create grid for ${map}`);
      return;
    }

    const mapLayerParser = {
      ground: 0,
      "over-ground": 1,
      character: 2,
      "over-character": 3,
    };

    for (let gridX = 0; gridX < currentMap.width; gridX++) {
      for (let gridY = 0; gridY < currentMap.height; gridY++) {
        const layers = currentMap.layers;

        for (const layer of layers) {
          if (layer.name === "NPCs") {
            // skip NPCs layer, because this is just for solid generation
            continue;
          }

          const isSolid = this.isTileSolid(map, gridX, gridY, mapLayerParser[layer.name]);

          if (mapLayerParser[layer.name] === MapLayers.Character) {
            gridMap.setWalkableAt(gridX, gridY, !isSolid);
          }
        }
      }
    }
  }

  public isTileSolid(
    map: string,
    gridX: number,
    gridY: number,
    layer: MapLayers,
    checkAllLayersBelow: boolean = true
  ): boolean {
    if (checkAllLayersBelow) {
      for (let i = layer; i >= MapLayers.Ground; i--) {
        const isSolid = this.tileSolidCheck(map, gridX, gridY, i);
        if (isSolid) {
          return true;
        }
      }
      return false;
    } else {
      return this.tileSolidCheck(map, gridX, gridY, layer);
    }
  }

  private tileSolidCheck(map: string, gridX: number, gridY: number, layer: MapLayers): boolean {
    const tileId = this.mapTilesManager.getTileId(map, gridX, gridY, layer);

    if (tileId === 0 || !tileId) {
      return false; // 0 means it's empty
    }

    const mapData = MapLoader.maps.get(map);

    if (!mapData) {
      throw new Error(`Failed to find map ${map}`);
    }

    const tileset = mapData.tilesets.find((tileset) => tileId <= tileset.tilecount);

    if (!tileset) {
      throw new Error(`Failed to find tileset for tile ${tileId}`);
    }

    const isTileSolid = this.mapTilesManager.getTileProperty<boolean>(tileset, tileId, "ge_collide");

    if (!isTileSolid) {
      return false;
    }

    return isTileSolid;
  }
}

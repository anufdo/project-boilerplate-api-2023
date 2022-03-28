import { Character } from "@entities/ModuleSystem/CharacterModel";
import { MapSolid } from "@entities/ModuleSystem/MapSolid";
import { NPC } from "@entities/ModuleSystem/NPCModel";
import { TilemapParser } from "@providers/map/TilemapParser";
import { MathHelper } from "@providers/math/MathHelper";
import {
  AnimationDirection,
  calculateNewPositionXY,
  FromGridX,
  FromGridY,
  GRID_WIDTH,
  MapLayers,
} from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";
import PF from "pathfinding";
interface IPosition {
  x: number;
  y: number;
}

type IsSolidCheckType = "isSolidThisLayerAndBelow" | "isSolidThisLayerOnly";
@provide(MovementHelper)
export class MovementHelper {
  constructor(private mathHelper: MathHelper) {}

  public isSolid = async (
    map: string,
    gridX: number,
    gridY: number,
    layer: MapLayers,
    checkType: IsSolidCheckType = "isSolidThisLayerAndBelow"
  ): Promise<boolean> => {
    // check for characters and NPCs

    const hasNPC = await NPC.exists({
      x: FromGridX(gridX),
      y: FromGridY(gridY),
      layer,
    });

    if (hasNPC) {
      return true;
    }

    const hasPlayer = await Character.exists({
      x: FromGridX(gridX),
      y: FromGridY(gridY),
      isOnline: true,
      layer,
    });

    if (hasPlayer) {
      return true;
    }

    const mapSolid = await MapSolid.findOne({
      map,
      gridX,
      gridY,
      layer,
    });

    if (!mapSolid) {
      return false;
    }

    if (checkType === "isSolidThisLayerOnly") {
      return mapSolid.isSolidOnlyThisLayer;
    } else {
      return mapSolid.isSolidThisLayerAndBelow;
    }
  };

  public findShortestPath(
    map: string,
    startGridX: number,
    startGridY: number,
    endGridX: number,
    endGridY: number
  ): number[][] | undefined {
    const gridMap = TilemapParser.grids.get(map);

    if (!gridMap) {
      console.log(`Failed to find grid for ${map}`);
    } else {
      const tempGrid = gridMap.clone(); // should be cloned, otherwise it will be modified by the finder!

      const finder = new PF.AStarFinder();

      //! According to the docs, both start and end point MUST be walkable, otherwise it will return [] and crash the pathfinding!
      //! To avoid any issues in the main grid we'll just set this walkable in the tempGrid!

      tempGrid.setWalkableAt(startGridX, startGridY, true);
      tempGrid.setWalkableAt(endGridX, endGridY, true);

      const path = finder.findPath(startGridX, startGridY, endGridX, endGridY, tempGrid!);

      return path;
    }
  }

  public getGridMovementDirection(
    startGridX: number,
    startGridY: number,
    endGridX: number,
    endGridY: number
  ): AnimationDirection | undefined {
    const Xdiff = endGridX - startGridX;
    const Ydiff = endGridY - startGridY;

    if (Xdiff < 0 && Ydiff === 0) {
      return "left";
    }

    if (Xdiff > 0 && Ydiff === 0) {
      return "right";
    }

    if (Xdiff === 0 && Ydiff < 0) {
      return "up";
    }

    if (Xdiff === 0 && Ydiff > 0) {
      return "down";
    }
  }

  public isUnderRange(
    initialX: number,
    initialY: number,
    newX: number,
    newY: number,
    maxRangeInGridCells: number
  ): boolean {
    const distance = this.mathHelper.getDistanceBetweenPoints(initialX, initialY, newX, newY);

    // convert distance to abs value
    const distanceInGridCells = Math.round(Math.abs(distance / GRID_WIDTH));

    return distanceInGridCells <= maxRangeInGridCells;
  }

  public calculateNewPositionXY(x: number, y: number, moveToDirection: AnimationDirection): IPosition {
    if (!moveToDirection) {
      return { x, y };
    }

    return calculateNewPositionXY(x, y, moveToDirection);
  }

  public getOppositeDirection(direction: AnimationDirection): AnimationDirection {
    switch (direction) {
      case "down":
        return "up";
      case "up":
        return "down";
      case "left":
        return "right";
      case "right":
        return "left";
    }
  }
}

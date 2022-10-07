import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { BattleNetworkStopTargeting } from "@providers/battle/network/BattleNetworkStopTargetting";
import { ItemView } from "@providers/item/ItemView";
import { GridManager } from "@providers/map/GridManager";
import { NPCManager } from "@providers/npc/NPCManager";
import { NPCView } from "@providers/npc/NPCView";
import { NPCWarn } from "@providers/npc/NPCWarn";
import { SocketAuth } from "@providers/sockets/SocketAuth";
import { SocketMessaging } from "@providers/sockets/SocketMessaging";
import { SocketChannel } from "@providers/sockets/SocketsTypes";
import {
  AnimationDirection,
  CharacterSocketEvents,
  ICharacterCreateFromClient,
  ICharacterCreateFromServer,
  ToGridX,
  ToGridY,
} from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";
import { CharacterView } from "../CharacterView";

@provide(CharacterNetworkCreate)
export class CharacterNetworkCreate {
  constructor(
    private socketAuth: SocketAuth,
    private playerView: CharacterView,
    private socketMessaging: SocketMessaging,
    private npcView: NPCView,
    private itemView: ItemView,
    private BattleNetworkStopTargeting: BattleNetworkStopTargeting,
    private npcManager: NPCManager,
    private gridManager: GridManager,
    private npcWarn: NPCWarn
  ) {}

  public onCharacterCreate(channel: SocketChannel): void {
    this.socketAuth.authCharacterOn(
      channel,
      CharacterSocketEvents.CharacterCreate,
      async (data: ICharacterCreateFromClient, character: ICharacter) => {
        // check if character is already logged in

        // if (character.isOnline) {
        //   // then force logout the previous associated client
        //   this.socketMessaging.sendEventToUser(character.channelId!, CharacterSocketEvents.CharacterForceDisconnect, {
        //     reason: "You've been disconnected because you logged in from another location!",
        //   });
        //   // and then logout also the client that just connected
        //   this.socketMessaging.sendEventToUser(String(channel.id), CharacterSocketEvents.CharacterForceDisconnect, {
        //     reason: "You've been disconnected because you logged in from another location!",
        //   });
        //   return;
        // }

        character.isOnline = true;
        character.channelId = data.channelId;
        character.view = {
          items: {},
          npcs: {},
          characters: {},
        };
        await this.BattleNetworkStopTargeting.stopTargeting(character);

        const map = character.scene;

        const { gridOffsetX, gridOffsetY } = this.gridManager.getGridOffset(map)!;

        this.gridManager.setWalkable(
          map,
          ToGridX(character.x) + gridOffsetX,
          ToGridY(character.y) + gridOffsetY,
          false
        );

        await character.save();

        if (character.isBanned) {
          console.log(`🚫 ${character.name} tried to create its instance while banned!`);

          this.socketMessaging.sendEventToUser(character.channelId!, CharacterSocketEvents.CharacterForceDisconnect, {
            reason: "You cannot use this character while banned.",
          });

          return;
        }

        await this.npcWarn.warnCharacterAboutNPCsInView(character);

        await this.npcManager.startNearbyNPCsBehaviorLoop(character);

        await this.itemView.warnCharacterAboutItemsInView(character);

        // here we inject our server side character properties, to make sure the client is not hacking anything!
        const dataFromServer: ICharacterCreateFromServer = {
          ...data,
          id: character._id,
          name: character.name,
          x: character.x!,
          y: character.y!,
          direction: character.direction as AnimationDirection,
          layer: character.layer,
          speed: character.speed,
          movementIntervalMs: character.movementIntervalMs,
          health: character.health,
          maxHealth: character.maxHealth,
          mana: character.mana,
          maxMana: character.maxMana,
          textureKey: character.textureKey,
        };

        channel.join(data.channelId); // join channel specific to the user, to we can send direct  later if we want.

        this.sendCreationMessageToCharacters(data.channelId, dataFromServer, character);
      }
    );
  }

  public async sendCreationMessageToCharacters(
    emitterChannelId: string,

    dataFromServer: ICharacterCreateFromServer,
    character: ICharacter
  ): Promise<void> {
    const nearbyCharacters = await this.playerView.getCharactersInView(character);

    if (nearbyCharacters.length > 0) {
      for (const nearbyCharacter of nearbyCharacters) {
        // tell other character that we exist, so it can create a new instance of us
        this.socketMessaging.sendEventToUser<ICharacterCreateFromServer>(
          nearbyCharacter.channelId!,
          CharacterSocketEvents.CharacterCreate,
          dataFromServer
        );

        const nearbyCharacterPayload = {
          id: nearbyCharacter._id,
          name: nearbyCharacter.name,
          x: nearbyCharacter.x,
          y: nearbyCharacter.y,
          channelId: nearbyCharacter.channelId!,
          direction: nearbyCharacter.direction as AnimationDirection,
          isMoving: false,
          layer: nearbyCharacter.layer,
          speed: nearbyCharacter.speed,
          movementIntervalMs: nearbyCharacter.movementIntervalMs,
          health: nearbyCharacter.health,
          maxHealth: nearbyCharacter.maxHealth,
          mana: nearbyCharacter.mana,
          maxMana: nearbyCharacter.maxMana,
          textureKey: nearbyCharacter.textureKey,
        };

        // tell the emitter about these other characters too

        this.socketMessaging.sendEventToUser<ICharacterCreateFromServer>(
          emitterChannelId,
          CharacterSocketEvents.CharacterCreate,
          nearbyCharacterPayload
        );
      }
    }
  }
}

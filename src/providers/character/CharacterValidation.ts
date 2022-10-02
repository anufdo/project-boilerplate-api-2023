import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { SocketMessaging } from "@providers/sockets/SocketMessaging";
import { CharacterSocketEvents, UISocketEvents } from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";

interface IBaseValidationErrorMessages {
  isOnline?: string;
  isAlive?: string;
}

@provide(CharacterValidation)
export class CharacterValidation {
  constructor(private socketMessaging: SocketMessaging) {}

  public hasBasicValidation(character: ICharacter, errorMessages?: IBaseValidationErrorMessages): boolean {
    if (!character.isOnline) {
      console.log(`🚫 CharacterValidation: hasBasicValidation failed because ${character.name} is offline!`);

      this.socketMessaging.sendEventToUser(character.channelId!, UISocketEvents.ShowMessage, {
        message: errorMessages?.isOnline || "You are offline and cannot perform this action!",
        type: "error",
      });

      return false;
    }

    if (!character.isAlive) {
      console.log(`🚫 CharacterValidation: hasBasicValidation failed because ${character.name} is dead!`);

      this.socketMessaging.sendEventToUser(character.channelId!, UISocketEvents.ShowMessage, {
        message: errorMessages?.isAlive || "You are dead and cannot perform this action!",
        type: "error",
      });

      return false;
    }

    if (character.isBanned) {
      console.log(`🚫 CharacterValidation: hasBasicValidation failed because ${character.name} is banned!`);

      this.socketMessaging.sendEventToUser(character.channelId!, CharacterSocketEvents.CharacterForceDisconnect, {
        reason: "You cannot use this character while banned.",
      });

      return false;
    }

    return true;
  }
}

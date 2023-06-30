/* eslint-disable no-void */
import { Character } from "@entities/ModuleCharacter/CharacterModel";
import { appEnv } from "@providers/config/env";
import { InMemoryHashTable } from "@providers/database/InMemoryHashTable";
import { Queue, Worker } from "bullmq";
import { provide } from "inversify-binding-decorators";

@provide(BattleCycle)
export class BattleCycle {
  private queue: Queue;
  private worker: Worker;

  constructor(private inMemoryHashTable: InMemoryHashTable) {}

  public async init(id: string, intervalSpeed: number, fn: () => void | Promise<void>): Promise<void> {
    const queueName = `battle-cycle-${id}`;

    // clear out any stop flags
    await this.inMemoryHashTable.delete("battle-cycle-stop-flags", id);

    // close any previous queue or workers, if available
    if (this.queue) {
      await this.queue.close();
    }

    if (this.worker) {
      await this.worker.close();
    }

    this.queue = new Queue(queueName, {
      connection: {
        host: appEnv.database.REDIS_CONTAINER,
        port: Number(appEnv.database.REDIS_PORT),
      },
    });

    // before starting, lets make sure the queue is clear

    // clear repeatable
    await this.queue.removeRepeatable(queueName, {
      every: intervalSpeed,
      immediately: true,
    });

    this.worker = new Worker(
      queueName,
      async (job) => {
        try {
          // check if we should stop
          const stopFlag = await this.inMemoryHashTable.get("battle-cycle-stop-flags", id);

          if (stopFlag) {
            // check if character still have a target
            // if so, then we should not stop the battle cycle

            // @ts-ignore
            const { target } = await Character.findById(id).lean().select("target");

            if (!target?._id) {
              await this.queue.removeRepeatable(queueName, {
                every: intervalSpeed,
                immediately: true,
              });

              await this.queue.close();

              return;
            }
          }

          await fn();
        } catch (error) {
          console.error(error);
        }
      },
      {
        connection: {
          host: appEnv.database.REDIS_CONTAINER,
          port: Number(appEnv.database.REDIS_PORT),
        },
      }
    );

    this.worker.on("failed", (job, err) => {
      console.log(`Job ${job?.id} failed with error ${err.message}`);
    });

    // initialize queue
    await this.queue.add(
      queueName,
      {},
      {
        repeat: {
          every: intervalSpeed,
        },
        attempts: 1,
      }
    );
  }

  public async stop(id: string): Promise<void> {
    await this.inMemoryHashTable.set("battle-cycle-stop-flags", id, true);
  }
}

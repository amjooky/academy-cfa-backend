import { createClient } from 'redis';
import { DomainEvent } from './index';

export class EventBus {
  private publisher;
  private subscriber;

  constructor(redisUrl: string) {
    this.publisher = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });
  }

  async connect(): Promise<void> {
    await Promise.all([
      this.publisher.connect(),
      this.subscriber.connect()
    ]);
    console.log('[EVENT BUS] Publisher and Subscriber linked to Redis');
  }

  /**
   * Publishes a Domain Event into Redis PubSub channel
   */
  async publish(event: DomainEvent): Promise<void> {
    const channel = event.type;
    await this.publisher.publish(channel, JSON.stringify(event));
    console.log(`[EVENT BUS] Published event: ${channel} for Tenant: ${event.tenantId}`);
  }

  /**
   * Subscribes to a specific Event pattern
   */
  async subscribe(eventType: string, handler: (event: DomainEvent) => void | Promise<void>): Promise<void> {
    await this.subscriber.subscribe(eventType, (message) => {
      try {
        const parsedEvent: DomainEvent = JSON.parse(message);
        handler(parsedEvent);
      } catch (err) {
        console.error(`[EVENT BUS] Failed to process message on channel ${eventType}:`, err);
      }
    });
    console.log(`[EVENT BUS] Subscribed successfully to channel: ${eventType}`);
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.publisher.disconnect(),
      this.subscriber.disconnect()
    ]);
  }
}

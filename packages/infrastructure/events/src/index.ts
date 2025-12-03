// Main event bus implementation
export {
  DomainEventBus,
  type EventBusConfig,
  type EventHandler,
  type EventRegistration,
  type PublishOptions,
  type SubscriptionOptions,
  type EventMetrics,
  type DeadLetterEvent,
  type EventBatch,
  type BaseDomainEvent
} from './event-bus'
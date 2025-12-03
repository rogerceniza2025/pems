// Application Services
export {
  NavigationService,
  type NavigationUserContext,
  type NavigationServiceOptions,
  type NavigationStatistics
} from './navigation-service'

export {
  MenuBuilder,
  MenuBuilderFactory,
  type MenuBuilderConfig,
  type NavigationItemDefinition,
  type MenuSectionDefinition,
  type MenuDividerDefinition,
  type MenuHeaderDefinition,
  type MenuDefinition,
  DEFAULT_NAVIGATION_DEFINITIONS
} from './menu-builder'

export {
  NavigationCacheService,
  type ExtendedCacheEntry,
  type CacheStatistics,
  type CacheConfiguration,
  type CacheInvalidationEvent
} from './cache-service'
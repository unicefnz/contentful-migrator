import type { StrategyAction } from './default-strategy';

export interface Options {
  /**
   * Access token for the Contentful Content Management API (CMA)
   * @default process.env.CONTENTFUL_ACCESS_TOKEN
   * */
  token?: string;

  /**
   * Space to apply migrations to
   * @default process.env.CONTENTFUL_SPACE_ID
   * */
  spaceId?: string;

  /**
   * Default locale (mainly used for migration tracking)
   * @default en-US
   * */
  locale?: string;

  /**
   * Filesystem path to a directory containing your migration files
   * @example path.resolve(__dirname, './migrations')
   * */
  migrationPath: string;

  /**
   * Entry Type used for tracking which migrations have been applied
   * @default 'appliedMigration'
   * */
  migrationTrackerEntryType?: string;

  /**
   * Configures environment strategy behavior
   * */
  strategy: StrategyAction;
}

export type InternalOptions = Required<Options>;

import type { Space } from 'contentful-management/dist/typings/entities/space';
import type { Environment } from 'contentful-management/dist/typings/entities/environment';
import { createFeatureEnvironmentAction } from './actions/create-feature-env';
import { getEnvOrCreateAliased } from './actions/get-env-or-create-aliased';
import { getEnvironmentAction } from './actions/get-env';

export interface ActionContext {
  space: Space;
}
export interface ActionResult {
  env: Environment;
  onComplete?(): Promise<void>;
}

export type StrategyAction = (context: ActionContext) => Promise<ActionResult>;

export type Strategy<Opts = {}> = (options: Opts) => StrategyAction;

export type BranchMatcher = string | string[] | ((name: string) => boolean);
export interface DefaultStrategyOptions {
  /**
   * Branch this is running on, determines which action to take
   * @default process.env.GITHUB_REF
   * */
  branchRef?: string;

  /**
   * If an environment is using aliases, create a new clone instead. Otherwise, apply straight to the target env
   * @default true
   * */
  createNewAliasedEnvironments?: boolean;

  /**
   * Only applicable to migrations applied to aliased environments.
   * Automatically update the alias to point at the new environment if the migration succeeds.
   * If false, you will need to update the target manually
   * @default false
   * */
  updateAliasOnSuccess?: boolean;

  /**
   * Whether to automatically destroy and recreate existing feature environments
   * Speeds up testing a migration
   * @default false
   * */
  recreateFeatureEnvironments?: boolean;

  /**
   * Your testing contentful environment, feature environments are copied from this
   * @default 'test'
   * */
  testEnvironment?: string

  /**
   * Override the matching logic for the production branch. This takes priority over dev & feature matches
   * @default ['master', 'main']
   * */
  productionBranch?: BranchMatcher;

  /**
   * Override the matching logic for the development branch. This is evaluated after production, but before feature
   * @default ['development', 'develop', 'dev', 'test']
   * */
  developmentBranch?: BranchMatcher;

  /**
   * Override the matching logic for the feature branch. Evaluated after both production and development, and acts as a default by default
   * @default () => true
   * */
  featureBranch?: BranchMatcher;
}

function match(name: string, matcher: BranchMatcher): boolean {
  if (typeof matcher === 'string') return name === matcher;
  if (typeof matcher === 'function') return matcher(name);
  if (Array.isArray(matcher)) return matcher.includes(name);
  throw new Error('Invalid matcher: ' + matcher);
}
function parseRef(ref: string): string {
  if (!ref.startsWith('refs/')) return ref; // Not a ref, just pass it on
  if (!ref.startsWith('refs/heads/')) throw new Error('Branch ref does not refer to a branch. This may be running on a PR, which is unsupported.');

  return ref.substr('refs/heads/'.length);
}

export function defaultStrategy({
  branchRef = process.env.GITHUB_REF,
  recreateFeatureEnvironments = false,
  createNewAliasedEnvironments = true,
  updateAliasOnSuccess = false,
  testEnvironment = 'test',
  productionBranch = ['master', 'main'],
  developmentBranch = ['dev', 'develop', 'development', 'test'],
  featureBranch = () => true
}: DefaultStrategyOptions): StrategyAction {
  if (!branchRef) throw new Error('No branch ref provided! This is required to determine which action to take');
  const branch = parseRef(branchRef);

  const namedBranchAction = createNewAliasedEnvironments ? getEnvOrCreateAliased : getEnvironmentAction;

  if (match(branch, productionBranch)) return namedBranchAction('master', updateAliasOnSuccess);
  if (match(branch, developmentBranch)) return namedBranchAction(testEnvironment, updateAliasOnSuccess);
  if (match(branch, featureBranch)) return createFeatureEnvironmentAction(branch, recreateFeatureEnvironments, testEnvironment);

  throw new Error('Unable to determine which action to use for branch ' + branch);
}

import type { Space } from 'contentful-management/dist/typings/entities/space';
import type { Environment } from 'contentful-management/dist/typings/entities/environment';
import createEnvironment from './create-environment';

export interface ActionContext {
  space: Space;
}

export type StrategyAction = (context: ActionContext) => Promise<Environment>;

export type Strategy<Opts = {}> = (options: Opts) => StrategyAction;

function getEnvironmentAction(environmentId: string): StrategyAction {
  return async ({ space }) => {
    const env = await space.getEnvironment(environmentId);

    if (!env) throw new Error('FATAL: Couldn\'t retrieve test environment');

    return env;
  };
}
function createFeatureEnvironmentAction(branch: string, recreateFeatureEnvironment: boolean, sourceEnv: string): StrategyAction {
  return async ({ space }) => {
    const envId = branch.replace(/\//g, '_');
    // try get envId
    let env = await space.getEnvironment(envId).catch((e) => {
      try {
        if (JSON.parse(e.message).status === 404) return null;
      } catch (_) {
        throw e;
      }
    });

    // If the environment already exists, destroy it
    if (env) {
      if (recreateFeatureEnvironment) {
        console.log(`🗑 Deleting feature environment ${envId}`);
        await env.delete();
      } else {
        throw new Error('FATAL: Feature Environment already exists. This may indicate that the migration is already applied');
      }
    }
    // Create a fresh environment from the test env
    env = await createEnvironment(space, envId, sourceEnv);

    return env;
  };
}

export type BranchMatcher = string | string[] | ((name: string) => boolean);
export interface DefaultStrategyOptions {
  /**
   * Branch this is running on, determines which action to take
   * @default process.env.GITHUB_REF
   * */
  branchRef?: string;

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
  testEnvironment = 'test',
  productionBranch = ['master', 'main'],
  developmentBranch = ['dev', 'develop', 'development', 'test'],
  featureBranch = () => true
}: DefaultStrategyOptions): StrategyAction {
  if (!branchRef) throw new Error('No branch ref provided! This is required to determine which action to take');
  const branch = parseRef(branchRef);

  if (match(branch, productionBranch)) return getEnvironmentAction('master');
  if (match(branch, developmentBranch)) return getEnvironmentAction(testEnvironment);
  if (match(branch, featureBranch)) return createFeatureEnvironmentAction(branch, recreateFeatureEnvironments, testEnvironment);

  throw new Error('Unable to determine which action to use for branch ' + branch);
}

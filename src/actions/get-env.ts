import type { StrategyAction } from '../default-strategy';

export function getEnvironmentAction(environmentId: string): StrategyAction {
  return async ({ space }) => {
    const env = await space.getEnvironment(environmentId);

    if (!env) throw new Error('FATAL: Couldn\'t retrieve test environment');

    return { env };
  };
}

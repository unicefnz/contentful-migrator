import createEnvironment from '../create-environment';
import type { StrategyAction } from '../default-strategy';

export function createFeatureEnvironmentAction(branch: string, recreateFeatureEnvironment: boolean, sourceEnv: string): StrategyAction {
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

    return { env };
  };
}

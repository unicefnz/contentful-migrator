import type { StrategyAction } from '../default-strategy';
import createEnvironment from '../create-environment';

export function getEnvOrCreateAliased(environmentId: string, updateOnSuccess: boolean = false): StrategyAction {
  return async (ctx) => {
    const { space } = ctx;
    const env = await space.getEnvironment(environmentId);

    if (!env) throw new Error(`FATAL: Couldn't retrieve environment "${environmentId}"`);

    // If environment aliases are setup for master, create a new env instead
    if (env.sys.aliasedEnvironment?.sys.id) {
      const newName = environmentId + '-migrated-' + Date.now();
      return {
        env: await createEnvironment(space, newName, environmentId),
        async onComplete() {
          if (updateOnSuccess) {
            const alias = await space.getEnvironmentAlias(environmentId);
            console.log(`🔀 Updating alias ${environmentId} to point to ${newName} (was ${alias.environment.sys.id}`);
            alias.environment.sys.id = newName;
            await alias.update();
          }
        }
      };
    }

    return { env };
  };
}

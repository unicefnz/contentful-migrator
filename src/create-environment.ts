import type { Environment } from 'contentful-management/dist/typings/entities/environment';
import type { Space } from 'contentful-management/dist/typings/entities/space';

const DELAY = 3000;
const MAX_NUMBER_OF_TRIES = 10;

// By default, our content delivery keys won't have access to this new environment. This grants dev keys access to it
async function updateKeyAccess(space: Space, newEnv: Environment): Promise<void> {
  console.log('🔑 Updating API keys to allow access to new environment', newEnv.name);
  const newEnvObj = {
    sys: {
      type: 'Link',
      linkType: 'Environment',
      id: newEnv.sys.id
    }
  };

  const keys = await space.getApiKeys();
  await Promise.all(keys.items.map(async (key) => {
    if (key.name.startsWith('Dev:')) {
      console.log(`🔑 Granting key ${key.name} (${key.sys.id}) access to new environment ${newEnv.name}`);
      key.environments.push(newEnvObj);
      await key.update();
    }
  }));
}

async function createEnvironment(space: Space, name: string, from: string): Promise<Environment> {
  console.log(`✏️ Creating new environment: ${name} from source ${from}...`);

  const environment = await space.createEnvironmentWithId(name, { name }, from);

  // Wait for environment to process successfully
  let count = 0;
  while (count < MAX_NUMBER_OF_TRIES) {
    /* eslint-disable no-await-in-loop */
    const status = (await space.getEnvironment(environment.sys.id)).sys.status?.sys.id;

    if (status === 'ready') {
      console.log(`✅ Successfully created new environment ${name}`);
      break;
    } else if (status === 'failed') {
      throw new Error('☠️ Environment creation failed');
    } else console.log('🤔 Environment not yet ready: ', status);

    await new Promise(resolve => setTimeout(resolve, DELAY));
    count++;
    /* eslint-enable no-await-in-loop */
  }

  await updateKeyAccess(space, environment);

  return environment;
}

export default createEnvironment;

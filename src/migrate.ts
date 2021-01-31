import { createClient } from 'contentful-management';
import type { InternalOptions, Options } from './options';
import { apply } from './apply';

export async function migrate(opts: Options) {
  // This funky logic keeps typescript happy.
  const token = opts.token || process.env.CONTENTFUL_ACCESS_TOKEN;
  const spaceId = opts.spaceId || process.env.CONTENTFUL_SPACE_ID;
  if (!token) throw new Error('Contentful access token is required');
  if (!spaceId) throw new Error('Contentful space ID is required');

  const options: InternalOptions = {
    token,
    spaceId,
    migrationTrackerEntryType: 'appliedMigration',
    locale: 'en-US',
    ...opts
  };

  const client = createClient({
    accessToken: options.token
  });

  const space = await client.getSpace(options.spaceId);

  // Use strategy
  const env = await options.strategy({ space });

  await apply(env, options);
}

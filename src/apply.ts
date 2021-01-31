import * as path from 'path';
import { runMigration } from 'contentful-migration';
import type { Environment } from 'contentful-management/dist/typings/entities/environment';
import { getNewMigrations } from './migration-tracking';
import type { InternalOptions } from './options';

async function applyMigration(env: Environment, migrationName: string, options: InternalOptions): Promise<void> {
  console.log(`🚧 Applying Migration ${migrationName}`);

  const filePath = path.join(options.migrationPath, migrationName + '.js');

  await runMigration({
    spaceId: env.sys.space.sys.id,
    environmentId: env.sys.id,
    accessToken: options.token,
    yes: true,
    filePath
  });

  await env.createEntry(options.migrationTrackerEntryType, {
    fields: {
      name: {
        [options.locale]: migrationName
      },
      migrationResult: {
        [options.locale]: 'Success'
      }
    }
  });
}

export async function apply(env: Environment, options: InternalOptions): Promise<void> {
  const migrations = await getNewMigrations(env, options);

  if (migrations.length) {
    console.log(`🛠 Applying ${migrations.length} migrations: ${migrations.join(', ')}`);
    for (let i = 0; i < migrations.length; i++) {
      // We need to run migrations sequentially because a migration may depend on a previous one
      // eslint-disable-next-line no-await-in-loop
      await applyMigration(env, migrations[i], options);
    }
    console.log(`✅ Applied ${migrations.length} migrations`);
  } else {
    console.log('✨ No migrations to apply!');
  }
}

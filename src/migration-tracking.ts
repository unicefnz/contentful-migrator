import * as fs from 'fs/promises';
import * as path from 'path';
import type { Entry } from 'contentful-management/dist/typings/entities/entry';
import type { Environment } from 'contentful-management/dist/typings/entities/environment';
import type { InternalOptions } from './options';

function migrationNumber(name: string): number {
  return parseInt(name.split('-')[0], 10);
}

async function getAvailableMigrations(options: InternalOptions): Promise<string[]> {
  const files = await fs.readdir(options.migrationPath);
  return files
    .filter(f => f.endsWith('.js'))
    .map(f => f.slice(0, -path.extname(f).length))
    .sort((a, b) => migrationNumber(a) - migrationNumber(b));
}

function isMigrationApplied(name: string, appliedMigrations: Entry[], locale: string): boolean {
  return !!appliedMigrations.find(applied => applied.fields.name[locale] === name);
}

async function fetchAppliedMigrations(env: Environment, options: InternalOptions) {
  return (await env.getEntries({ content_type: options.migrationTrackerEntryType })).items;
}

export async function getNewMigrations(env: Environment, options: InternalOptions): Promise<string[]> {
  const available = await getAvailableMigrations(options);
  const applied = await fetchAppliedMigrations(env, options);

  return available.filter(n => !isMigrationApplied(n, applied, options.locale));
}

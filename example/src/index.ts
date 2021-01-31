import * as path from 'path';
import { migrate, defaultStrategy } from '@unicefnz/contentful-migrator';

async function main() {
  await migrate({
    migrationPath: path.resolve(__dirname, './migrations'),

    strategy: defaultStrategy({ })
  });
}

main();

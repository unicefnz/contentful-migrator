import type Migration from 'contentful-migration';

function runMigration(migration: Migration) {
  const person = migration.createContentType('person');
  person.name('Person');

  person.createField('name', {
    type: 'Symbol',
    required: true
  });

  person.createField('about', {
    type: 'RichText',
    required: true
  });

  person.displayField('name');
}

export = runMigration;

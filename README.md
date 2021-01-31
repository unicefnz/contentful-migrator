# Contentful Migrator

This package is an opinionated pipeline for managing your Contentful schema.
Used in production at UNICEF New Zealand, we use this to extend infrastructure-as-code
to our CMS.

- [Setup](#setup)
- [Strategies](#strategies)
- [Creating a migration](#creating-a-migration)
- [Configuration](#configuration)
- [How it works](#how-it-works)

## Setup
See the [/example/](/example) folder for some example code on how to set up this tool (such as workflows and source code)

### Creating tracking entry

In order to track which migrations have been applied to which migrations, this tool creates an entry
to track each applied migration.

You'll need to add this by hand to start with.
- ID: `appliedMigration` (or choose another and pass `options.migrationTrackerEntryType`)
- Fields
  - `name`
    - Symbol
    - Required
  - `migrationResult`
    - Text
    - Not required

<details>
  <summary>JSON Representation</summary>
   
  ```json
  {
    "sys": {
      "id:": "appliedMigrations"
    },
    "name": "Z-Internal: Applied Migrations",
    "description": "*Automation only*\nTracks the state of the Content Model for automatic migrations",
    "displayField": "name",
    "fields": [
      {
        "id": "name",
        "name": "Migration Name",
        "type": "Symbol",
        "localized": false,
        "required": true,
        "validations": []
      },
      {
        "id": "migrationResult",
        "name": "Migration Result",
        "type": "Text", 
        "localized": false,
        "required": false,
        "validations": []
      }
    ]
  }
   ```
</details>

## Strategies

"Strategies" are used to select an environment and perform some behaviour based on which branch this runs on.
For example, this may just mean selecting the master env when on the main branch, or creating an ad-hoc environment
on a feature branch.

### Using default strategy

The default strategy assumes you have two environments, master & test (names configurable).

The **master** environment is your production content and stable version of your schema. This corresponds to the `main` branch

The **test** environment contains dummy content used for testing & development.
This separation allows you to snapshot test against this environment.

Additionally, this strategy will create ad-hoc **feature environments** corresponding to feature branches.
The purpose of this is to allow (potentially broken) migrations to be run against an environment that can be recreated.

Example:
```js
  migrate({
    // ...
    strategy: defaultStrategy({
      recreateFeatureEnvironments: true,
      testEnvironment: 'test'
    })
  });
```

### Creating your own strategy

If the default strategy doesn't fit your workflow, you can use your own.

You'll need to pass an action to take as the `strategy` prop. This action gets some context, and may use this
to perform some actions, eventually returning the environment to perform the migrations on.

```ts
type StrategyAction = (context: ActionContext) => Promise<Environment>;
```

## Creating a migration

1. Define your migration, creating a file with the next number in the sequence (eg, `09-example.ts`)

2. Using this boilerplate, create your migration
   > See [Migration DSL docs](https://github.com/contentful/contentful-migration#README) for more
   > info about how to use the `migration` object

   ```ts
   import type Migration from 'contentful-migration';
    
   function runMigration(migration: Migration) {
     // Migration goes here
   }
    
   export = runMigration;
   ```

3. Test your migration by committing it to a feature branch (eg `feat/my-migration`), and pushing it.
   This will create a new environment (`feat_my-migration`) in Contentful and apply any missing migrations.
   If you need to edit your migration, delete the new environment, and push your change.
   (If recreateFeatureEnvironments = true, this is done automatically.)

4. Once ready, squash and merge your feature branch into `develop` and verify the `test` environment looks right

5. If everything looks good, fast-forward `main` to update the `master` environment. Congrats! Your migration is live!

## Configuration

### `migrate(options)`

- `options.token` - Access token for the Contentful Content Management API (CMA)
  Default: `process.env.CONTENTFUL_ACCESS_TOKEN`
  
- `options.spaceId`- Space to apply migrations to.
  Default: `process.env.CONTENTFUL_SPACE_ID`
  
- `options.locale` - Default locale (mainly used for migration tracking)
  Default: `'en-US'`
  
- **Required** `options.migrationPath` - Filesystem path to a directory containing your migration files.
  Example: `path.resolve(__dirname, './migrations')`
  
- `options.migrationTrackerEntryType` - Entry Type used for tracking which migrations have been applied.
  Default: `'appliedMigration'`
  
- **Required** `options.strategy` - Configures environment strategy behavior.

### `defaultStrategy(options)`
- `options.branchRef` - Branch this is running on, determines which action to take.
  Default: `process.env.GITHUB_REF`
  
- `options.recreateFeatureEnvironments` - Whether to automatically destroy and recreate existing
  feature environments. Speeds up testing a migration.
  Default: `false`
  
- `options.testEnvironment` - Testing contentful environment, feature environments are copied from this.
  Default: `test`

- `options.productionBranch / options.developmentBranch / options.featureBranch` - Matching logic
  for each type of branch.
  - `string` - branch === matcher
  - `string[]` - branch in matcher
  - `function` - matcher(branch)
   
## How it works

This repo defines "migrations", similar to SQL migrations. Each migration
gets applied on top of a base state, to keep changes to environments in sync
and reproducible.

The tool uses the git branch name to determine which Contentful environment to apply changes to,
and entries in the environment to track which migrations have been applied.

1. Determine which git branch we are on. This is used to determine what strategy to use
2. Use the corresponding strategy to determine which Contentful environment to act on, and
   perform other side effects (such as creating the environment)
3. Determine which migrations need to be applied
4. Apply the migrations sequentially
5. Save a record of the migration being applied in the environment itself
6. Profit

---

This pipeline is based on the following articles:

- [Contentful: CMS as Code](https://www.contentful.com/help/cms-as-code/)
- [Contentful: Integrating migrations in your CD pipeline](https://www.contentful.com/developers/docs/concepts/deployment-pipeline/)
- [Contentful: Integrating migrations in a CD pipeline with CircleCI](https://www.contentful.com/developers/docs/tutorials/general/continuous-integration-with-circleci/)

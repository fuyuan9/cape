#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

const [, , command, ...args] = process.argv;

function printHelp() {
  console.log(`
Cape CLI

Usage:
  cape <command> [arguments]

Commands:
  init                     Initialize Cape settings file
  make:resource <name>     Generate a new resource configuration file
  make:field <name>        Print or append boilerplate code for a new resource field
  help                     Print this help menu
`);
}

function handleInit() {
  console.log('Initializing Cape...');
  const template = `import { defineResource, text, email, badge, datetime, input, select } from '@cape/core';

// Example resource definition
export const users = defineResource({
  name: 'users',
  model: {}, // Pass your drizzle table reference here
  table: {
    columns: [
      text('name').sortable().searchable(),
      email('email').searchable(),
      badge('role'),
      datetime('createdAt')
    ]
  },
  form: {
    fields: [
      input('name').required(),
      input('email').email().required(),
      select('role', {
        options: ['admin', 'member']
      })
    ]
  }
});
`;

  const targetPath = path.join(process.cwd(), 'admin.ts');
  if (fs.existsSync(targetPath)) {
    console.warn(`File already exists at: ${targetPath}`);
    return;
  }
  fs.writeFileSync(targetPath, template, 'utf8');
  console.log(`Successfully initialized admin configuration at: ${targetPath}`);
}

function handleMakeResource(name?: string) {
  if (!name) {
    console.error('Error: Please specify the resource name. e.g. "cape make:resource posts"');
    process.exit(1);
  }

  const camelName = name.charAt(0).toLowerCase() + name.slice(1);
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

  const template = `import { defineResource, text, input } from '@cape/core';

export const ${camelName} = defineResource({
  name: '${camelName}',
  label: '${capitalizedName}',
  model: {}, // Associate with Drizzle table
  table: {
    columns: [
      text('id').sortable(),
      text('title').searchable()
    ]
  },
  form: {
    fields: [
      input('title').required()
    ]
  }
});
`;

  const fileName = `${camelName}.resource.ts`;
  const targetPath = path.join(process.cwd(), fileName);
  if (fs.existsSync(targetPath)) {
    console.warn(`File already exists at: ${targetPath}`);
    return;
  }
  fs.writeFileSync(targetPath, template, 'utf8');
  console.log(`Successfully generated resource file at: ${targetPath}`);
}

function handleMakeField(fieldName?: string) {
  if (!fieldName) {
    console.error('Error: Please specify a field name. e.g. "cape make:field status"');
    process.exit(1);
  }

  console.log(`
// Copy the code below to use inside your Resource columns / fields:

// Table column:
text('${fieldName}').sortable().searchable()

// Form input field:
input('${fieldName}').required()
`);
}

switch (command) {
  case 'init':
    handleInit();
    break;
  case 'make:resource':
    handleMakeResource(args[0]);
    break;
  case 'make:field':
    handleMakeField(args[0]);
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}

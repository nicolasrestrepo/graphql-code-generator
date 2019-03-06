import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { Types } from 'graphql-codegen-core';
import { getQuestions } from './questions';
import {} from './plugins';
import { guessTargets } from './targets';
import { Answers, Tags } from './types';
import { writeConfig, writePackage } from './helpers';

function log(...msgs: string[]) {
  // tslint:disable-next-line
  console.log(...msgs);
}

export async function init() {
  log(`
    Welcome to ${chalk.bold('GraphQL Code Generator')}!
    Answer few questions and we will setup everything for you.
  `);

  const possibleTargets = await guessTargets();

  const answers = await inquirer.prompt<Answers>(getQuestions(possibleTargets));

  // define config
  const config: Types.Config = {
    overwrite: true,
    schema: answers.schema,
    documents: answers.targets.includes(Tags.browser) ? answers.documents : null,
    generates: {
      [answers.output]: {
        plugins: answers.plugins.map(p => p.value)
      }
    }
  };

  // introspection
  if (answers.introspection) {
    addIntrospection(config);
  }

  // config file
  const { relativePath } = writeConfig(answers, config);

  // write package.json
  writePackage(answers, relativePath);

  // Emit status to the terminal
  log(`
    Config file generated at ${chalk.bold(relativePath)}
    
      ${chalk.bold('$ npm install')}

    To install the plugins.

      ${chalk.bold(`$ npm run ${answers.script}`)}

    To run GraphQL Code Generator.
  `);
}

// adds an introspection to `generates`
function addIntrospection(config: Types.Config) {
  config.generates['./graphql.schema.json'] = {
    plugins: ['introspection']
  };
}

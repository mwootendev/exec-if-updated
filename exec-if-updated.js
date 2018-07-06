#!/usr/bin/env node

const yargs = require('yargs');
const globby = require('globby');
const execa = require('execa');

const options = yargs
  .example('$0 --source src/** --source assets/** --target dist/** npm run build')
  .option('s', {
    alias: 'source',
    demandOption: true,
    describe: 'A glob describing the source files that may be updated. May be supplied more than once for additional source files.',
    type: 'array',
    nargs: 1
  })
  .option('t', {
    alias: 'target',
    demandOption: true,
    describe: 'A glob describing the target files to which the source files will be compared. May be supplied more than once for additional target files.',
    type: 'array',
    nargs: 1
  })
  .wrap(yargs.terminalWidth())
  .argv;

main(options);

async function main(options) {
  const sourceFiles = await matchFiles(options.source);
  const targetFiles = await matchFiles(options.target);

  if (isSourceUpdated(sourceFiles, targetFiles)) {
    try {
      const command = parseCommand(options);
      const childProcess = execa.shell(command);
      childProcess.stdout.pipe(process.stdout);
      childProcess.stderr.pipe(process.stderr);
      process.stdin.pipe(childProcess.stdin);
      await childProcess;
      process.exit();
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }    
  } else {
    process.exit();
  }
}

function matchFiles(fileGlob) {
  const GLOB_OPTIONS = {
    stats: true
  };
  return globby(fileGlob, GLOB_OPTIONS);
}

function isSourceUpdated(sourceFiles, targetFiles) {
  const toModifiedDate = (file => new Date(file.mtimeMs));
  const toLatestModified = (latestModifiedTime, fileModifiedTime) => fileModifiedTime.getTime() > latestModifiedTime.getTime() ?
    fileModifiedTime :
    latestModifiedTime;

  const defaultDate = new Date(0);  
  const latestSourceDate = sourceFiles.map(toModifiedDate).reduce(toLatestModified, defaultDate);
  const latestTargetDate = targetFiles.map(toModifiedDate).reduce(toLatestModified, defaultDate);

  return latestSourceDate.getTime() > latestTargetDate.getTime();
}

function parseCommand(options) {
 if (options._ && options._.length) {
     return options._.join(' ');
  } else {
    throw new Error('Missing command');
  }
}

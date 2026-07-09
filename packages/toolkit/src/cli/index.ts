#!/usr/bin/env node
/**
 * OCPP DebugKit CLI — command-line interface for inspecting OCPP traces,
 * generating reports, and running scenarios.
 */

import { Command } from 'commander';
import { inspectCommand } from './commands/inspect.js';
import { reportCommand } from './commands/report.js';
import {
  scenarioListCommand,
  scenarioRunCommand,
  scenarioRunFileCommand,
} from './commands/scenario.js';
import { ciCommand } from './commands/ci.js';
import { anonymizeCommand } from './commands/anonymize.js';
import { diffCommand } from './commands/diff.js';

const program = new Command();

program
  .name('ocpp-debugkit')
  .description('Debug OCPP charging sessions — inspect traces, generate reports, run scenarios.')
  .version('0.0.0');

// inspect
program
  .command('inspect <file>')
  .description('Parse and analyze an OCPP trace file')
  .option('--format <format>', 'Output format (text)', 'text')
  .action(async (file: string, options: { format: string }) => {
    await inspectCommand(file, options);
  });

// report
program
  .command('report <file>')
  .description('Generate a report from an OCPP trace file')
  .option('-f, --format <format>', 'Report format (markdown)', 'markdown')
  .option('-o, --output <file>', 'Write report to file (default: stdout)')
  .action(async (file: string, options: { format: string; output?: string }) => {
    await reportCommand(file, options);
  });

// scenario
const scenarioCmd = program.command('scenario').description('Run predefined scenarios');

scenarioCmd
  .command('list')
  .description('List all available scenarios')
  .action(() => {
    scenarioListCommand();
  });

scenarioCmd
  .command('run [name]')
  .description('Run a scenario through the analysis engine (built-in or --file <path>)')
  .option('-f, --file <path>', 'Run an external scenario file instead of a built-in scenario')
  .action(async (name: string | undefined, options: { file?: string }) => {
    if (options.file) {
      await scenarioRunFileCommand(options.file);
    } else if (name) {
      await scenarioRunCommand(name);
    } else {
      throw new Error('Either a scenario name or --file <path> is required.');
    }
  });

// ci
program
  .command('ci [dir]')
  .description('Run all scenarios and exit 0 (all pass) or 1 (any fail)')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (dir: string | undefined, options: { format: string }) => {
    await ciCommand(dir, options);
  });

// anonymize
program
  .command('anonymize <file>')
  .description('Strip sensitive fields from a trace file')
  .option('-o, --output <file>', 'Write anonymized trace to file (default: stdout)')
  .action(async (file: string, options: { output?: string }) => {
    await anonymizeCommand(file, options);
  });

// diff
program
  .command('diff <a> <b>')
  .description('Compare two trace files and show differences')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (fileA: string, fileB: string, options: { format: string }) => {
    await diffCommand(fileA, fileB, options);
  });

program.parse();

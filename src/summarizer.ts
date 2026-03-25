import { Command } from 'commander';
import { openHtmlReport } from './io/open-html-report';
import { generateSummary } from './summary/generate-summary';

const program = new Command();

program
  .name('voyager-summarizer')
  .description('Centralize outcomes from multiple analysis tools')
  .version('0.0.0');

program
  .command('summary')
  .description('Generate consolidated summary from tool outputs')
  .option('-m, --tool-md <name=path>', 'Tool name to Markdown file mapping (repeatable)', collectKeyValue, [])
  .option('-h, --tool-html <name=path>', 'Tool name to HTML file mapping (repeatable)', collectKeyValue, [])
  .option('--tool-category <name=category>', 'Tool name to category mapping (repeatable)', collectKeyValue, [])
  .option('--tool-order-file <path d="">', 'File with tool ordering rules (<tool>: <priority>)')
  .option('-c, --conditions-file <path d="">', 'JSON file with condition rules')
  .option('--condition <rules.<id>.<field>=value>', 'Condition rule override (repeatable)', collectKeyValue, [])
  .option('--out-html <path d="">', 'Output path for HTML report')
  .option('--out-md <path d="">', 'Output path for Markdown report')
  .option('--no-open-html', 'Do not open generated HTML report')
  .action(async (options) => {
    console.log('summarized');

    const result = await generateSummary({
      toolMd: options.toolMd,
      toolHtml: options.toolHtml,
      toolCategory: options.toolCategory,
      toolOrderFile: options.toolOrderFile,
      conditionsFile: options.conditionsFile,
      conditions: options.condition,
      outHtml: options.outHtml,
      outMd: options.outMd
    });

    console.log(`Parsed ${result.parsedToolsCount} tool summaries`);

    for (const warning of result.parseWarnings) {
      console.warn(`Warning: ${warning}`);
    }

    if (result.writtenHtmlPath) {
      console.log(`Wrote HTML report to ${result.writtenHtmlPath}`);

      if (options.openHtml !== false) {
        try {
          await openHtmlReport(result.writtenHtmlPath);
          console.log('Opened HTML report in the default browser');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Unable to open HTML report automatically: ${message}`);
        }
      }
    }

    if (result.writtenMdPath) {
      console.log(`Wrote Markdown report to ${result.writtenMdPath}`);
    }
  });

function collectKeyValue(value: string, previous: string[][]): string[][] {
  const separatorIndex = value.indexOf('=');

  if (separatorIndex <= 0) {
    throw new Error(`Invalid key/value pair '${value}'. Expected format <key>=<value>`);
  }

  const key = value.slice(0, separatorIndex);
  const val = value.slice(separatorIndex + 1);
  previous.push([key, val]);
  return previous;
}

void program.parseAsync();

import { Command } from 'commander';
import { generateSummary } from './summary/generate-summary';

const program = new Command();

program
  .name('voyager-summarizer')
  .description('Centralize outcomes from multiple analysis tools')
  .version('0.0.0');

program
  .command('summary')
  .description('Generate consolidated summary from tool outputs')
  .option('-i, --input-dir <path d="">', 'Folder containing tool summary files')
  .option('-m, --tool-md <name=path>', 'Tool name to Markdown file mapping (repeatable)', collectKeyValue, [])
  .option('-h, --tool-html <name=path>', 'Tool name to HTML file mapping (repeatable)', collectKeyValue, [])
  .option('-c, --conditions-file <path d="">', 'JSON file with condition rules')
  .option('--condition <tool.rule=value>', 'Condition rule override (repeatable)', collectKeyValue, [])
  .option('--out-html <path d="">', 'Output path for HTML report')
  .option('--out-md <path d="">', 'Output path for Markdown report')
  .action(async (options) => {
    console.log('summarized');

    const result = await generateSummary({
      inputDir: options.inputDir,
      toolMd: options.toolMd,
      toolHtml: options.toolHtml,
      conditionsFile: options.conditionsFile,
      conditions: options.condition,
      outHtml: options.outHtml,
      outMd: options.outMd
    });

    console.log(`Parsed ${result.parsedToolsCount} tool summaries`);

    if (result.writtenHtmlPath) {
      console.log(`Wrote HTML report to ${result.writtenHtmlPath}`);
    }

    if (result.writtenMdPath) {
      console.log(`Wrote Markdown report to ${result.writtenMdPath}`);
    }
  });

function collectKeyValue(value: string, previous: string[][]) {
  const [key, val] = value.split('=');
  previous.push([key, val]);
  return previous;
}

void program.parseAsync();

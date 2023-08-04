export type Converter = {
  ifExecutable: (command: string, executeCommand: string) => string;
  ifExists: (path: string, executeCommand: string) => string;
  source: (path: string) => string;
  alias: (from: string, to: string) => string;
  environment: (from: string, to: string) => string;
  path: (path: string) => string;
  execute: (command: string) => string;
};

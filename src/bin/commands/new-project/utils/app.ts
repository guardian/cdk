import { CodeMaker } from "codemaker";
import type { Imports } from "./imports";
import type { Name } from "./utils";

interface AppBuilderProps {
  imports: Imports;
  appName: Name;
  stack: Name;
  stages: string[];
  outputFile: string;
  outputDir: string;
  comment?: string;
  migrated?: boolean;
}

export class AppBuilder {
  config: AppBuilderProps;

  code: CodeMaker;

  constructor(props: AppBuilderProps) {
    this.config = props;

    this.code = new CodeMaker({ indentationLevel: 2 });
    this.code.closeBlockFormatter = (s?: string): string => s ?? "}";
  }

  async constructCdkFile(): Promise<void> {
    const { comment, outputFile, imports, appName, stack, outputDir, stages } = this.config;

    this.code.openFile(outputFile);
    if (comment) {
      this.code.line(comment);
      this.code.line();
    }

    imports.render(this.code);

    this.code.line("const app = new App();");

    stages.forEach((stage) => {
      this.code.line(
        `new ${appName.pascal}(app, "${appName.pascal}-${stage}", { stack: "${stack.kebab}", stage: "${stage}" });`
      );
    });

    this.code.closeFile(outputFile);
    await this.code.save(outputDir);
  }
}

export const constructApp = async (props: AppBuilderProps): Promise<void> => {
  const builder = new AppBuilder(props);
  await builder.constructCdkFile();
};

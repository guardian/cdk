import { CodeMaker } from "codemaker";
import type { Imports } from "./imports";
import type { Name } from "./utils";

interface AppBuilderProps {
  imports: Imports;
  appName: Name;
  stack: Name;
  outputFile: string;
  outputDir: string;
  comment?: string;
  migrated?: boolean;
}

export class AppBuilder {
  config: AppBuilderProps;

  code: CodeMaker;

  /* eslint-disable -- copied from https://github.com/aws/aws-cdk/blob/eda1640fcaf6375d7edc5f8edcb5d69c82d130a1/packages/aws-cdk/lib/app.ts */
  constructor(props: AppBuilderProps) {
    this.config = props;

    this.code = new CodeMaker({ indentationLevel: 2 });
    this.code.closeBlockFormatter = (s?: string): string => s ?? "}";
  }
  /* eslint-enable */

  async constructCdkFile(): Promise<void> {
    this.code.openFile(this.config.outputFile);
    if (this.config.comment) {
      this.code.line(this.config.comment);
      this.code.line();
    }

    this.config.imports.render(this.code);

    this.code.line("const app = new App();");

    this.code.line("const cloudFormationStackName = process.env.GU_CFN_STACK_NAME;");

    this.code.line(
      `new ${this.config.appName.pascal}(app, "${this.config.appName.pascal}", { stack: "${this.config.stack.kebab}", cloudFormationStackName });`
    );

    this.code.closeFile(this.config.outputFile);
    await this.code.save(this.config.outputDir);
  }
}

export const constructApp = async (props: AppBuilderProps): Promise<void> => {
  const builder = new AppBuilder(props);
  await builder.constructCdkFile();
};

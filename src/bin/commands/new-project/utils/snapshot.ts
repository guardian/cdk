import { CodeMaker } from "codemaker";
import type { Imports } from "./imports";
import type { Name } from "./utils";

export interface TestBuilderProps {
  imports: Imports;
  appName: Name;
  stackName: Name;
  outputFile: string;
  outputDir: string;
  comment?: string;
}

export class TestBuilder {
  config: TestBuilderProps;
  imports: Imports;

  code: CodeMaker;

  constructor(props: TestBuilderProps) {
    this.config = props;
    this.imports = props.imports;

    this.code = new CodeMaker({ indentationLevel: 2 });
    this.code.closeBlockFormatter = (s?: string): string => s ?? "}";
  }

  async constructCdkFile(): Promise<void> {
    this.code.openFile(this.config.outputFile);
    if (this.config.comment) {
      this.code.line(this.config.comment);
      this.code.line();
    }

    this.config.imports.render(this.code);

    this.addTest();

    this.code.closeFile(this.config.outputFile);
    await this.code.save(this.config.outputDir);
  }

  addTest(): void {
    this.code.openBlock(`describe("The ${this.config.appName.pascal} stack", () =>`);
    this.code.openBlock(`it("matches the snapshot", () =>`);

    this.code.line("const app = new App();");
    this.code.line(
      `const stack = new ${this.config.appName.pascal}(app, "${this.config.appName.pascal}", { stack: "${this.config.stackName.kebab}" });`
    );
    this.code.line("expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();");

    this.code.closeBlock("});");
    this.code.closeBlock("});");
  }
}

export const constructTest = async (props: TestBuilderProps): Promise<void> => {
  const builder = new TestBuilder(props);
  await builder.constructCdkFile();
};

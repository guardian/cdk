import type { PackageManager } from "aws-sdk/clients/ecr";
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
  packageManager: PackageManager;
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

    this.config.packageManager === "deno" ? this.addTestDeno() : this.addTest();

    this.code.closeFile(this.config.outputFile);
    await this.code.save(this.config.outputDir);
  }

  addTest(): void {
    const { appName, stackName } = this.config;

    this.code.openBlock(`describe("The ${appName.pascal} stack", () =>`);
    this.code.openBlock(`it("matches the snapshot", () =>`);

    this.code.line("const app = new App();");
    this.code.line(
      `const stack = new ${appName.pascal}(app, "${appName.pascal}", { stack: "${stackName.kebab}", stage: "TEST" });`,
    );

    this.code.line(`const template = Template.fromStack(stack);`);
    this.code.line(`expect(template.toJSON()).toMatchSnapshot();`);

    this.code.closeBlock("});");
    this.code.closeBlock("});");
  }

  addTestDeno(): void {
    const { appName, stackName } = this.config;

    this.code.openBlock(`Deno.test("The ${appName.pascal} stack matches the screenshot", async (ctx) =>`);

    this.code.line("const app = new App();");
    this.code.line(
      `const stack = new ${appName.pascal}(app, "${appName.pascal}", { stack: "${stackName.kebab}", stage: "TEST" });`,
    );

    this.code.line(`const template = Template.fromStack(stack);`);
    this.code.line(`await assertSnapshot(ctx, template.toJSON());`);

    this.code.closeBlock("});");
  }
}

export const constructTest = async (props: TestBuilderProps): Promise<void> => {
  const builder = new TestBuilder(props);
  await builder.constructCdkFile();
};

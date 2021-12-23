import { CodeMaker } from "codemaker";
import type { Imports } from "./imports";
import type { Name } from "./utils";

interface StackBuilderProps {
  imports: Imports;
  appName: Name;
  outputFile: string;
  outputDir: string;
  comment?: string;
  yamlTemplateLocation?: string;
}

export class StackBuilder {
  config: StackBuilderProps;
  imports: Imports;

  code: CodeMaker;

  constructor(props: StackBuilderProps) {
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

    this.code.openBlock(`export class ${this.config.appName.pascal} extends GuStack`);
    this.code.openBlock(`constructor(scope: App, id: string, props: GuStackProps)`);
    this.code.line("super(scope, id, props);");

    if (this.config.yamlTemplateLocation) {
      this.code.line(`const yamlTemplateFilePath = join(__dirname, "../..", "${this.config.yamlTemplateLocation}");`);

      this.code.openBlock(`new CfnInclude(this, "YamlTemplate",`);
      this.code.line(`templateFile: yamlTemplateFilePath,`);
      this.code.openBlock("parameters:");
      this.code.line(`Stage: GuStageParameter.getInstance(this),`);

      this.code.closeBlock("},");
      this.code.closeBlock("});");
    }

    this.code.closeBlock();
    this.code.closeBlock();

    this.code.closeFile(this.config.outputFile);
    await this.code.save(this.config.outputDir);
  }
}

export const constructStack = async (props: StackBuilderProps): Promise<void> => {
  const builder = new StackBuilder(props);
  await builder.constructCdkFile();
};

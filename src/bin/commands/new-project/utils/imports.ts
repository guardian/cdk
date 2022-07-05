import type { CodeMaker } from "codemaker";
import type { Name } from "./utils";

interface Import {
  types: string[];
  components: string[];
  basic?: boolean;
}

export class Imports {
  private readonly imports: Record<string, Import>;

  private constructor(imports: Record<string, Import>) {
    this.imports = imports;
  }

  public static newStackImports(): Imports {
    return new Imports({
      path: {
        types: [],
        components: ["join"],
      },
      "aws-cdk-lib/cloudformation-include": {
        types: [],
        components: ["CfnInclude"],
      },
      "aws-cdk-lib": {
        types: ["App"],
        components: [],
      },
      "@guardian/cdk/lib/constructs/core": {
        types: ["GuStackProps"],
        components: ["GuStack"],
      },
    });
  }

  public static newAppImports({ kebab, pascal }: Name): Imports {
    return new Imports({
      "aws-cdk-lib": {
        types: [],
        components: ["App"],
      },
      "source-map-support/register": {
        basic: true,
        types: [],
        components: [],
      },
      [`../lib/${kebab}`]: {
        types: [],
        components: [pascal],
      },
    });
  }

  public static newTestImports({ kebab, pascal }: Name): Imports {
    return new Imports({
      "aws-cdk-lib": {
        types: [],
        components: ["App"],
      },
      "aws-cdk-lib/assertions": {
        types: [],
        components: ["Template"],
      },
      [`./${kebab}`]: {
        types: [],
        components: [pascal],
      },
    });
  }

  render(code: CodeMaker): void {
    Object.entries(this.imports)
      // Render "basic" imports before any others, still in alphabetical order
      // Render relative imports after absolute imports
      .sort(([aKey, aImports], [bKey, bImports]) => {
        if (aImports.basic && !bImports.basic) {
          return -1;
        } else if (bImports.basic && !aImports.basic) {
          return 1;
        } else if (aKey.startsWith(".") && !bKey.startsWith(".")) {
          return 1;
        } else if (bKey.startsWith(".") && !aKey.startsWith(".")) {
          return -1;
        } else {
          return aKey.localeCompare(bKey);
        }
      })
      .forEach(([lib, imports]) => {
        imports.basic && code.line(`import "${lib}";`);

        imports.types.length && code.line(`import type { ${imports.types.sort().join(", ")} } from "${lib}";`);

        imports.components.length && code.line(`import { ${imports.components.sort().join(", ")} } from "${lib}";`);
      });
    code.line();
  }
}

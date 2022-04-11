import type { CodeMaker } from "codemaker";
import type { Name } from "./utils";

interface Import {
  types: string[];
  components: string[];
  basic?: boolean;
}

export class Imports {
  imports: Record<string, Import>;

  constructor(imports?: Record<string, Import>) {
    this.imports = imports ?? {};
  }

  addImport(lib: string, components: string[], type = false): void {
    if (!Object.keys(this.imports).includes(lib)) {
      const imports = type ? { types: components, components: [] } : { types: [], components };

      this.imports[lib] = imports;
      return;
    }

    const imports = this.imports[lib];
    if (type) {
      // Check if any of the new types are already imported as components
      // if so, don't add them as types too
      imports.types = [...new Set(imports.types.concat(components.filter((c) => !imports.components.includes(c))))];
    } else {
      // Check if any of the new components are already imported as types
      // if so, remove them from types before we add them to components
      imports.types = imports.types.filter((t) => !components.includes(t));
      imports.components = [...new Set(imports.components.concat(components))];
    }

    this.imports[lib] = imports;
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

export const newStackImports = (): Imports => {
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
};

export const newAppImports = (app: Name): Imports => {
  const imports = new Imports({
    "aws-cdk-lib": {
      types: [],
      components: ["App"],
    },
    "source-map-support/register": {
      basic: true,
      types: [],
      components: [],
    },
  });

  imports.addImport(`../lib/${app.kebab}`, [app.pascal]);

  return imports;
};

export const newTestImports = (appName: Name): Imports => {
  const imports = new Imports({
    "aws-cdk-lib": {
      types: [],
      components: ["App"],
    },
    "aws-cdk-lib/assertions": {
      types: [],
      components: ["Template"],
    },
  });

  imports.addImport(`./${appName.kebab}`, [appName.pascal]);

  return imports;
};

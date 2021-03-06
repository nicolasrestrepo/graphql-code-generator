import 'graphql-codegen-core/dist/testing';
import { GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { plugin } from '../dist';

describe('TypeScript Server', () => {
  function buildSchema(ast: string): GraphQLSchema {
    return makeExecutableSchema({
      typeDefs: ast,
      allowUndefinedInResolve: true,
      resolverValidationOptions: {
        requireResolversForResolveType: false
      }
    });
  }

  const schema = buildSchema(`
    type Foo {
        bar: Bar
    }

    type Bar {
        qux: String
    }

    type Query {
      fieldTest: String
    }

    type Immut {
      fieldTest: String
      fieldTestMandatory: String!
      arrayTest1: [String]
      arrayTest2: [String]!
      arrayTest3: [String!]!
      arrayTest4: [String!]
    }
  `);

  describe('Config', () => {
    it('Should wrap with namepsace when schemaNamespace is specified', async () => {
      const content = await plugin(
        schema,
        [],
        { schemaNamespace: 'Models' },
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toContain(`export namespace Models {`);
    });
  });

  describe('Unions', () => {
    const schema = buildSchema(`
      type Query {
        fieldTest: C!
      }

      type A {
        f1: String
      }

      type B {
        f2: String
      }

      # Union description
      union C = A | B
    `);

    it('Should generate unions correctly', async () => {
      const content = await plugin(
        schema,
        [],
        {},
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
        export interface Query {
          fieldTest: C;
        }
      `);
      expect(content).toBeSimilarStringTo(`
        export interface A {
          f1?: Maybe<string>;
        }
      `);
      expect(content).toBeSimilarStringTo(`
        export interface B {
          f2?: Maybe<string>;
        }
      `);
      expect(content).toBeSimilarStringTo(`
        /** Union description */
        export type C = A | B;
      `);
    });

    it('Should generate unions correctly with interfacePrefix', async () => {
      const content = await plugin(
        schema,
        [],
        { interfacePrefix: 'Gql' },
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
        export interface GqlQuery {
          fieldTest: GqlC;
        }
      `);
      expect(content).toBeSimilarStringTo(`
        export interface GqlA {
          f1?: Maybe<string>;
        }
      `);
      expect(content).toBeSimilarStringTo(`
        export interface GqlB {
          f2?: Maybe<string>;
        }
      `);
      expect(content).toBeSimilarStringTo(`
        /** Union description */
        export type GqlC = GqlA | GqlB;
      `);
    });
  });

  describe('Arguments', () => {
    it('Should generate type arguments types correctly when using simple Scalar', async () => {
      const content = await plugin(
        buildSchema(`
        type Query {
          fieldTest(myArgument: T!): Return
        }

        type Return {
          ok: Boolean!
          msg: String!
        }

        input T {
          f1: String
          f2: Int!
          f3: [String]
          f4: [String]!
          f5: [String!]!
          f6: [String!]
        }
      `),
        [],
        {},
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
       export interface Query {
          fieldTest?: Maybe<Return>;
        }
      `);
      expect(content).toBeSimilarStringTo(`
        export interface Return {
          ok: boolean;
          msg: string;
        }
      `);
      expect(content).toBeSimilarStringTo(`
        export interface FieldTestQueryArgs {
          myArgument: T;
        }
      `);
    });

    it('Should generate type arguments types correctly when using simple Scalar', async () => {
      const content = await plugin(
        buildSchema(`
        type Query {
          fieldTest(arg1: String): String!
        }
      `),
        [],
        {},
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
        export interface Query {
          fieldTest: string;
        }
      `);
      expect(content).toBeSimilarStringTo(`
        export interface FieldTestQueryArgs {
          arg1?: Maybe<string>;
        }
      `);
    });
  });

  describe('Interface', () => {
    it('Should generate correctly when using simple type that extends interface', async () => {
      const content = await plugin(
        buildSchema(`
        type Query {
          fieldTest: A!
        }

        interface Base {
          f1: String
        }

        type A implements Base {
          f1: String
          f2: String
        }
      `),
        [],
        {},
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
      export interface Base {
        f1?: Maybe<string>;
      }
      `);
      expect(content).toBeSimilarStringTo(`
      export interface A extends Base {
        f1?: Maybe<string>;
        f2?: Maybe<string>;
      }
      `);
      expect(content).toBeSimilarStringTo(`
      export interface Query {
        fieldTest: A;
      }
      `);
    });
  });

  describe('Types', () => {
    it('Should generate names correctly (default pascalCase)', async () => {
      const content = await plugin(
        buildSchema(`
        type Query {
          fieldTest: [CBText]
        }
        union CBText = ABText | BBText
        scalar ABText
        scalar BBText
      `),
        [],
        {},
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
      export interface Query {
        fieldTest?: Maybe<(Maybe<CbText>)[]>;
      }
    `);
      expect(content).toBeSimilarStringTo(`
      export type CbText = AbText | BbText;
    `);
    });

    it('Should generate names correctly (custom naming)', async () => {
      const content = await plugin(
        buildSchema(`
        type Query {
          fieldTest: [CBText]
        }
        union CBText = ABText | BBText
        scalar ABText
        scalar BBText
      `),
        [],
        { namingConvention: 'change-case#lowerCase' },
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
      export interface query {
        fieldTest?: Maybe<(Maybe<cbtext>)[]>;
      }
    `);
      expect(content).toBeSimilarStringTo(`
      export type cbtext = abtext | bbtext;
    `);
    });

    it('Should generate correctly when using a simple Query with some fields and types', async () => {
      const content = await plugin(
        buildSchema(`
          type Query {
            fieldTest: String
          }

          type T {
            f1: String
            f2: Int
          }
      `),
        [],
        {},
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
        export interface Query {
          fieldTest?: Maybe<string>;
        }
      `);
      expect(content).toBeSimilarStringTo(`
        export interface T {
          f1?: Maybe<string>;
          f2?: Maybe<number>;
        }
      `);
    });

    it('Should generate correctly when using a simple Query with arrays and required', async () => {
      const content = await plugin(
        buildSchema(`
        type Query {
          fieldTest: T
        }

        type T {
          f1: [String]
          f2: Int!
          f3: A
          f4: [[[String]]]
        }

        type A {
          f4: T
        }
      `),
        [],
        {},
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
      export interface Query {
        fieldTest?: Maybe<T>;
      }
      `);
      expect(content).toBeSimilarStringTo(`
      export interface A {
        f4?: Maybe<T>;
      }
      `);
      expect(content).toBeSimilarStringTo(`
        export interface T {
          f1?: Maybe<(Maybe<string>)[]>;
          f2: number;
          f3?: Maybe<A>;
          f4?: Maybe<(Maybe<string>)[][][]>;
        }
      `);
    });

    it('Should handle immutable type correctly with immutableTypes', async () => {
      const content = await plugin(
        schema,
        [],
        { immutableTypes: true },
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
        export interface Bar {
          readonly qux?: Maybe<string>;
        }
      `);

      expect(content).toBeSimilarStringTo(`
        export interface Immut {
          readonly fieldTest?: Maybe<string>;
          readonly fieldTestMandatory: string;
          readonly arrayTest1?: Maybe<ReadonlyArray<Maybe<string>>>;
          readonly arrayTest2: ReadonlyArray<Maybe<string>>;
          readonly arrayTest3: ReadonlyArray<string>;
          readonly arrayTest4?: Maybe<ReadonlyArray<string>>;
        }
      `);
    });

    it('Should generate the correct output when using avoidOptionals=true', async () => {
      const content = await plugin(
        schema,
        [],
        { avoidOptionals: true },
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
        export interface Bar {
          qux: Maybe<string>;
        }
      `);
    });

    it('Should output docstring correctly', async () => {
      const content = await plugin(
        buildSchema(`
      # type-description
      type Query {
        # field-description
        fieldTest: String
      }

      schema {
        query: Query
      }
    `),
        [],
        {},
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`/** type-description */`);
      expect(content).toBeSimilarStringTo(`
        export interface Query {
          /** field-description */
          fieldTest?: Maybe<string>;
        }`);
    });
  });

  describe('Scalars', () => {
    it('Should generate correctly scalars without definition of it', async () => {
      const content = await plugin(
        buildSchema(`
        type Query {
          fieldTest: [Date]
        }

        scalar Date
      `),
        [],
        {},
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
      export interface Query {
        fieldTest?: Maybe<(Maybe<Date>)[]>;
      }
      `);
    });

    it('Should generate correctly scalars with custom scalar type', async () => {
      const content = await plugin(
        buildSchema(`
        type Query {
          fieldTest: [Date]
        }

        scalar Date
      `),
        [],
        {
          scalars: {
            Date: 'MyCustomDate'
          }
        },
        {
          outputFile: 'graphql.ts'
        }
      );

      expect(content).toBeSimilarStringTo(`
      export interface Query {
        fieldTest?: Maybe<(Maybe<MyCustomDate>)[]>;
      }
      `);
    });
  });

  it('should generate correctly when using a Query with some fields and variables', async () => {
    const content = await plugin(
      buildSchema(`
        type Query {
          fieldTest(limit: Int = 42): [String]
        }
    `),
      [],
      {},
      {
        outputFile: 'graphql.ts'
      }
    );

    expect(content).toBeSimilarStringTo(`
      export interface Query {
        fieldTest?: Maybe<(Maybe<string>)[]>;
      }
    `);

    expect(content).toBeSimilarStringTo(`
      export interface FieldTestQueryArgs {
        limit?: number;
      }
    `);
  });
});

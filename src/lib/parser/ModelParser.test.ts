/* eslint-disable @typescript-eslint/no-magic-numbers */
import { expect, it } from "vitest";
import { ModelParser } from "./ModelParser";

it("parses top level type aliases and interfaces into models", () => {
  const parser = new ModelParser("interface A { a: string; }; type B = { b: string };");
  const models = parser.getModels();

  expect(models.length).toBe(2);
  expect(models[0]).toEqual({
    id: "A",
    name: "A",
    schema: [{ name: "a", type: "string" }],
    dependencies: [],
    dependants: [],
    type: "interface",
    arguments: [],
  });
  expect(models[1]).toEqual({
    id: "B",
    name: "B",
    schema: [{ name: "b", type: "string" }],
    dependencies: [],
    dependants: [],
    type: "typeAlias",
    arguments: [],
  });
});

it("parses exported top level type aliases and interfaces into models", () => {
  const parser = new ModelParser("export interface A { a: string; }; export type B = { b: string };");
  const models = parser.getModels();

  expect(models.length).toBe(2);
  expect(models[0]).toEqual({
    id: "A",
    name: "A",
    schema: [{ name: "a", type: "string" }],
    dependencies: [],
    dependants: [],
    type: "interface",
    arguments: [],
  });
  expect(models[1]).toEqual({
    id: "B",
    name: "B",
    schema: [{ name: "b", type: "string" }],
    dependencies: [],
    dependants: [],
    type: "typeAlias",
    arguments: [],
  });
});

it("supports type aliases with kind != TypeLiteral", () => {
  const parser = new ModelParser("type A = string; type B = { field: A };");
  const models = parser.getModels();

  expect(models.length).toBe(2);
  expect(models[0]).toEqual({
    id: "A",
    name: "A",
    schema: [
      {
        name: "==>",
        type: "string",
      },
    ],
    dependencies: [],
    dependants: [expect.objectContaining({ name: "B" })],
    type: "typeAlias",
    arguments: [],
  });
  expect(models[1]).toEqual({
    id: "B",
    name: "B",
    schema: [{ name: "field", type: expect.objectContaining({ name: "A" }) }],
    dependencies: [expect.objectContaining({ name: "A" })],
    dependants: [],
    type: "typeAlias",
    arguments: [],
  });
});

it("supports declaration merging", () => {
  const parser = new ModelParser(`
    interface A { a: string; }
    interface A { b: string; }
  `);
  const models = parser.getModels();

  expect(models.length).toBe(1);
  expect(models[0]).toEqual({
    id: "A",
    name: "A",
    schema: [
      { name: "a", type: "string" },
      { name: "b", type: "string" },
    ],
    dependencies: [],
    dependants: [],
    type: "interface",
    arguments: [],
  });
});

it("parses arrays of primitives", () => {
  const parser = new ModelParser("type A = { a: string[] };");
  const models = parser.getModels();

  expect(models.length).toBe(1);
  expect(models[0]).toEqual({
    id: "A",
    name: "A",
    schema: [{ name: "a", type: "array", elementType: "string" }],
    dependencies: [],
    dependants: [],
    type: "typeAlias",
    arguments: [],
  });
});

it("parses arrays of models", () => {
  const parser = new ModelParser("type A = { a: B[] }; type B = { b: string };");
  const models = parser.getModels();

  expect(models.length).toBe(2);
  expect(models[0]).toEqual({
    id: "A",
    name: "A",
    schema: [
      {
        name: "a",
        type: "array",
        elementType: expect.objectContaining({
          id: "B",
          name: "B",
          schema: [{ name: "b", type: "string" }],
        }),
      },
    ],
    dependencies: [expect.objectContaining({ name: "B" })],
    dependants: [],
    type: "typeAlias",
    arguments: [],
  });
  expect(models[1]).toEqual({
    id: "B",
    name: "B",
    schema: [{ name: "b", type: "string" }],
    dependencies: [],
    dependants: [expect.objectContaining({ name: "A" })],
    type: "typeAlias",
    arguments: [],
  });
});

it("parses references", () => {
  const parser = new ModelParser(`
    type A = { a: Array<string> };
    type B = { b: Record<string, A> };
    type C = { c: Map<A, A> };
  `);
  const models = parser.getModels();

  expect(models.length).toBe(3);
  expect(models[0]).toEqual({
    id: "A",
    name: "A",
    schema: [{ name: "a", type: "array", elementType: "string" }],
    dependencies: [],
    dependants: [expect.objectContaining({ name: "B" }), expect.objectContaining({ name: "C" })],
    type: "typeAlias",
    arguments: [],
  });
  expect(models[1]).toEqual({
    id: "B",
    name: "B",
    schema: [
      {
        name: "b",
        type: "reference",
        referenceName: "Record",
        arguments: ["string", expect.objectContaining({ name: "A" })],
      },
    ],
    dependencies: [expect.objectContaining({ name: "A" })],
    dependants: [],
    type: "typeAlias",
    arguments: [],
  });
  expect(models[2]).toEqual({
    id: "C",
    name: "C",
    schema: [
      {
        name: "c",
        type: "reference",
        referenceName: "Map",
        arguments: [expect.objectContaining({ name: "A" }), expect.objectContaining({ name: "A" })],
      },
    ],
    dependencies: [expect.objectContaining({ name: "A" })],
    dependants: [],
    type: "typeAlias",
    arguments: [],
  });
});

it("parses type alias functions and interface methods", () => {
  const parser = new ModelParser(`
    type A = { a: (b: string) => string };
    interface B {
      b(c: string) => string
    };
  `);
  const models = parser.getModels();

  expect(models.length).toBe(2);

  expect(models[0]).toEqual({
    id: "B",
    name: "B",
    schema: [
      {
        name: "b",
        type: "function",
        arguments: [{ name: "c", type: "string" }],
        returnType: "string",
      },
    ],
    dependencies: [],
    dependants: [],
    type: "interface",
    arguments: [],
  });

  expect(models[1]).toEqual({
    id: "A",
    name: "A",
    schema: [
      {
        name: "a",
        type: "function",
        arguments: [{ name: "b", type: "string" }],
        returnType: "string",
      },
    ],
    dependencies: [],
    dependants: [],
    type: "typeAlias",
    arguments: [],
  });
});

it("parses generic alias and interface arguments", () => {
  const parser = new ModelParser(`
    type A<T> = { a: T };
    interface B<T, U extends string> {
      b: T
    };
  `);
  const models = parser.getModels();

  expect(models.length).toBe(2);

  expect(models[0]).toEqual({
    id: "B",
    name: "B",
    schema: [{ name: "b", type: "T" }],
    dependencies: [],
    dependants: [],
    type: "interface",
    arguments: [{ name: "T" }, { name: "U", extends: "string" }],
  });

  expect(models[1]).toEqual({
    id: "A",
    name: "A",
    schema: [{ name: "a", type: "T" }],
    dependencies: [],
    dependants: [],
    type: "typeAlias",
    arguments: [{ name: "T" }],
  });
});

it("parses classes", () => {
  const parser = new ModelParser(`
    class A { foo: string; }
    class B { bar(): string { throw new Error(); } }
    class C extends A implements B { bar() { return "baz"; } }
  `);
  const models = parser.getModels();

  expect(models.length).toBe(3);

  expect(models[0]).toEqual({
    id: "A",
    name: "A",
    schema: [{ name: "foo", type: "string" }],
    dependencies: [],
    dependants: [],
    type: "class",
    arguments: [],
  });
});
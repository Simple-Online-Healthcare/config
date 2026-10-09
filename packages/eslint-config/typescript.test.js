import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

import { ESLint } from 'eslint';

const eslint = new ESLint({
  overrideConfigFile: fileURLToPath(
    new URL('./typescript.test.config.js', import.meta.url),
  ),
});

const lint = async (code) => {
  const [result] = await eslint.lintText(code, { filePath: 'example.ts' });

  return result.messages;
};

const lintForRule = async (code, ruleId) => {
  const messages = await lint(code);

  return messages.filter((message) => message.ruleId === ruleId);
};

test('rejects as type assertions', async () => {
  const messages = await lintForRule(
    'declare const value: unknown;\nvoid (value as string);',
    '@typescript-eslint/consistent-type-assertions',
  );

  assert.equal(messages.length, 1);
});

test('rejects angle-bracket type assertions', async () => {
  const messages = await lintForRule(
    'declare const value: unknown;\nvoid (<string>value);',
    '@typescript-eslint/consistent-type-assertions',
  );

  assert.equal(messages.length, 1);
});

test('allows const assertions', async () => {
  const messages = await lintForRule(
    "void ('value' as const);",
    '@typescript-eslint/consistent-type-assertions',
  );

  assert.deepEqual(messages, []);
});

test('rejects indexed access types', async () => {
  const messages = await lintForRule(
    "type User = { username: string };\nconst username: User['username'] = 'username';\nvoid username;",
    'no-restricted-syntax',
  );

  assert.equal(messages.length, 1);
  assert.equal(messages[0].message, 'Indexed access types are not allowed.');
});

test('allows inferred exported function return types', async () => {
  const messages = await lint(
    "interface User { username: string }\nexport const getUsername = (user: User) => user.username;",
  );

  assert.deepEqual(messages, []);
});

test('allows local variable inference', async () => {
  const messages = await lint(
    "const username = 'username';\nvoid username;",
  );

  assert.deepEqual(messages, []);
});

test('requires conditional types to be named aliases', async () => {
  const messages = await lintForRule(
    'export interface Result<T> { value: T extends string ? true : false }',
    'no-restricted-syntax',
  );

  assert.equal(
    messages.some(
      ({ message }) =>
        message === 'Conditional types must be declared as named type aliases.',
    ),
    true,
  );
});

test('allows conditional types as named aliases', async () => {
  const messages = await lint(
    'export type IsString<T> = T extends string ? true : false;',
  );

  assert.deepEqual(messages, []);
});

test('requires mapped types to be named aliases', async () => {
  const messages = await lintForRule(
    'export interface Result<T> { value: { [K in keyof T]: boolean } }',
    'no-restricted-syntax',
  );

  assert.equal(
    messages.some(
      ({ message }) =>
        message === 'Mapped types must be declared as named type aliases.',
    ),
    true,
  );
});

test('allows mapped types as named aliases', async () => {
  const messages = await lint(
    'export type Flags<T> = { [K in keyof T]: boolean };',
  );

  assert.deepEqual(messages, []);
});

test('requires type queries to be named aliases', async () => {
  const messages = await lintForRule(
    'const runtimeValue = true;\nexport interface Config { value: typeof runtimeValue }',
    'no-restricted-syntax',
  );

  assert.equal(
    messages.some(
      ({ message }) =>
        message === 'Type queries must be declared as named type aliases.',
    ),
    true,
  );
});

test('allows type queries as named aliases', async () => {
  const messages = await lint(
    'export const runtimeValue = true;\nexport type RuntimeValue = typeof runtimeValue;',
  );

  assert.deepEqual(messages, []);
});

test('rejects nested utility types', async () => {
  const messages = await lintForRule(
    'type User = { username: string };\nexport type Update = Readonly<Partial<User>>;',
    'no-restricted-syntax',
  );

  assert.equal(
    messages.some(
      ({ message }) => message === 'Nested utility types are not allowed.',
    ),
    true,
  );
});

test('allows single utility types', async () => {
  const messages = await lint(
    'interface User { username: string }\nexport type Update = Partial<User>;',
  );

  assert.deepEqual(messages, []);
});

test('allows satisfies expressions', async () => {
  const messages = await lint(
    "export const user = { username: 'username' } satisfies { username: string };",
  );

  assert.deepEqual(messages, []);
});

test('requires type-only imports', async () => {
  const messages = await lintForRule(
    "import { User } from './user';\ndeclare const user: User;\nvoid user;",
    '@typescript-eslint/consistent-type-imports',
  );

  assert.equal(messages.length, 1);
});

test('rejects inline type-only import specifiers', async () => {
  const messages = await lintForRule(
    "import { type User } from './user';\ndeclare const user: User;\nvoid user;",
    '@typescript-eslint/no-import-type-side-effects',
  );

  assert.equal(messages.length, 1);
});

test('rejects floating promises', async () => {
  const messages = await lintForRule(
    'Promise.resolve();',
    '@typescript-eslint/no-floating-promises',
  );

  assert.equal(messages.length, 1);
});

test('rejects promises passed to void callbacks', async () => {
  const messages = await lintForRule(
    'declare const run: (callback: () => void) => void;\nrun(async () => {});',
    '@typescript-eslint/no-misused-promises',
  );

  assert.equal(messages.length, 1);
});

test('requires exhaustive switches', async () => {
  const messages = await lintForRule(
    "type Status = 'open' | 'closed';\nfunction handle(status: Status) { switch (status) { case 'open': break; } }\nvoid handle;",
    '@typescript-eslint/switch-exhaustiveness-check',
  );

  assert.equal(messages.length, 1);
});

test('rejects throwing non-error values', async () => {
  const messages = await lintForRule(
    "throw 'failed';",
    '@typescript-eslint/only-throw-error',
  );

  assert.equal(messages.length, 1);
});

test('rejects deprecated APIs', async () => {
  const messages = await lintForRule(
    '/** @deprecated */\ndeclare const oldApi: () => void;\noldApi();',
    '@typescript-eslint/no-deprecated',
  );

  assert.equal(messages.length, 1);
});

test('rejects explicit any types', async () => {
  const messages = await lintForRule(
    'declare const value: any;\nvoid value;',
    '@typescript-eslint/no-explicit-any',
  );

  assert.equal(messages.length, 1);
});

test('rejects unnecessary conditions', async () => {
  const messages = await lintForRule(
    'declare const user: object;\nif (user) { void user; }',
    '@typescript-eslint/no-unnecessary-condition',
  );

  assert.equal(messages.length, 1);
});

test('rejects unused variables', async () => {
  const messages = await lintForRule(
    'const unused = true;',
    '@typescript-eslint/no-unused-vars',
  );

  assert.equal(messages.length, 1);
});

test('rejects void expressions used as values', async () => {
  const messages = await lintForRule(
    'declare const log: () => void;\nconst result = log();\nvoid result;',
    '@typescript-eslint/no-confusing-void-expression',
  );

  assert.equal(messages.length, 1);
});

test('allows void-returning arrow shorthand', async () => {
  const messages = await lintForRule(
    'declare const values: string[];\ndeclare const consume: (value: string) => void;\nvalues.forEach((value) => consume(value));',
    '@typescript-eslint/no-confusing-void-expression',
  );

  assert.deepEqual(messages, []);
});

test('requires readonly for private fields assigned only in constructors', async () => {
  const messages = await lintForRule(
    'export class User { private name: string; constructor(name: string) { this.name = name; } getName() { return this.name; } }',
    '@typescript-eslint/prefer-readonly',
  );

  assert.equal(messages.length, 1);
});

test('does not require strict boolean expressions', async () => {
  const messages = await lintForRule(
    "declare const username: string;\nif (username) { void username; }",
    '@typescript-eslint/strict-boolean-expressions',
  );

  assert.deepEqual(messages, []);
});

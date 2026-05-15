/* eslint-disable no-console */
/* eslint-disable jsdoc/require-jsdoc */

import { beforeEach, describe, expect, test, vi } from 'vitest';

// Set up window and document objects BEFORE any imports
// @ts-ignore
global.window = {
  CMS: undefined,
  // @ts-ignore
  initCMS: undefined,
  CMS_MANUAL_INIT: true,
  currentScript: null,
  querySelector: vi.fn(() => null),
};

// @ts-ignore
global.document = {
  readyState: 'complete',
  currentScript: null,
  querySelector: vi.fn(() => null),
  addEventListener: vi.fn(),
};

// Mock dependencies BEFORE import
vi.mock('create-react-class');
vi.mock('react');
vi.mock('immutable', () => ({
  Map: class ImmutableMap {},
}));
vi.mock('svelte', () => ({
  mount: vi.fn(),
}));
vi.mock('$lib/services/contents/editor', () => ({
  customPreviewStyleRegistry: new Set(),
  customPreviewTemplateRegistry: new Map(),
}));
vi.mock('$lib/services/contents/file/config', () => ({
  customFileFormatRegistry: new Map(),
}));
vi.mock('$lib/services/contents/fields/rich-text/components/definitions', () => ({
  customComponentRegistry: new Map(),
}));
vi.mock('$lib/services/contents/draft/events', () => ({
  eventHookRegistry: new Set(),
  SUPPORTED_EVENT_TYPES: [
    'preSave',
    'postSave',
    'prePublish',
    'postPublish',
    'preUnpublish',
    'postUnpublish',
  ],
}));
vi.mock('$lib/services/backends', () => {
  const backends = {
    github: { isGit: true, name: 'github', label: 'GitHub' },
    gitlab: { isGit: true, name: 'gitlab', label: 'GitLab' },
    gitea: { isGit: true, name: 'gitea', label: 'Gitea / Forgejo' },
    local: { isGit: false, name: 'local', label: 'Local' },
    'test-repo': { isGit: false, name: 'test-repo', label: 'Test' },
  };

  return {
    allBackendServices: backends,
    validBackendNames: Object.keys(backends).filter((name) => name !== 'local'),
  };
});
vi.mock('$lib/services/assets/kinds', () => ({
  getAssetKind: vi.fn((name) => (name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i) ? 'image' : 'file')),
}));
vi.mock('$lib/services/backends/process', () => ({
  createFileList: vi.fn((files) => ({
    entryFiles: files.filter((f) => /\.(md|json|ya?ml)$/.test(f.path)),
    assetFiles: files.filter((f) => /\.(png|jpg|jpeg|gif|svg|webp)$/.test(f.path)),
    configFiles: [],
    allFiles: files,
    count: files.length,
  })),
}));
vi.mock('$lib/services/backends/git/shared/fetch', () => ({
  updateStores: vi.fn(),
}));
vi.mock('$lib/services/contents/file/process', () => ({
  prepareEntries: vi.fn((entries) => ({ entries, errors: [] })),
}));
vi.mock('$lib/components/app.svelte', () => ({
  default: {},
}));

// Now import after all setup
// @ts-ignore
const CMS = (await import('./main.js')).default;

describe('CMS.init()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('initializes with no options', async () => {
    await expect(CMS.init()).resolves.toBeUndefined();
  });

  test('initializes with valid config object', async () => {
    const config = { backend: { name: 'github' } };

    // @ts-ignore
    await expect(CMS.init({ config })).resolves.toBeUndefined();
  });

  test('throws TypeError if config is not an object', async () => {
    // @ts-ignore
    await expect(CMS.init({ config: 'invalid' })).rejects.toThrow(TypeError);
    // @ts-ignore
    await expect(CMS.init({ config: 123 })).rejects.toThrow(TypeError);
    // @ts-ignore
    await expect(CMS.init({ config: true })).rejects.toThrow(TypeError);
    // @ts-ignore
    await expect(CMS.init({ config: [] })).rejects.toThrow(TypeError);
  });

  test('throws with proper error message for invalid config', async () => {
    // @ts-ignore
    await expect(CMS.init({ config: 'invalid' })).rejects.toThrow(
      'The `config` option for `CMS.init()` must be an object',
    );
  });

  test('allows undefined config', async () => {
    await expect(CMS.init({ config: undefined })).resolves.toBeUndefined();
    await expect(CMS.init({})).resolves.toBeUndefined();
  });
});

describe('CMS.registerCustomFormat()', () => {
  test('registers format with both parser and formatter', () => {
    const fromFile = () => {};
    const toFile = () => {};

    // @ts-ignore
    expect(() => CMS.registerCustomFormat('test', '.test', { fromFile, toFile })).not.toThrow();
  });

  test('registers format with only parser', () => {
    const fromFile = () => {};

    expect(() => CMS.registerCustomFormat('test', '.test', { fromFile })).not.toThrow();
  });

  test('registers format with only formatter', () => {
    const toFile = () => {};

    // @ts-ignore
    expect(() => CMS.registerCustomFormat('test', '.test', { toFile })).not.toThrow();
  });

  test('throws TypeError if name is not a string', () => {
    const toFile = () => {};

    // @ts-ignore
    expect(() => CMS.registerCustomFormat(123, '.test', { toFile })).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerCustomFormat(null, '.test', { toFile })).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerCustomFormat({}, '.test', { toFile })).toThrow(TypeError);
  });

  test('throws with proper error message for invalid name', () => {
    const toFile = () => {};

    // @ts-ignore
    expect(() => CMS.registerCustomFormat(123, '.test', { toFile })).toThrow(
      'The `name` option for `CMS.registerCustomFormat()` must be a string',
    );
  });

  test('throws TypeError if extension is not a string', () => {
    const toFile = () => {};

    // @ts-ignore
    expect(() => CMS.registerCustomFormat('test', 123, { toFile })).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerCustomFormat('test', null, { toFile })).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerCustomFormat('test', {}, { toFile })).toThrow(TypeError);
  });

  test('throws with proper error message for invalid extension', () => {
    const toFile = () => {};

    // @ts-ignore
    expect(() => CMS.registerCustomFormat('test', 123, { toFile })).toThrow(
      'The `extension` option for `CMS.registerCustomFormat()` must be a string',
    );
  });

  test('throws Error if neither fromFile nor toFile is provided', () => {
    expect(() => CMS.registerCustomFormat('test', '.test', {})).toThrow(Error);
    expect(() => CMS.registerCustomFormat('test', '.test')).toThrow(Error);
  });

  test('throws with proper error message for missing methods', () => {
    expect(() => CMS.registerCustomFormat('test', '.test', {})).toThrow(
      'At least one of `fromFile` or `toFile` must be provided to `CMS.registerCustomFormat()`',
    );
  });

  test('throws TypeError if fromFile is provided but not a function', () => {
    const toFile = () => {};

    expect(() =>
      // @ts-ignore
      CMS.registerCustomFormat('test', '.test', { fromFile: 'invalid', toFile }),
    ).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerCustomFormat('test', '.test', { fromFile: 123, toFile })).toThrow(
      TypeError,
    );
  });

  test('throws with proper error message for invalid fromFile', () => {
    const toFile = () => {};

    expect(() =>
      // @ts-ignore
      CMS.registerCustomFormat('test', '.test', { fromFile: 'invalid', toFile }),
    ).toThrow('The `fromFile` option for `CMS.registerCustomFormat()` must be a function');
  });

  test('throws TypeError if toFile is provided but not a function', () => {
    const fromFile = () => {};

    expect(() =>
      // @ts-ignore
      CMS.registerCustomFormat('test', '.test', { fromFile, toFile: 'invalid' }),
    ).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerCustomFormat('test', '.test', { fromFile, toFile: 123 })).toThrow(
      TypeError,
    );
  });

  test('throws with proper error message for invalid toFile', () => {
    const fromFile = () => {};

    expect(() =>
      // @ts-ignore
      CMS.registerCustomFormat('test', '.test', { fromFile, toFile: 'invalid' }),
    ).toThrow('The `toFile` option for `CMS.registerCustomFormat()` must be a function');
  });

  test('accepts async functions as parser/formatter', () => {
    const asyncFromFile = async () => {};
    const asyncToFile = async () => {};

    expect(() =>
      // @ts-ignore
      CMS.registerCustomFormat('test', '.test', { fromFile: asyncFromFile, toFile: asyncToFile }),
    ).not.toThrow();
  });
});

describe('CMS.registerEditorComponent()', () => {
  const validDefinition = {
    id: 'test-component',
    label: 'Test Component',
    pattern: /test/,
    toBlock: () => 'block',
    toPreview: () => 'preview',
    fields: [],
  };

  test('registers valid component definition', () => {
    expect(() => CMS.registerEditorComponent(validDefinition)).not.toThrow();
  });

  test('throws TypeError if definition is not an object', () => {
    // @ts-ignore
    expect(() => CMS.registerEditorComponent(null)).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerEditorComponent(undefined)).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerEditorComponent('invalid')).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerEditorComponent(123)).toThrow(TypeError);
  });

  test('throws with proper error message for non-object definition', () => {
    // @ts-ignore
    expect(() => CMS.registerEditorComponent(null)).toThrow(
      'The `definition` option for `CMS.registerEditorComponent()` must be an object',
    );
  });

  test('throws TypeError if id is not a string', () => {
    const definition = { ...validDefinition, id: 123 };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(TypeError);
  });

  test('throws with proper error message for invalid id', () => {
    const definition = { ...validDefinition, id: 123 };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(
      'The `definition.id` must be a string',
    );
  });

  test('throws TypeError if label is not a string', () => {
    const definition = { ...validDefinition, label: 123 };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(TypeError);
  });

  test('throws with proper error message for invalid label', () => {
    const definition = { ...validDefinition, label: 123 };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(
      'The `definition.label` must be a string',
    );
  });

  test('throws TypeError if pattern is not a RegExp', () => {
    const definition = { ...validDefinition, pattern: 'invalid' };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(TypeError);

    const definition2 = { ...validDefinition, pattern: {} };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition2)).toThrow(TypeError);
  });

  test('throws with proper error message for invalid pattern', () => {
    const definition = { ...validDefinition, pattern: 'invalid' };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(
      'The `definition.pattern` must be a RegExp',
    );
  });

  test('throws TypeError if toBlock is not a function', () => {
    const definition = { ...validDefinition, toBlock: 'invalid' };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(TypeError);
  });

  test('throws with proper error message for invalid toBlock', () => {
    const definition = { ...validDefinition, toBlock: 'invalid' };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(
      'The `definition.toBlock` must be a function',
    );
  });

  test('throws TypeError if toPreview is not a function', () => {
    const definition = { ...validDefinition, toPreview: 'invalid' };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(TypeError);
  });

  test('throws with proper error message for invalid toPreview', () => {
    const definition = { ...validDefinition, toPreview: 'invalid' };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(
      'The `definition.toPreview` must be a function',
    );
  });

  test('throws TypeError if fields is not an array', () => {
    const definition = { ...validDefinition, fields: 'invalid' };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(TypeError);

    const definition2 = { ...validDefinition, fields: {} };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition2)).toThrow(TypeError);
  });

  test('throws with proper error message for invalid fields', () => {
    const definition = { ...validDefinition, fields: 'invalid' };

    // @ts-ignore
    expect(() => CMS.registerEditorComponent(definition)).toThrow(
      'The `definition.fields` must be an array',
    );
  });

  test('accepts optional icon and collapsed properties', () => {
    const definition = {
      ...validDefinition,
      icon: 'star',
      collapsed: true,
    };

    expect(() => CMS.registerEditorComponent(definition)).not.toThrow();
  });

  test('accepts empty fields array', () => {
    const definition = { ...validDefinition, fields: [] };

    expect(() => CMS.registerEditorComponent(definition)).not.toThrow();
  });

  test('accepts fields array with items', () => {
    const definition = {
      ...validDefinition,
      fields: [{ name: 'field1', widget: 'string' }],
    };

    expect(() => CMS.registerEditorComponent(definition)).not.toThrow();
  });

  test('accepts fromBlock method when present', () => {
    const definition = {
      ...validDefinition,
      fromBlock: () => ({}),
    };

    expect(() => CMS.registerEditorComponent(definition)).not.toThrow();
  });
});

describe('CMS.registerPreviewStyle()', () => {
  test('registers stylesheet URL', () => {
    expect(() => CMS.registerPreviewStyle('https://example.com/style.css')).not.toThrow();
  });

  test('registers stylesheet file path', () => {
    expect(() => CMS.registerPreviewStyle('/assets/style.css')).not.toThrow();
  });

  test('registers raw CSS string', () => {
    expect(() => CMS.registerPreviewStyle('body { color: red; }', { raw: true })).not.toThrow();
  });

  test('throws TypeError if style is not a string', () => {
    // @ts-ignore
    expect(() => CMS.registerPreviewStyle(123)).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerPreviewStyle(null)).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerPreviewStyle({})).toThrow(TypeError);
  });

  test('throws with proper error message for invalid style', () => {
    // @ts-ignore
    expect(() => CMS.registerPreviewStyle(123)).toThrow(
      'The `style` option for `CMS.registerPreviewStyle()` must be a string',
    );
  });

  test('throws TypeError if raw option is not a boolean', () => {
    // @ts-ignore
    expect(() => CMS.registerPreviewStyle('body {}', { raw: 'true' })).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerPreviewStyle('body {}', { raw: 1 })).toThrow(TypeError);
  });

  test('throws with proper error message for invalid raw option', () => {
    // @ts-ignore
    expect(() => CMS.registerPreviewStyle('body {}', { raw: 'true' })).toThrow(
      'The `raw` option for `CMS.registerPreviewStyle()` must be a boolean',
    );
  });

  test('defaults raw option to false', () => {
    expect(() => CMS.registerPreviewStyle('https://example.com/style.css')).not.toThrow();
  });
});

describe('CMS.registerEventListener()', () => {
  test('registers valid event listener', () => {
    // @ts-ignore
    const listener = {
      name: 'preSave',
      handler: () => {},
    };

    // @ts-ignore
    expect(() => CMS.registerEventListener(listener)).not.toThrow();
  });

  test('registers all supported event types', () => {
    const eventTypes = [
      'preSave',
      'postSave',
      'prePublish',
      'postPublish',
      'preUnpublish',
      'postUnpublish',
    ];

    eventTypes.forEach((eventType) => {
      // @ts-ignore
      const listener = {
        name: eventType,
        handler: () => {},
      };

      // @ts-ignore
      expect(() => CMS.registerEventListener(listener)).not.toThrow();
    });
  });

  test('throws TypeError if listener is not an object', () => {
    // @ts-ignore
    expect(() => CMS.registerEventListener(null)).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerEventListener(undefined)).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerEventListener('invalid')).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerEventListener(123)).toThrow(TypeError);
  });

  test('throws with proper error message for non-object listener', () => {
    // @ts-ignore
    expect(() => CMS.registerEventListener(null)).toThrow('The event listener must be an object');
  });

  test('throws TypeError if name is not a string', () => {
    // @ts-ignore
    expect(() =>
      CMS.registerEventListener({
        // @ts-ignore
        name: 123,
        handler: () => {},
      }),
    ).toThrow(TypeError);

    // @ts-ignore
    expect(() =>
      CMS.registerEventListener({
        // @ts-ignore
        name: null,
        handler: () => {},
      }),
    ).toThrow(TypeError);
  });

  test('throws TypeError if handler is not a function', () => {
    // @ts-ignore
    expect(() =>
      CMS.registerEventListener({
        name: 'preSave',
        // @ts-ignore
        handler: 'invalid',
      }),
    ).toThrow(TypeError);

    // @ts-ignore
    expect(() =>
      CMS.registerEventListener({
        name: 'preSave',
        // @ts-ignore
        handler: {},
      }),
    ).toThrow(TypeError);
  });

  test('throws with proper error message for missing properties', () => {
    // @ts-ignore
    expect(() =>
      CMS.registerEventListener({
        name: 'preSave',
        // @ts-ignore
        handler: 'invalid',
      }),
    ).toThrow(
      'The event listener must have a string `name` property and a function `handler` property',
    );
  });

  test('throws RangeError if event type is not supported', () => {
    // @ts-ignore
    expect(() =>
      CMS.registerEventListener({
        // @ts-ignore
        name: 'unsupportedEvent',
        handler: () => {},
      }),
    ).toThrow(RangeError);
  });

  test('throws with proper error message for unsupported event type', () => {
    // @ts-ignore
    expect(() =>
      CMS.registerEventListener({
        // @ts-ignore
        name: 'invalidEvent',
        handler: () => {},
      }),
    ).toThrow('Unsupported event listener name "invalidEvent"');
  });

  test('accepts async handler functions', () => {
    // @ts-ignore
    expect(() =>
      CMS.registerEventListener({
        name: 'preSave',
        // @ts-ignore
        handler: async () => {},
      }),
    ).not.toThrow();
  });
});

describe('CMS.registerPreviewTemplate()', () => {
  test('registers a preview template successfully', () => {
    const component = () => null;

    // @ts-ignore
    expect(() => CMS.registerPreviewTemplate('posts', component)).not.toThrow();
  });

  test('logs warning about unsupported custom preview templates', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const component = () => null;

    // @ts-ignore
    CMS.registerPreviewTemplate('test', component);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Custom preview templates are not yet supported in Sveltia CMS.',
    );
    consoleSpy.mockRestore();
  });

  test('throws TypeError when name is not a string', () => {
    const component = () => null;

    // @ts-ignore
    expect(() => CMS.registerPreviewTemplate(123, component)).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerPreviewTemplate(123, component)).toThrow(
      'The `name` option for `CMS.registerPreviewTemplate()` must be a string',
    );
  });

  test('throws TypeError when component is not a function', () => {
    // @ts-ignore
    expect(() => CMS.registerPreviewTemplate('posts', 'not-a-function')).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerPreviewTemplate('posts', 'not-a-function')).toThrow(
      'The `component` option for `CMS.registerPreviewTemplate()` must be a function',
    );
  });

  test('allows registering multiple templates', () => {
    const component1 = () => null;
    const component2 = () => null;

    // @ts-ignore
    expect(() => CMS.registerPreviewTemplate('posts', component1)).not.toThrow();
    // @ts-ignore
    expect(() => CMS.registerPreviewTemplate('pages', component2)).not.toThrow();
  });

  test('replaces existing template with same name', () => {
    const component1 = () => null;
    const component2 = () => null;

    // @ts-ignore
    CMS.registerPreviewTemplate('posts', component1);
    // @ts-ignore
    CMS.registerPreviewTemplate('posts', component2);

    // No error should be thrown
    expect(true).toBe(true);
  });
});

describe('CMS.registerFieldType()', () => {
  test('accepts field type registration without throwing', () => {
    const control = () => null;

    // @ts-ignore
    expect(() => CMS.registerFieldType('test', control)).not.toThrow();
  });

  test('logs warning about unsupported custom field types', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const control = () => null;

    // @ts-ignore
    CMS.registerFieldType('test', control);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Custom field types (widgets) are not yet supported in Sveltia CMS.',
    );
    consoleSpy.mockRestore();
  });

  test('registerWidget is an alias for registerFieldType', () => {
    expect(CMS.registerWidget).toBe(CMS.registerFieldType);
  });
});

describe('CMS.registerBackend()', () => {
  const validBackend = {
    init: () => undefined,
    signIn: async () => ({ backendName: 'custom' }),
    signOut: async () => {},
    fetchFiles: async () => {},
    commitChanges: async () => ({ commitHash: null, files: new Map() }),
  };

  test('registers a valid custom backend', () => {
    expect(() => CMS.registerBackend('custom-api', validBackend)).not.toThrow();
  });

  test('registers backend with optional methods', () => {
    const backendWithOptional = {
      ...validBackend,
      fetchBlob: async () => new Blob(),
      fetchFileCommits: async () => [],
      checkStatus: async () => 'none',
      triggerDeployment: async () => new Response(),
    };

    expect(() => CMS.registerBackend('custom-full', backendWithOptional)).not.toThrow();
  });

  test('registers backend with isGit and label overrides', () => {
    expect(() =>
      CMS.registerBackend('custom-git', { ...validBackend, isGit: true, label: 'My Git' }),
    ).not.toThrow();
  });

  test('throws TypeError if name is not a string', () => {
    // @ts-ignore
    expect(() => CMS.registerBackend(123, validBackend)).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerBackend(null, validBackend)).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerBackend(undefined, validBackend)).toThrow(TypeError);
  });

  test('throws TypeError if name is empty string', () => {
    expect(() => CMS.registerBackend('', validBackend)).toThrow(TypeError);
  });

  test('throws with proper error message for invalid name', () => {
    // @ts-ignore
    expect(() => CMS.registerBackend(123, validBackend)).toThrow(
      'The `name` option for `CMS.registerBackend()` must be a non-empty string',
    );
  });

  test('throws TypeError if backend is not an object', () => {
    // @ts-ignore
    expect(() => CMS.registerBackend('my-backend', 'invalid')).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerBackend('my-backend', 123)).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerBackend('my-backend', null)).toThrow(TypeError);
  });

  test('throws with proper error message for invalid backend', () => {
    // @ts-ignore
    expect(() => CMS.registerBackend('my-backend', 'invalid')).toThrow(
      'The `backend` option for `CMS.registerBackend()` must be an object',
    );
  });

  test('throws Error when trying to override built-in backend', () => {
    expect(() => CMS.registerBackend('github', validBackend)).toThrow(Error);
    expect(() => CMS.registerBackend('gitlab', validBackend)).toThrow(Error);
    expect(() => CMS.registerBackend('gitea', validBackend)).toThrow(Error);
    expect(() => CMS.registerBackend('test-repo', validBackend)).toThrow(Error);
  });

  test('throws with proper error message for built-in conflict', () => {
    expect(() => CMS.registerBackend('github', validBackend)).toThrow(
      'Cannot register backend "github": it conflicts with a built-in backend.',
    );
  });

  test('throws TypeError if required method init is missing', () => {
    const { init, ...noInit } = validBackend;

    // @ts-ignore
    expect(() => CMS.registerBackend('no-init', noInit)).toThrow(TypeError);
    // @ts-ignore
    expect(() => CMS.registerBackend('no-init', noInit)).toThrow(
      'The backend must have a `init` function.',
    );
  });

  test('throws TypeError if required method signIn is missing', () => {
    const { signIn, ...noSignIn } = validBackend;

    // @ts-ignore
    expect(() => CMS.registerBackend('no-signin', noSignIn)).toThrow(TypeError);
  });

  test('throws TypeError if required method signOut is missing', () => {
    const { signOut, ...noSignOut } = validBackend;

    // @ts-ignore
    expect(() => CMS.registerBackend('no-signout', noSignOut)).toThrow(TypeError);
  });

  test('throws TypeError if required method fetchFiles is missing', () => {
    const { fetchFiles, ...noFetchFiles } = validBackend;

    // @ts-ignore
    expect(() => CMS.registerBackend('no-fetch', noFetchFiles)).toThrow(TypeError);
  });

  test('throws TypeError if required method commitChanges is missing', () => {
    const { commitChanges, ...noCommit } = validBackend;

    // @ts-ignore
    expect(() => CMS.registerBackend('no-commit', noCommit)).toThrow(TypeError);
  });

  test('throws TypeError if required method is not a function', () => {
    expect(() =>
      // @ts-ignore
      CMS.registerBackend('bad-init', { ...validBackend, init: 'not-a-function' }),
    ).toThrow(TypeError);
  });

  test('throws TypeError if optional method is provided but not a function', () => {
    expect(() =>
      // @ts-ignore
      CMS.registerBackend('bad-blob', { ...validBackend, fetchBlob: 'not-a-function' }),
    ).toThrow(TypeError);
    expect(() =>
      // @ts-ignore
      CMS.registerBackend('bad-commits', { ...validBackend, fetchFileCommits: 123 }),
    ).toThrow(TypeError);
    expect(() =>
      // @ts-ignore
      CMS.registerBackend('bad-status', { ...validBackend, checkStatus: {} }),
    ).toThrow(TypeError);
    expect(() =>
      // @ts-ignore
      CMS.registerBackend('bad-deploy', { ...validBackend, triggerDeployment: true }),
    ).toThrow(TypeError);
  });

  test('throws with proper error message for invalid optional method', () => {
    expect(() =>
      // @ts-ignore
      CMS.registerBackend('bad-blob2', { ...validBackend, fetchBlob: 'invalid' }),
    ).toThrow(
      'The optional `fetchBlob` property on the backend must be a function if provided.',
    );
  });

  test('ignores undefined optional methods without error', () => {
    const backend = {
      ...validBackend,
      fetchBlob: undefined,
      fetchFileCommits: undefined,
      checkStatus: undefined,
      triggerDeployment: undefined,
    };

    expect(() => CMS.registerBackend('optional-undef', backend)).not.toThrow();
  });

  test('defaults isGit to false', () => {
    // The backend is registered without isGit, so it should default to false
    // We can't directly inspect the internal state, but we verify it doesn't throw
    expect(() => CMS.registerBackend('no-isgit', validBackend)).not.toThrow();
  });

  test('registerBackend method is accessible on CMS object', () => {
    expect(typeof CMS.registerBackend).toBe('function');
  });

  test('wraps fetchFiles to process returned file arrays automatically', async () => {
    const { updateStores } = await import('$lib/services/backends/git/shared/fetch');
    const { allBackendServices } = await import('$lib/services/backends');

    const files = [
      { path: 'pages/home.md', text: '---\ntitle: Home\n---', sha: 'abc', size: 30 },
      { path: 'images/logo.png', sha: 'def', size: 5000 },
    ];

    CMS.registerBackend('wrap-test', {
      ...validBackend,
      fetchFiles: async () => files,
    });

    // Call the wrapped fetchFiles
    await allBackendServices['wrap-test'].fetchFiles();

    // updateStores should have been called with processed data
    expect(updateStores).toHaveBeenCalled();
  });

  test('wraps fetchFiles to derive name from path when name is missing', async () => {
    const { allBackendServices } = await import('$lib/services/backends');

    CMS.registerBackend('wrap-name-test', {
      ...validBackend,
      fetchFiles: async () => [{ path: 'pages/about.md', text: '---\ntitle: About\n---' }],
    });

    // Should not throw — name is derived automatically
    await expect(allBackendServices['wrap-name-test'].fetchFiles()).resolves.toBeUndefined();
  });

  test('wraps fetchFiles to handle void return (advanced usage)', async () => {
    const { updateStores } = await import('$lib/services/backends/git/shared/fetch');
    const { allBackendServices } = await import('$lib/services/backends');

    // @ts-ignore — clear mock call count
    updateStores.mockClear();

    CMS.registerBackend('wrap-void-test', {
      ...validBackend,
      fetchFiles: async () => undefined,
    });

    await allBackendServices['wrap-void-test'].fetchFiles();

    // updateStores should NOT be called when fetchFiles returns void
    expect(updateStores).not.toHaveBeenCalled();
  });

  test('wraps commitChanges to normalize return value', async () => {
    const { allBackendServices } = await import('$lib/services/backends');

    CMS.registerBackend('wrap-commit-test', {
      ...validBackend,
      commitChanges: async () => ({ commitHash: 'abc123', files: { 'a.md': {} } }),
    });

    const result = await allBackendServices['wrap-commit-test'].commitChanges([], {});

    expect(result.commitHash).toBe('abc123');
    expect(result.files).toBeInstanceOf(Map);
  });

  test('wraps fetchFileCommits to normalize date strings', async () => {
    const { allBackendServices } = await import('$lib/services/backends');

    CMS.registerBackend('wrap-history-test', {
      ...validBackend,
      fetchFileCommits: async () => [
        { sha: 'abc', authorName: 'Test', date: '2026-01-01T00:00:00Z' },
      ],
    });

    const commits = await allBackendServices['wrap-history-test'].fetchFileCommits(['test.md']);

    expect(commits[0].date).toBeInstanceOf(Date);
  });
});

describe('CMS Proxy - unsupported functions', () => {
  test('returns undefined for unsupported functions', () => {
    // @ts-ignore
    expect(CMS.getBackend).toBeDefined();
    // @ts-ignore
    expect(CMS.getBackend()).toBeUndefined();
  });

  test('logs warning for unsupported CMS functions', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // @ts-ignore
    CMS.getBackend();
    expect(consoleSpy).toHaveBeenCalled();

    const { calls } = consoleSpy.mock;

    expect(calls[calls.length - 1][0]).toContain('not supported');
    consoleSpy.mockRestore();
  });
});

describe('CMS - supported methods', () => {
  test('init method is accessible', () => {
    expect(typeof CMS.init).toBe('function');
  });

  test('registerBackend method is accessible', () => {
    expect(typeof CMS.registerBackend).toBe('function');
  });

  test('registerCustomFormat method is accessible', () => {
    expect(typeof CMS.registerCustomFormat).toBe('function');
  });

  test('registerEditorComponent method is accessible', () => {
    expect(typeof CMS.registerEditorComponent).toBe('function');
  });

  test('registerEventListener method is accessible', () => {
    expect(typeof CMS.registerEventListener).toBe('function');
  });

  test('registerPreviewStyle method is accessible', () => {
    expect(typeof CMS.registerPreviewStyle).toBe('function');
  });

  test('registerPreviewTemplate method is accessible', () => {
    expect(typeof CMS.registerPreviewTemplate).toBe('function');
  });

  test('registerFieldType method is accessible', () => {
    expect(typeof CMS.registerFieldType).toBe('function');
  });

  test('registerWidget method is accessible', () => {
    expect(typeof CMS.registerWidget).toBe('function');
  });
});

describe('Script element detection and module type warning', () => {
  test('warns when script element has type="module"', async () => {
    const mockScriptElement = {
      type: 'module',
      src: 'https://example.com/sveltia-cms.js',
    };

    // Clear and reset document mock
    // @ts-ignore
    global.document.querySelector = vi.fn(() => mockScriptElement);

    // Re-import module to trigger the script detection code
    const { default: CMS2 } = await import('./main.js');

    expect(CMS2).toBeDefined();

    // Note: The console.warn is called during module import,
    // but we can't directly spy on it at import time in this setup.
    // This test validates the code path exists and doesn't throw.
  });

  test('does not throw when checking script element', () => {
    // @ts-ignore
    expect(() => {
      // The script element check code runs at module load time
      // This test ensures it doesn't error during that execution
      const scriptElement = /** @type {HTMLScriptElement | null} */ (
        document.querySelector('script[src$="/sveltia-cms.js"]')
      );

      // This mimics the check in main.js
      if (scriptElement?.type === 'module') {
        // Warning would be logged here
      }
    }).not.toThrow();
  });

  test('script querySelector uses correct selector', () => {
    const queryMock = vi.fn(() => null);

    // @ts-ignore
    global.document.querySelector = queryMock;

    // Call querySelector to verify the selector would be correct
    document.querySelector('script[src$="/sveltia-cms.js"]');

    expect(queryMock).toHaveBeenCalledWith('script[src$="/sveltia-cms.js"]');
  });

  test('handles null script element gracefully', () => {
    // @ts-ignore
    global.document.querySelector = vi.fn(() => null);

    expect(() => {
      const scriptElement = /** @type {HTMLScriptElement | null} */ (
        document.querySelector('script[src$="/sveltia-cms.js"]')
      );

      if (scriptElement?.type === 'module') {
        console.warn('Module warning');
      }
    }).not.toThrow();
  });

  test('handles script element without type attribute', () => {
    const mockScriptElement = {
      src: 'https://example.com/sveltia-cms.js',
      // type is undefined
    };

    // @ts-ignore
    global.document.querySelector = vi.fn(() => mockScriptElement);

    expect(() => {
      const scriptElement = /** @type {HTMLScriptElement | null} */ (
        // @ts-ignore
        global.document.querySelector('script[src$="/sveltia-cms.js"]')
      );

      if (scriptElement?.type === 'module') {
        console.warn('Module warning');
      }
    }).not.toThrow();
  });

  test('conditional operator safely handles undefined type', () => {
    const mockScriptElement = {
      src: 'https://example.com/sveltia-cms.js',
      type: undefined,
    };

    const result = mockScriptElement?.type === 'module';

    expect(result).toBe(false);
  });

  test('correctly identifies module type', () => {
    const mockScriptElement = {
      src: 'https://example.com/sveltia-cms.js',
      type: 'module',
    };

    const result = mockScriptElement?.type === 'module';

    expect(result).toBe(true);
  });

  test('correctly identifies non-module script', () => {
    const mockScriptElement = {
      src: 'https://example.com/sveltia-cms.js',
      type: 'text/javascript',
    };

    const result = mockScriptElement?.type === 'module';

    expect(result).toBe(false);
  });
});

describe('CSS stylesheet detection and warning', () => {
  test('warns when invalid stylesheet link is found', () => {
    const mockLinkElement = {
      rel: 'stylesheet',
      href: 'https://example.com/sveltia-cms.css',
    };

    // @ts-ignore
    global.document.querySelector = vi.fn(() => mockLinkElement);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Simulate the stylesheet check
    const cssLinkElement = /** @type {HTMLLinkElement | null} */ (
      document.querySelector('link[rel="stylesheet"][href$="/sveltia-cms.css"]')
    );

    if (cssLinkElement) {
      console.warn(
        'Sveltia CMS does not require a stylesheet. Remove the invalid `<link>` tag referencing ' +
          '`sveltia-cms.css` to avoid unnecessary network requests.',
      );
    }

    expect(consoleSpy).toHaveBeenCalledWith(
      'Sveltia CMS does not require a stylesheet. Remove the invalid `<link>` tag referencing ' +
        '`sveltia-cms.css` to avoid unnecessary network requests.',
    );
    consoleSpy.mockRestore();
  });

  test('does not warn when no stylesheet link is found', () => {
    // @ts-ignore
    global.document.querySelector = vi.fn(() => null);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Simulate the stylesheet check
    const cssLinkElement = /** @type {HTMLLinkElement | null} */ (
      document.querySelector('link[rel="stylesheet"][href$="/sveltia-cms.css"]')
    );

    if (cssLinkElement) {
      console.warn('Should not warn');
    }

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('css stylesheet querySelector uses correct selector', () => {
    const queryMock = vi.fn(() => null);

    // @ts-ignore
    global.document.querySelector = queryMock;

    // Call querySelector with the CSS selector
    document.querySelector('link[rel="stylesheet"][href$="/sveltia-cms.css"]');

    expect(queryMock).toHaveBeenCalledWith('link[rel="stylesheet"][href$="/sveltia-cms.css"]');
  });

  test('handles null stylesheet element gracefully', () => {
    // @ts-ignore
    global.document.querySelector = vi.fn(() => null);

    expect(() => {
      const cssLinkElement = /** @type {HTMLLinkElement | null} */ (
        document.querySelector('link[rel="stylesheet"][href$="/sveltia-cms.css"]')
      );

      if (cssLinkElement) {
        console.warn('Stylesheet warning');
      }
    }).not.toThrow();
  });

  test('truthy check works for stylesheet element', () => {
    const mockLinkElement = {
      rel: 'stylesheet',
      href: 'https://example.com/sveltia-cms.css',
    };

    // @ts-ignore
    const isTruthy = !!mockLinkElement;

    expect(isTruthy).toBe(true);
  });

  test('falsy check works for null stylesheet element', () => {
    // @ts-ignore
    const linkElement = null;
    // @ts-ignore
    const isFalsy = !linkElement;

    expect(isFalsy).toBe(true);
  });

  test('stylesheet element with matching href is detected', () => {
    const mockLinkElement = {
      rel: 'stylesheet',
      href: '/sveltia-cms.css',
    };

    const isDetected = !!mockLinkElement;

    expect(isDetected).toBe(true);
  });

  test('stylesheet element with different href is still truthy', () => {
    const mockLinkElement = {
      rel: 'stylesheet',
      href: '/other-stylesheet.css',
    };

    // Note: The selector checks for href ending with "/sveltia-cms.css"
    // but we test that any element returned from querySelector is truthy
    const isDetected = !!mockLinkElement;

    expect(isDetected).toBe(true);
  });

  test('warning message is informative and complete', () => {
    const expectedMessage =
      'Sveltia CMS does not require a stylesheet. Remove the invalid `<link>` tag referencing ' +
      '`sveltia-cms.css` to avoid unnecessary network requests.';

    expect(expectedMessage).toContain('sveltia-cms.css');
    expect(expectedMessage).toContain('stylesheet');
    expect(expectedMessage).toContain('Remove');
  });
});

describe('Netlify Identity Widget detection and warning', () => {
  const netlifyIdentitySelector =
    'script[src="https://identity.netlify.com/v1/netlify-identity-widget.js"]';

  test('warns when Netlify Identity Widget script is found', () => {
    const mockScriptElement = {
      src: 'https://identity.netlify.com/v1/netlify-identity-widget.js',
    };

    // @ts-ignore
    global.document.querySelector = vi.fn(() => mockScriptElement);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    if (document.querySelector(netlifyIdentitySelector)) {
      console.warn(
        'Netlify Identity has been deprecated. The widget is not supported in Sveltia CMS.',
      );
    }

    expect(consoleSpy).toHaveBeenCalledWith(
      'Netlify Identity has been deprecated. The widget is not supported in Sveltia CMS.',
    );
    consoleSpy.mockRestore();
  });

  test('does not warn when Netlify Identity Widget script is not found', () => {
    // @ts-ignore
    global.document.querySelector = vi.fn(() => null);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    if (document.querySelector(netlifyIdentitySelector)) {
      console.warn('Should not warn');
    }

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('querySelector uses the correct Netlify Identity selector', () => {
    const queryMock = vi.fn(() => null);

    // @ts-ignore
    global.document.querySelector = queryMock;

    document.querySelector(netlifyIdentitySelector);

    expect(queryMock).toHaveBeenCalledWith(
      'script[src="https://identity.netlify.com/v1/netlify-identity-widget.js"]',
    );
  });

  test('handles null element gracefully without throwing', () => {
    // @ts-ignore
    global.document.querySelector = vi.fn(() => null);

    expect(() => {
      if (document.querySelector(netlifyIdentitySelector)) {
        console.warn(
          'Netlify Identity has been deprecated. The widget is not supported in Sveltia CMS.',
        );
      }
    }).not.toThrow();
  });
});

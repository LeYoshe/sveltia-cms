/* eslint-disable no-console */

import { isObject } from '@sveltia/utils/object';
import createClass from 'create-react-class';
import { createElement } from 'react';
import { mount } from 'svelte';

import { allBackendServices, validBackendNames } from '$lib/services/backends';
import { getAssetKind } from '$lib/services/assets/kinds';
import { createFileList } from '$lib/services/backends/process';
import { updateStores } from '$lib/services/backends/git/shared/fetch';
import { eventHookRegistry, SUPPORTED_EVENT_TYPES } from '$lib/services/contents/draft/events';
import { prepareEntries } from '$lib/services/contents/file/process';
import {
  customPreviewStyleRegistry,
  customPreviewTemplateRegistry,
} from '$lib/services/contents/editor';
import { customComponentRegistry } from '$lib/services/contents/fields/rich-text/components/definitions';
import { customFileFormatRegistry } from '$lib/services/contents/file/config';

import App from './components/app.svelte';

/**
 * @import { ComponentType } from 'react';
 * @import {
 * AppEventListener,
 * CmsConfig,
 * CustomFieldControlProps,
 * CustomFieldPreviewProps,
 * CustomFieldSchema,
 * CustomPreviewTemplateProps,
 * EditorComponentDefinition,
 * FileFormatter,
 * FileParser,
 * } from './types/public';
 * // Don’t use `$lib` in `from` above, or type declarations will not be exported
 */

/**
 * List of API functions in Netlify/Decap CMS that we don’t plan to support in Sveltia CMS, either
 * because they are undocumented or because they are incompatible with Sveltia CMS’s architecture
 * and design principles.
 */
const UNSUPPORTED_FUNC_NAMES = [
  // Undocumented
  'getBackend',
  'getCustomFormats',
  'getCustomFormatsExtensions',
  'getCustomFormatsFormatters',
  'getEditorComponents',
  'getEventListeners',
  'getLocale',
  'getMediaLibrary',
  'getPreviewStyles',
  'getPreviewTemplate',
  'getRemarkPlugins',
  'getWidget',
  'getWidgetValueSerializer',
  'getWidgets',
  'invokeEvent',
  'moment', // Removed in Decap CMS 3.1.1 as it switched from Moment.js to Day.js
  'registerMediaLibrary',
  'registerWidgetValueSerializer',
  'removeEventListener',
  'resolveWidget',
  // Documented but not planned for implementation
  'registerLocale', // https://decapcms.org/docs/configuration-options/#locale
  'registerRemarkPlugin', // https://decapcms.org/docs/widgets/#Markdown
];

/**
 * URL for documentation on unsupported features and compatibility between Netlify/Decap CMS and
 * Sveltia CMS. When users call an unsupported API function, they will see a warning in the console
 * with a link to this documentation.
 */
const COMPATIBILITY_URL =
  'https://sveltiacms.app/en/docs/migration/netlify-decap-cms#features-not-to-be-implemented';

let initialized = false;

/**
 * Initialize the CMS, optionally with the given CMS configuration.
 * @param {object} [options] Options.
 * @param {CmsConfig} [options.config] Configuration to be merged with `config.yml`. Include
 * `load_config_file: false` to prevent the configuration file from being loaded.
 * @throws {TypeError} If `config` is not an object or undefined.
 * @see https://decapcms.org/docs/manual-initialization/
 * @see https://sveltiacms.app/en/docs/api/initialization
 */
const init = async ({ config } = {}) => {
  if (config !== undefined && !isObject(config)) {
    throw new TypeError('The `config` option for `CMS.init()` must be an object');
  }

  if (initialized) {
    return;
  }

  initialized = true;

  if (document.readyState === 'loading' && !document.querySelector('#nc-root')) {
    // A custom mount element (`<div id="nc-root">`) could appear after the CMS `<script>`, so just
    // wait until the page content is loaded.
    // @see https://decapcms.org/docs/custom-mounting/
    // @see https://sveltiacms.app/en/docs/customization#custom-mount-element
    await new Promise((resolve) => {
      window.addEventListener('DOMContentLoaded', () => resolve(undefined), { once: true });
    });
  }

  mount(App, {
    target: document.querySelector('#nc-root') ?? document.body,
    props: { config },
  });
};

/**
 * Register a custom entry file format.
 * @param {string} name Format name. This should match the `format` option of a collection where the
 * custom format will be used..
 * @param {string} extension File extension.
 * @param {{ fromFile?: FileParser, toFile?: FileFormatter }} methods Parser and/or formatter
 * methods. Async functions can be used.
 * @throws {TypeError} If `name` or `extension` is not a string, or if `methods` is not an object.
 * @throws {Error} If at least one of `fromFile` or `toFile` is not provided.
 * @see https://decapcms.org/docs/custom-formatters/
 * @see https://sveltiacms.app/en/docs/api/file-formats
 */
const registerCustomFormat = (name, extension, { fromFile, toFile } = {}) => {
  if (typeof name !== 'string') {
    throw new TypeError('The `name` option for `CMS.registerCustomFormat()` must be a string');
  }

  if (typeof extension !== 'string') {
    throw new TypeError('The `extension` option for `CMS.registerCustomFormat()` must be a string');
  }

  if (typeof fromFile !== 'function' && typeof toFile !== 'function') {
    throw new Error(
      'At least one of `fromFile` or `toFile` must be provided to `CMS.registerCustomFormat()`',
    );
  }

  if (typeof fromFile !== 'undefined' && typeof fromFile !== 'function') {
    throw new TypeError(
      'The `fromFile` option for `CMS.registerCustomFormat()` must be a function',
    );
  }

  if (typeof toFile !== 'undefined' && typeof toFile !== 'function') {
    throw new TypeError('The `toFile` option for `CMS.registerCustomFormat()` must be a function');
  }

  customFileFormatRegistry.set(name, { extension, parser: fromFile, formatter: toFile });
};

/**
 * Register a custom component.
 * @param {EditorComponentDefinition} definition Component definition.
 * @throws {TypeError} If `definition` is not an object, or if required properties are invalid.
 * @see https://decapcms.org/docs/custom-widgets/#registereditorcomponent
 * @see https://sveltiacms.app/en/docs/api/editor-components
 */
const registerEditorComponent = (definition) => {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError(
      'The `definition` option for `CMS.registerEditorComponent()` must be an object',
    );
  }

  if (typeof definition.id !== 'string') {
    throw new TypeError('The `definition.id` must be a string');
  }

  if (typeof definition.label !== 'string') {
    throw new TypeError('The `definition.label` must be a string');
  }

  if (typeof definition.pattern !== 'object' || !(definition.pattern instanceof RegExp)) {
    throw new TypeError('The `definition.pattern` must be a RegExp');
  }

  if (typeof definition.toBlock !== 'function') {
    throw new TypeError('The `definition.toBlock` must be a function');
  }

  if (typeof definition.toPreview !== 'function') {
    throw new TypeError('The `definition.toPreview` must be a function');
  }

  if (!Array.isArray(definition.fields)) {
    throw new TypeError('The `definition.fields` must be an array');
  }

  customComponentRegistry.set(definition.id, definition);
};

/**
 * Register an event listener.
 * @param {AppEventListener} eventListener Event listener.
 * @throws {TypeError} If the event listener is not an object, or is missing required properties.
 * @throws {RangeError} If the event listener name is not supported.
 * @see https://decapcms.org/docs/registering-events/
 * @see https://sveltiacms.app/en/docs/api/events
 */
const registerEventListener = (eventListener) => {
  if (!isObject(eventListener)) {
    throw new TypeError('The event listener must be an object');
  }

  const { name, handler } = eventListener;

  if (typeof name !== 'string' || typeof handler !== 'function') {
    throw new TypeError(
      'The event listener must have a string `name` property and a function `handler` property',
    );
  }

  if (!SUPPORTED_EVENT_TYPES.includes(name)) {
    throw new RangeError(
      `Unsupported event listener name "${name}". ` +
        `Supported names are: ${SUPPORTED_EVENT_TYPES.join(', ')}`,
    );
  }

  eventHookRegistry.add(eventListener);
};

/**
 * Register a custom preview stylesheet.
 * @param {string} style URL, file path or raw CSS string.
 * @param {object} [options] Options.
 * @param {boolean} [options.raw] Whether to use a CSS string.
 * @throws {TypeError} If `style` is not a string, or `raw` is not a boolean.
 * @see https://decapcms.org/docs/customization/#registerpreviewstyle
 * @see https://sveltiacms.app/en/docs/api/preview-styles
 */
const registerPreviewStyle = (style, { raw = false } = {}) => {
  if (typeof style !== 'string') {
    throw new TypeError('The `style` option for `CMS.registerPreviewStyle()` must be a string');
  }

  if (typeof raw !== 'boolean') {
    throw new TypeError('The `raw` option for `CMS.registerPreviewStyle()` must be a boolean');
  }

  const url = raw ? URL.createObjectURL(new Blob([style], { type: 'text/css' })) : style;

  customPreviewStyleRegistry.add(url);
};

/**
 * Register a custom preview template.
 * @param {string} name Template name.
 * @param {ComponentType<CustomPreviewTemplateProps>} component React component.
 * @throws {TypeError} If `name` is not a string or `component` is not a function.
 * @see https://decapcms.org/docs/customization/#registerpreviewtemplate
 * @see https://sveltiacms.app/en/docs/api/preview-templates
 */
const registerPreviewTemplate = (name, component) => {
  console.warn('Custom preview templates are not yet supported in Sveltia CMS.');

  if (typeof name !== 'string') {
    throw new TypeError('The `name` option for `CMS.registerPreviewTemplate()` must be a string');
  }

  if (typeof component !== 'function') {
    throw new TypeError(
      'The `component` option for `CMS.registerPreviewTemplate()` must be a function',
    );
  }

  customPreviewTemplateRegistry.set(name, component);
};

/**
 * Register a custom field type (widget).
 * @param {string} name Field type name.
 * @param {ComponentType<CustomFieldControlProps> | string} control Component for the edit pane.
 * @param {ComponentType<CustomFieldPreviewProps>} [preview] Component for the preview pane.
 * @param {CustomFieldSchema} [schema] Field schema.
 * @see https://decapcms.org/docs/custom-widgets/
 * @see https://sveltiacms.app/en/docs/api/field-types
 */
const registerFieldType = (name, control, preview, schema) => {
  console.warn('Custom field types (widgets) are not yet supported in Sveltia CMS.');
  void [name, control, preview, schema];
};

/**
 * Register a custom backend service. This allows integrating Sveltia CMS with any content storage
 * provider (databases, custom APIs, cloud storage, etc.) without being limited to built-in Git
 * backends.
 *
 * The `fetchFiles` method should return an array of file objects. Sveltia CMS will automatically
 * process them (categorize entries and assets, parse content) and populate the internal stores.
 * This means custom backends do not need access to any internal Sveltia CMS modules.
 *
 * Each file object should have: `{ path, name, sha, size, text? }` where `text` is the file
 * content as a string (required for entry files like Markdown/YAML/JSON, optional for assets).
 *
 * @param {string} name Backend name. This should match the `backend.name` option in the CMS
 * configuration. Must not conflict with built-in backend names.
 * @param {object} backend Backend service implementation.
 * @param {boolean} [backend.isGit] Whether the backend is a Git service. Default: `false`.
 * @param {string} [backend.label] Human-readable label for the backend. Default: same as `name`.
 * @param {() => any} backend.init Function to initialize the backend. Called when the backend is
 * selected based on the configuration.
 * @param {(options?: any) => Promise<any>} backend.signIn Function to sign in. Return a user
 * object (e.g., `{ backendName: 'my-backend' }`) on success.
 * @param {() => Promise<void>} backend.signOut Function to sign out.
 * @param {() => Promise<Array<{ path: string, name: string, sha?: string, size?: number,
 * text?: string }>>} backend.fetchFiles Function to fetch all files from the backend. Return an
 * array of file objects. Entry files (Markdown, YAML, JSON) should include `text` content. Asset
 * files (images, etc.) may omit `text`. Sveltia CMS handles all categorization and parsing.
 * @param {(changes: Array<{ action: string, path: string, data?: string | Blob, base64?: string }>,
 * options?: any) => Promise<{ commitHash?: string | null,
 * files?: Map<string, object> | object }>} backend.commitChanges Function to save file changes
 * (additions, updates, deletions). Return commit results with optional hash and file map.
 * @param {(asset: { path: string }) => Promise<Blob>} [backend.fetchBlob] Function to fetch an
 * asset as a Blob. Required if the backend serves binary files.
 * @param {(paths: string[]) => Promise<Array<{ sha: string, authorName: string,
 * authorEmail?: string, date: Date | string }>>} [backend.fetchFileCommits] Function to fetch
 * commit history for the given file paths. Enables the revision history feature.
 * @param {() => Promise<string>} [backend.checkStatus] Function to check the backend's
 * operational status. Return `'none'`, `'minor'`, `'major'`, or `'unknown'`.
 * @param {() => Promise<any>} [backend.triggerDeployment] Function to manually trigger a new
 * deployment on the hosting provider.
 * @throws {TypeError} If `name` is not a string or `backend` is not an object.
 * @throws {TypeError} If any required method is missing or not a function.
 * @throws {Error} If `name` conflicts with a built-in backend.
 */
const registerBackend = (name, backend) => {
  if (typeof name !== 'string' || !name) {
    throw new TypeError('The `name` option for `CMS.registerBackend()` must be a non-empty string');
  }

  if (!isObject(backend)) {
    throw new TypeError('The `backend` option for `CMS.registerBackend()` must be an object');
  }

  // Prevent overriding built-in backends
  if (validBackendNames.includes(/** @type {any} */ (name))) {
    throw new Error(
      `Cannot register backend "${name}": it conflicts with a built-in backend. ` +
        'Choose a different name.',
    );
  }

  // Validate required methods
  const requiredMethods = ['init', 'signIn', 'signOut', 'fetchFiles', 'commitChanges'];

  for (const method of requiredMethods) {
    if (typeof backend[method] !== 'function') {
      throw new TypeError(
        `The backend must have a \`${method}\` function. ` +
          'See the BackendService interface for required methods.',
      );
    }
  }

  // Validate optional methods if provided
  const optionalMethods = [
    'fetchBlob',
    'fetchFileCommits',
    'checkStatus',
    'triggerDeployment',
  ];

  for (const method of optionalMethods) {
    if (backend[method] !== undefined && typeof backend[method] !== 'function') {
      throw new TypeError(
        `The optional \`${method}\` property on the backend must be a function if provided.`,
      );
    }
  }

  // Wrap fetchFiles: the external backend returns raw file data,
  // and we handle the internal store population automatically.
  const originalFetchFiles = backend.fetchFiles;

  const wrappedFetchFiles = async () => {
    const files = await originalFetchFiles();

    // If the backend returned void/undefined, it handled stores itself (advanced usage)
    if (!Array.isArray(files)) {
      return;
    }

    // Normalize file objects: ensure `name` is derived from `path` if missing
    const normalizedFiles = files.map((file) => ({
      ...file,
      name: file.name || file.path.split('/').pop() || '',
      sha: file.sha || '',
      size: file.size || 0,
    }));

    const fileList = createFileList(normalizedFiles);
    const { entryFiles, assetFiles } = fileList;

    const { entries, errors } = await prepareEntries(entryFiles);

    const assets = assetFiles.map((fileInfo) => {
      const { name: fileName, ...rest } = fileInfo;

      return { ...rest, name: fileName, kind: getAssetKind(fileName) };
    });

    updateStores({ entries, assets, configFiles: [], errors });
  };

  // Wrap fetchFileCommits: normalize date strings to Date objects
  let wrappedFetchFileCommits;

  if (backend.fetchFileCommits) {
    const originalFetchFileCommits = backend.fetchFileCommits;

    wrappedFetchFileCommits = async (paths) => {
      const commits = await originalFetchFileCommits(paths);

      return (commits ?? []).map((commit) => ({
        ...commit,
        date: commit.date instanceof Date ? commit.date : new Date(commit.date),
      }));
    };
  }

  // Wrap commitChanges: normalize the return value
  const originalCommitChanges = backend.commitChanges;

  const wrappedCommitChanges = async (changes, options) => {
    const result = await originalCommitChanges(changes, options);

    return {
      commitHash: result?.commitHash ?? null,
      files: result?.files instanceof Map ? result.files : new Map(Object.entries(result?.files ?? {})),
    };
  };

  /** @type {import('$lib/types/private').BackendService} */
  const service = {
    isGit: false,
    label: name,
    ...backend,
    name,
    fetchFiles: wrappedFetchFiles,
    commitChanges: wrappedCommitChanges,
    ...(wrappedFetchFileCommits ? { fetchFileCommits: wrappedFetchFileCommits } : {}),
  };

  allBackendServices[name] = service;
  validBackendNames.push(/** @type {any} */ (name));
};

const CMS = new Proxy(
  {
    init,
    registerBackend,
    registerCustomFormat,
    registerEditorComponent,
    registerEventListener,
    registerFieldType,
    registerPreviewStyle,
    registerPreviewTemplate,
    registerWidget: registerFieldType, // alias for backward compatibility with Netlify/Decap CMS
  },
  {
    // eslint-disable-next-line jsdoc/require-jsdoc
    get: (obj, /** @type {string} */ key) => {
      if (key in obj) {
        // @ts-ignore
        return obj[key];
      }

      let message = '';

      if (UNSUPPORTED_FUNC_NAMES.includes(key)) {
        message =
          'CMS.%s() is not supported in Sveltia CMS, and we don’t have any plans to implement it.';
      }

      if (message) {
        console.warn(`${message} See %s for compatibility information.`, key, COMPATIBILITY_URL);

        // eslint-disable-next-line jsdoc/require-description
        /** @returns {void} */
        return () => undefined;
      }

      return undefined;
    },
  },
);

export default CMS;
export { init };

window.CMS = CMS;
window.initCMS = init;

// Expose React APIs for custom field types, custom preview templates and custom editor components
// @see https://decapcms.org/docs/custom-widgets/
// @see https://decapcms.org/docs/customization/
// @see https://sveltiacms.app/en/docs/api/field-types
// @see https://sveltiacms.app/en/docs/api/preview-templates
window.createClass = createClass;
window.createElement = createElement;
window.h = createElement;

const cssLinkElement = document.querySelector('link[rel="stylesheet"][href$="/sveltia-cms.css"]');

// Warn if an invalid stylesheet is included. Claude tends to add it when setting up Sveltia CMS.
if (cssLinkElement) {
  console.warn(
    'Sveltia CMS does not require a stylesheet. Remove the invalid `<link>` tag referencing ' +
      '`sveltia-cms.css` to avoid unnecessary network requests.',
  );
}

const scriptElement = /** @type {HTMLScriptElement | null} */ (
  document.querySelector('script[src$="/sveltia-cms.js"]')
);

// Warn if the CMS script comes with `type="module"`. Earlier versions of Sveltia CMS were built and
// shipped as ES modules. Therefore, some users may have added the attribute to the script tag.
// Additionally, Claude tends to add it due to outdated/inaccurate knowledge. We recommend removing
// the attribute from the CMS script tag to avoid unexpected behavior.
if (scriptElement?.type === 'module') {
  console.warn(
    'The Sveltia CMS script is not an ES module. Remove the "type="module" attribute from the ' +
      '`<script>` tag to avoid unexpected behavior when using the JavaScript API.',
  );
}

const netlifyIdentityScriptElement =
  'script[src="https://identity.netlify.com/v1/netlify-identity-widget.js"]';

// Warn if Netlify Identity Widget is included, as it’s not compatible with Sveltia CMS and has been
// officially deprecated by Netlify.
if (document.querySelector(netlifyIdentityScriptElement)) {
  console.warn('Netlify Identity has been deprecated. The widget is not supported in Sveltia CMS.');
}

// Automatically initialize the CMS if manual initialization is not requested AND the script is NOT
// a module; We can’t just use `document.currentScript` for module detection because the earlier
// versions of Sveltia CMS were built and shipped as modules
if (!window.CMS_MANUAL_INIT && (document.currentScript || scriptElement || import.meta.env.DEV)) {
  init();
}

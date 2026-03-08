# OS Architecture

## Overview

`@context-ai/os` is organized around three injector scopes:

1. `osInjector`
2. `appInjector`
3. `pageInjector`

The current assembly flow is:

1. `createDefaultLLMOS()`
2. `createOSInjector()`
3. `createOSRootRuntime()`
4. `createOSBaseProviders()`
5. `runtime.bootstrap(appRuntimeRegistry)`

Primary entry files:

- `src/llm-os.ts`
- `src/di/create-os-injector.ts`
- `src/di/root-runtime.ts`
- `src/di/providers.ts`

## Injector Scopes

### OS Scope

The OS scope owns root runtime state and long-lived services.

Key modules:

- `src/di/root-services.ts`
- `src/di/root-runtime-components.ts`
- `src/di/runtime-bindings.ts`
- `src/di/providers.ts`

Examples of OS-scope services:

- kernel
- app manager
- file/shell/net/store services
- scheduler/notification/model/package services

### App Scope

The app scope isolates manifest-derived state.

Key modules:

- `src/di/create-app-injector.ts`
- `src/di/tokens/app.ts`
- `src/di/app-runtime-registry.ts`

App scope should contain:

- current app id
- current manifest
- current permissions
- current quota snapshot

### Page Scope

The page scope isolates request-time state.

Key modules:

- `src/di/create-page-injector.ts`
- `src/di/page-providers.ts`
- `src/di/tokens/page.ts`
- `src/di/page-runtime.ts`

Page scope should contain:

- trace id
- session id
- request payload
- route/page entry
- page render context
- page-bound system runtime bridge

## Service Registration Model

Service registration is now declaration-based.

Primary files:

- `src/di/service-catalog/definition.ts`
- `src/di/service-definitions.ts`
- `src/di/service-tokens.ts`

Each domain file exports a definition list, not an object literal.

Examples:

- `src/di/service-catalog/file.ts`
- `src/di/service-catalog/app.ts`
- `src/di/service-catalog/platform.ts`
- `src/di/service-catalog/system.ts`

The top-level catalog is assembled in `src/di/service-definitions.ts`.

## How To Add A New Service

Required steps:

1. Define the service token in `src/tokens.ts`
2. Implement the service as an `@Injectable({ providedIn: null })` class in the domain service module
3. Add one `defineInjectableOSService(TOKEN, ServiceClass, [...deps])` entry in the matching `src/di/service-catalog/*.ts` file
4. Run `npm run build` and `npm run test` in `packages/os`

What not to do:

- do not register the service with a raw string literal
- do not add a new top-level object-literal catalog by hand
- do not duplicate token-to-service mappings in multiple files

## How To Add A New App/Page Dependency

App scope:

1. add the token in `src/di/tokens/app.ts`
2. wire the value in `src/di/create-app-injector.ts`

Page scope:

1. add the token in `src/di/tokens/page.ts`
2. wire the provider in `src/di/page-providers.ts`

Rule:

- app state belongs to `appInjector`
- request/render state belongs to `pageInjector`
- root services do not read page tokens directly

## Runtime Bindings

`src/di/runtime-bindings.ts` is the single declaration source for:

- public runtime fields exposed by `createDefaultLLMOS()`
- DI value bindings generated from the runtime

If a new root runtime field must be public or injectable, update this file first.

## Invariants

These constraints should remain true:

1. service tokens are defined in exactly one place
2. service catalog entries are declaration-based
3. `di/tokens.ts` is only a compatibility export surface
4. `osInjector -> appInjector -> pageInjector` remains the only scope chain
5. page code reaches system services through the injected system runtime, not through a global singleton

## Tests That Protect Structure

Relevant tests:

- `src/di/service-definitions.test.ts`
- `src/llm-os.test.ts`

These should guard:

- service definition uniqueness
- catalog completeness
- runtime lifecycle and injector teardown

## Next Cleanup Targets

1. add binding-structure tests for `runtime-bindings.ts`
2. reduce remaining size in `service-catalog/system-alerts.ts`
3. add a short contributor checklist to `README.md`

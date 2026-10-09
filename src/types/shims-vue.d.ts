// Ambient wildcard shim for single-file components.
// Must stay free of top-level imports/exports: a file with imports is a module,
// and `declare module "*.vue"` inside a module is an augmentation (ignored by tsc)
// rather than a global declaration. The component augmentations live in vue-shims.d.ts.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  // The standard Vue SFC shim signature; `{}` is intentional (props/bindings are unknown here).
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

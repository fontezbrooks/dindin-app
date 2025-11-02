---
title: "noReactForwardRef"
source: "https://biomejs.dev/linter/rules/no-react-forward-ref/"
author:
  - "[[Biome]]"
published:
created: 2025-11-01
description: "Learn more about noReactForwardRef"
tags:
  - "clippings"
---
[Skip to content](https://biomejs.dev/linter/rules/no-react-forward-ref/#_top)

- [JavaScript (and super languages)](https://biomejs.dev/linter/rules/no-react-forward-ref/#tab-panel-789)

- Rule available since: `v2.2.5`
- Diagnostic Category: [`lint/nursery/noReactForwardRef`](https://biomejs.dev/reference/diagnostics#diagnostic-category)
- This rule has an [**unsafe**](https://biomejs.dev/linter/#unsafe-fixes) fix.
- The default severity of this rule is [**warning**](https://biomejs.dev/reference/diagnostics#warning).
- This rule belongs to the following domains:
	- [`react`](https://biomejs.dev/linter/domains#react)
- Sources:
	- Same as [`react-x/no-forward-ref`](https://eslint-react.xyz/docs/rules/no-forward-ref)
	- Same as [`@eslint-react/no-forward-ref`](https://eslint-react.xyz/docs/rules/no-forward-ref)

```json
{
  "linter": {
    "rules": {
      "nursery": {
        "noReactForwardRef": "error"
      }
    }
  }
}
```

Replaces usages of `forwardRef` with passing `ref` as a prop.

In React 19, `forwardRef` is no longer necessary. Pass `ref` as a prop instead. This rule detects the usage of the `forwardRef` API, and it suggests using the prop `ref` instead. See [the official blog post](https://react.dev/blog/2024/12/05/react-19#ref-as-a-prop) for details.

This rule should be disabled if you are working with React 18 or earlier.

```jsx
import { forwardRef } from "react";

const MyInput = forwardRef(function MyInput(props, ref) {
  return <input ref={ref} {...props} />;
});
```

```
code-block.jsx:3:17 lint/nursery/noReactForwardRef  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠ Use of forwardRef is detected, which is deprecated.
  
    1 │ import { forwardRef } from “react”;
    2 │ 
  > 3 │ const MyInput = forwardRef(function MyInput(props, ref) {
      │                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 4 │   return <input ref={ref} {…props} />;
  > 5 │ });
      │ ^^
    6 │ 
  
  ℹ In React 19, ‘forwardRef’ is no longer necessary. Pass ‘ref’ as a prop instead.
  
  ℹ Replace the use of forwardRef with passing ref as a prop.
  
  ℹ Unsafe fix: Remove the forwardRef() call and receive the ref as a prop.
  
    1 1 │   import { forwardRef } from “react”;
    2 2 │   
    3   │ - const·MyInput·=·forwardRef(function·MyInput(props,·ref)·{
      3 │ + const·MyInput·=·function·MyInput({·ref,·...props·})·{
    4 4 │     return <input ref={ref} {…props} />;
    5   │ - });
      5 │ + };
    6 6 │
```

```jsx
import { forwardRef } from "react";

const MyInput = forwardRef((props, ref) => {
  return <input ref={ref} {...props} />;
});
```

```
code-block.jsx:3:17 lint/nursery/noReactForwardRef  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠ Use of forwardRef is detected, which is deprecated.
  
    1 │ import { forwardRef } from “react”;
    2 │ 
  > 3 │ const MyInput = forwardRef((props, ref) => {
      │                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 4 │   return <input ref={ref} {…props} />;
  > 5 │ });
      │ ^^
    6 │ 
  
  ℹ In React 19, ‘forwardRef’ is no longer necessary. Pass ‘ref’ as a prop instead.
  
  ℹ Replace the use of forwardRef with passing ref as a prop.
  
  ℹ Unsafe fix: Remove the forwardRef() call and receive the ref as a prop.
  
    1 1 │   import { forwardRef } from “react”;
    2 2 │   
    3   │ - const·MyInput·=·forwardRef((props,·ref)·=>·{
      3 │ + const·MyInput·=·({·ref,·...props·})·=>·{
    4 4 │     return <input ref={ref} {…props} />;
    5   │ - });
      5 │ + };
    6 6 │
```

```jsx
function MyInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

```jsx
const MyInput = ({ ref, ...props }) => {
  return <input ref={ref} {...props} />;
}
```

- [Disable a rule](https://biomejs.dev/linter/#disable-a-rule)
- [Configure the code fix](https://biomejs.dev/linter#configure-the-code-fix)
- [Rule options](https://biomejs.dev/linter/#rule-options)
- [Source Code](https://github.com/biomejs/biome/blob/main/crates/biome_js_analyze/src/lint/nursery/no_react_forward_ref.rs)
- [Test Cases](https://github.com/biomejs/biome/blob/main/crates/biome_js_analyze/tests/specs/nursery/noReactForwardRef)
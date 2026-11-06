# Generic document reader

This module is the format-neutral reading layer for diagram documents. It is deliberately independent from React, bpmn-js and target-format conversion.

## Contract

- `DocumentReaderPlugin` identifies a format, detects whether it supports an input, and reads it.
- `DocumentReaderEngine` selects the first registered compatible reader and validates that it returned at least one page.
- A `ReaderDocument` contains the detected format, ordered pages and reader warnings.
- A page exposes its name, index, media type and source content. Content can be text or an `ArrayBuffer`, so later adapters can read binary formats as well as XML.

## Adding a reader

Implement `DocumentReaderPlugin` in a dedicated adapter under `readers/`, then register it with the engine:

```ts
const engine = new DocumentReaderEngine([
  drawioReader,
  // futureVisioReader,
]);
const document = await engine.read({ fileName, content });
```

The adapter should only detect, parse and extract source pages. It must not import React components, instantiate bpmn-js or convert pages to BPMN.

## Current adapter

`DrawioReader` is the first adapter. It supports standalone `mxGraphModel` XML and `mxfile` documents with one or more `diagram` entries, including compressed diagram payloads. Each extracted page is returned as an independent `mxGraphModel` XML string.

The separate Draw.io-to-BPMN converter consumes one extracted page at a time. The application integration is responsible for converting each page, downloading each resulting BPMN file and opening the first result in the existing modeler.

## Boundaries

- No cross-page links or combined multi-process BPMN document.
- No page selector or page navigation in the modeler.
- Lanes are not part of the current conversion step.
- Future application plugin packaging/registration is intentionally separate from this generic reader contract.

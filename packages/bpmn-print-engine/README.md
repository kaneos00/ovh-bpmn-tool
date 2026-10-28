# BPMN Print Engine

Standalone package scaffold for the KHI Flows BPMN print engine.

**Current status:** contracts/skeleton only. Planning, partitioning, and rendering algorithms are not implemented yet.

See [the architecture and ticket map](../../docs/bpmn-print-engine-architecture.md).

## Design constraints

- Do not mutate the source BPMN XML.
- Keep pagination planning, BPMN partitioning, and output rendering separate.
- Keep the core independent from React, the KHI Flows viewer/modeler, and backend APIs.
- Keep host-specific BPMN canvas extraction in a thin adapter outside this package.
- SVG is the first target renderer; PNG and PDF are separate adapters.
- Every public contract change should be documented and tested.

## Development

The package has its own TypeScript configuration. It is deliberately not wired into the frontend build yet; the package integration ticket (#104) will decide how to integrate it without forcing a repository-wide workspace change.

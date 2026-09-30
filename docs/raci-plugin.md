# RACI plugin

## Status model

- explicit: assignment explicitly stored in RACI metadata.
- inferred: assignment derived from BPMN structure or interactions.
- missing: no defensible assignment can be derived.

## BPMN to RACI algorithm

1. Read explicit R/A/C/I metadata. Explicit metadata has precedence.
2. Find the BPMN lane containing each activity.
3. Assign the containing lane as R / explicit.
4. For approval, validation or authorization activities, infer A to the containing lane.
5. For MessageFlow, infer C for the sender of an incoming message and I for the receiver of an outgoing message.
6. Keep every other cell as missing.
7. Allow several codes in one cell, such as A/R.

## Metadata

The RACI namespace is registered on bpmn:BaseElement and provides responsible, accountable, consulted and informed attributes plus one status attribute for each code.

Role lists are comma-separated.

The metadata is persisted in BPMN XML through bpmn-moddle. This follows the standard extension mechanism used by bpmn-js for custom BPMN metadata. 

## Limitation

BPMN does not contain enough semantics to infer every RACI value. The engine therefore does not invent C or I when no interaction exists, and does not invent A except for recognizable approval/validation/authorization activities.

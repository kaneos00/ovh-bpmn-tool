/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

declare module '@bpmn-io/properties-panel' {
  export function TextFieldEntry(props: any): any;
  export function isTextFieldEntryEdited(
    node: any,
    values: any
  ): boolean;
}

declare module 'bpmn-js-properties-panel' {
  export function useService(type: string, strict?: boolean): any;
}

============================================================
FIN ANCIENNE VERSION
============================================================
*/

declare module '@bpmn-io/properties-panel' {
  export function TextFieldEntry(props: any): any;
  export function isTextFieldEntryEdited(
    node: any,
    values: any
  ): boolean;
  export function CheckboxEntry(props: any): any;
  export function isCheckboxEntryEdited(
    node: any,
    values: any
  ): boolean;
}

declare module 'bpmn-js-properties-panel' {
  export function useService(type: string, strict?: boolean): any;
}


declare module 'bpmn-js-color-picker' {
  const module: any;
  export default module;
}

declare module 'bpmn-js-embedded-comments' {
  const module: any;
  export default module;
}

declare module 'diagram-js-grid' {
  const module: any;
  export default module;
}

declare module 'diagram-js-minimap' {
  const module: any;
  export default module;
}

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

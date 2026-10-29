declare module "bpmn-moddle" {
  export default class BpmnModdle {
    fromXML(
      xml: string,
      type?: string,
    ): Promise<{
      rootElement: unknown;
      warnings?: Array<{ message?: string }>;
    }>;
    toXML(
      element: unknown,
      options?: { format?: boolean },
    ): Promise<{ xml: string }>;
  }
}

export type ReaderContent = string | ArrayBuffer;

export type ReaderInput = {
  fileName?: string;
  content: ReaderContent;
};

export type ReaderPage = {
  index: number;
  name: string;
  content: ReaderContent;
  mediaType: string;
};

export type ReaderDocument = {
  format: string;
  pages: ReaderPage[];
  warnings: string[];
};

/**
 * A format adapter reads a source document and exposes its pages without
 * depending on the application UI or on a target conversion format.
 */
export interface DocumentReaderPlugin {
  readonly id: string;
  supports(input: ReaderInput): boolean;
  read(input: ReaderInput): Promise<ReaderDocument>;
}

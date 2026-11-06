export type ReaderInput = {
  fileName?: string;
  content: string;
};

export type ReaderPage = {
  index: number;
  name: string;
  content: string;
  mediaType: 'application/xml';
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

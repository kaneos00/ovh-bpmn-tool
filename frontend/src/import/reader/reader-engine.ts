import type {
  DocumentReaderPlugin,
  ReaderDocument,
  ReaderInput,
} from './types';

/**
 * Generic reader registry. Format-specific parsing lives in plugins;
 * conversion to BPMN (or another target format) is deliberately out of scope.
 */
export class DocumentReaderEngine {
  private readonly readers: DocumentReaderPlugin[] = [];

  constructor(readers: DocumentReaderPlugin[] = []) {
    readers.forEach(reader => this.register(reader));
  }

  register(reader: DocumentReaderPlugin): void {
    if (this.readers.some(candidate => candidate.id === reader.id)) {
      throw new Error(`Un lecteur "${reader.id}" est déjà enregistré.`);
    }
    this.readers.push(reader);
  }

  async read(input: ReaderInput): Promise<ReaderDocument> {
    const reader = this.readers.find(candidate => candidate.supports(input));
    if (!reader) {
      throw new Error('Aucun lecteur compatible avec ce fichier n’est disponible.');
    }

    const document = await reader.read(input);
    if (!document.pages.length) {
      throw new Error('Le document ne contient aucune page exploitable.');
    }
    return document;
  }
}

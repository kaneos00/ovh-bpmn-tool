import type {
  DocumentReaderPlugin,
  ReaderDocument,
  ReaderInput,
  ReaderPage,
} from '../reader/types';

const parseXml = (xml: string, description: string): Document => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) {
    throw new Error(`Le XML ${description} est invalide.`);
  }
  return document;
};

const decodeBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const inflateRaw = async (value: string): Promise<string> => {
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(value.trim());
  } catch {
    const decoded = decodeURIComponent(value);
    bytes = Uint8Array.from(decoded, character => character.charCodeAt(0));
  }

  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
};

const readDiagramModel = async (diagram: Element, index: number): Promise<string> => {
  const directModel = Array.from(diagram.children)
    .find(child => child.localName === 'mxGraphModel');
  if (directModel) return new XMLSerializer().serializeToString(directModel);

  const payload = diagram.textContent?.trim() ?? '';
  if (!payload) throw new Error(`La page Draw.io ${index + 1} est vide.`);

  const decoded = payload.startsWith('<mxGraphModel')
    ? payload
    : await inflateRaw(payload);
  const modelDocument = parseXml(decoded, `de la page ${index + 1}`);
  const model = modelDocument.querySelector('mxGraphModel');
  if (!model) {
    throw new Error(`Impossible de lire le modèle de la page ${index + 1}.`);
  }
  return new XMLSerializer().serializeToString(model);
};

export class DrawioReader implements DocumentReaderPlugin {
  readonly id = 'drawio';

  supports(input: ReaderInput): boolean {
    return /\.drawio$/i.test(input.fileName ?? '') ||
      /<(?:mxfile|mxGraphModel)\b/i.test(input.content);
  }

  async read(input: ReaderInput): Promise<ReaderDocument> {
    const source = parseXml(input.content, 'Draw.io');
    const directModel = source.querySelector('mxGraphModel');

    if (directModel && source.documentElement.localName === 'mxGraphModel') {
      const page: ReaderPage = {
        index: 0,
        name: 'Page-1',
        content: new XMLSerializer().serializeToString(directModel),
        mediaType: 'application/xml',
      };
      return { format: this.id, pages: [page], warnings: [] };
    }

    const diagrams = Array.from(source.querySelectorAll('mxfile > diagram'));
    if (!diagrams.length) {
      throw new Error('Le fichier ne contient aucun diagramme Draw.io.');
    }

    const pages = await Promise.all(diagrams.map(async (diagram, index) => ({
      index,
      name: diagram.getAttribute('name')?.trim() || `Page-${index + 1}`,
      content: await readDiagramModel(diagram, index),
      mediaType: 'application/xml' as const,
    })));

    return { format: this.id, pages, warnings: [] };
  }
}

export const drawioReader = new DrawioReader();

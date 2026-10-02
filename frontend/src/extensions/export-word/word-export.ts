export type WordProcessElement = {
  id: string;
  type: string;
  name: string;
};

export type WordSequenceFlow = {
  id: string;
  name: string;
  source: string;
  target: string;
};

const XML_NS =
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const escapeXml = (value: string | number | undefined | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const textRun = (text: string, bold = false) =>
  `<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;

const paragraph = (text = '', options: { heading?: number; bold?: boolean } = {}) => {
  const style = options.heading ? `<w:pPr><w:pStyle w:val="Heading${options.heading}"/></w:pPr>` : '';
  return `<w:p>${style}${textRun(text, options.bold)}</w:p>`;
};

const bullet = (text: string) =>
  `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${textRun(text)}</w:p>`;

const uint32le = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
};

const uint16le = (value: number) => {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value & 0xffff, true);
  return bytes;
};

const concatBytes = (...parts: Uint8Array[]) => {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  parts.forEach(part => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
};

const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

type ZipEntry = {
  name: string;
  data: Uint8Array;
};

const createZip = (entries: ZipEntry[]) => {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  entries.forEach(entry => {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeader = concatBytes(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      uint16le(20),
      uint16le(0x0800),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint32le(crc),
      uint32le(entry.data.length),
      uint32le(entry.data.length),
      uint16le(name.length),
      uint16le(0),
      name,
    );

    localParts.push(localHeader, entry.data);

    const centralHeader = concatBytes(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
      uint16le(20),
      uint16le(20),
      uint16le(0x0800),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint32le(crc),
      uint32le(entry.data.length),
      uint32le(entry.data.length),
      uint16le(name.length),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint32le(0),
      uint32le(offset),
      name,
    );

    centralParts.push(centralHeader);
    offset += localHeader.length + entry.data.length;
  });

  const centralDirectory = concatBytes(...centralParts);
  const locals = concatBytes(...localParts);
  const end = concatBytes(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    uint16le(0),
    uint16le(0),
    uint16le(entries.length),
    uint16le(entries.length),
    uint32le(centralDirectory.length),
    uint32le(locals.length),
    uint16le(0),
  );

  return concatBytes(locals, centralDirectory, end);
};

const dataUrlToBytes = (dataUrl: string) => {
  const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const getPngSize = (png: Uint8Array) => {
  if (
    png.length < 24 ||
    png[0] !== 0x89 ||
    png[1] !== 0x50 ||
    png[2] !== 0x4e ||
    png[3] !== 0x47
  ) {
    return { width: 1200, height: 800 };
  }

  return {
    width:
      png[16] * 0x1000000 +
      png[17] * 0x10000 +
      png[18] * 0x100 +
      png[19],
    height:
      png[20] * 0x1000000 +
      png[21] * 0x10000 +
      png[22] * 0x100 +
      png[23],
  };
};

const imageRelationshipId = 'rIdDiagram';

const imageDrawing = (png: Uint8Array) => {
  const { width, height } = getPngSize(png);
  const maxWidth = 5943600;
  const maxHeight = 8000000;
  const ratio = height / Math.max(width, 1);
  const cx = Math.min(maxWidth, Math.round(maxHeight / Math.max(ratio, 0.01)));
  const cy = Math.round(cx * ratio);

  return `<w:p><w:r><w:drawing>
  <wp:inline distT="0" distB="0" distL="0" distR="0">
    <wp:extent cx="${cx}" cy="${cy}"/>
    <wp:docPr id="1" name="BPMN diagram"/>
    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:nvPicPr><pic:cNvPr id="0" name="diagram.png"/><pic:cNvPicPr/></pic:nvPicPr>
          <pic:blipFill><a:blip r:embed="${imageRelationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
          <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
        </pic:pic>
      </a:graphicData>
    </a:graphic>
  </wp:inline>
</w:drawing></w:r></w:p>`;
};

const collectProcessData = (xml: string) => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const elements: WordProcessElement[] = [];
  const names = new Map<string, string>();
  const nodes = Array.from(document.getElementsByTagName('*')).filter(node =>
    /^bpmn:(task|userTask|serviceTask|manualTask|scriptTask|businessRuleTask|sendTask|receiveTask|callActivity|subProcess|exclusiveGateway|parallelGateway|inclusiveGateway|complexGateway|eventBasedGateway|startEvent|endEvent|intermediateCatchEvent|intermediateThrowEvent)$/.test(node.nodeName),
  );

  nodes.forEach(node => {
    const id = node.getAttribute('id') || '';
    if (!id) return;
    const name = node.getAttribute('name') || id;
    names.set(id, name);
    elements.push({
      id,
      type: node.localName || node.nodeName.replace('bpmn:', ''),
      name,
    });
  });

  const flows: WordSequenceFlow[] = Array.from(document.getElementsByTagName('*'))
    .filter(node => node.nodeName === 'bpmn:sequenceFlow')
    .map(node => ({
      id: node.getAttribute('id') || '',
      name: node.getAttribute('name') || '',
      source: names.get(node.getAttribute('sourceRef') || '') || node.getAttribute('sourceRef') || '',
      target: names.get(node.getAttribute('targetRef') || '') || node.getAttribute('targetRef') || '',
    }))
    .filter(flow => flow.source && flow.target);

  return { elements, flows };
};

const documentXml = (
  processName: string,
  description: string,
  version: number | null | undefined,
  createdBy: string,
  updatedAt: string,
  elements: WordProcessElement[],
  flows: WordSequenceFlow[],
  diagramDataUrl?: string,
) => {
  const image = diagramDataUrl ? imageDrawing(dataUrlToBytes(diagramDataUrl)) : '';
  const elementRows = elements
    .map(
      element =>
        `<w:tr><w:tc><w:p>${textRun(element.type)}</w:p></w:tc><w:tc><w:p>${textRun(element.name)}</w:p></w:tc><w:tc><w:p>${textRun(element.id)}</w:p></w:tc></w:tr>`,
    )
    .join('');
  const flowRows = flows
    .map(
      flow =>
        `<w:tr><w:tc><w:p>${textRun(flow.source)}</w:p></w:tc><w:tc><w:p>${textRun(flow.target)}</w:p></w:tc><w:tc><w:p>${textRun(flow.name)}</w:p></w:tc></w:tr>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${XML_NS}" xmlns:r="${REL_NS}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<w:body>
${paragraph(processName, { heading: 1 })}
${paragraph(description)}
${paragraph(`Version : ${version ?? '—'} | Créé par : ${createdBy || '—'} | Dernière modification : ${updatedAt || '—'}`)}
${diagramDataUrl ? paragraph('Diagramme BPMN', { heading: 2 }) + image : ''}
${paragraph('Éléments du processus', { heading: 2 })}
<table:table xmlns:table="urn:placeholder">${elementRows}</table:table>
${paragraph('Flux du processus', { heading: 2 })}
<table:table xmlns:table="urn:placeholder">${flowRows}</table:table>
${paragraph('Export généré depuis OVH BPMN Tool')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>
</w:body></w:document>`.replace(
    /<table:table[^>]*>([\s\S]*?)<\/table:table>/g,
    (_, rows) =>
      `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single"/><w:left w:val="single"/><w:bottom w:val="single"/><w:right w:val="single"/><w:insideH w:val="single"/><w:insideV w:val="single"/></w:tblBorders></w:tblPr>${rows}</w:tbl>`,
  );
};

export const createWordDocument = (options: {
  processName: string;
  description: string;
  version?: number | null;
  createdBy: string;
  updatedAt: string;
  bpmnXml: string;
  diagramPngDataUrl?: string;
}) => {
  const encoder = new TextEncoder();
  const png = options.diagramPngDataUrl
    ? dataUrlToBytes(options.diagramPngDataUrl)
    : undefined;
  const { elements, flows } = collectProcessData(options.bpmnXml);

  const entries: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`),
    },
    {
      name: '_rels/.rels',
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
    },
    {
      name: 'word/_rels/document.xml.rels',
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${png ? '<Relationship Id="rIdDiagram" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/diagram.png"/>' : ''}
</Relationships>`),
    },
    {
      name: 'word/styles.xml',
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${XML_NS}">
<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
</w:styles>`),
    },
    {
      name: 'docProps/core.xml',
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>${escapeXml(options.processName)}</dc:title><dc:creator>OVH BPMN Tool</dc:creator><cp:lastModifiedBy>OVH BPMN Tool</cp:lastModifiedBy>
</cp:coreProperties>`),
    },
    {
      name: 'docProps/app.xml',
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>OVH BPMN Tool</Application></Properties>`),
    },
    {
      name: 'word/document.xml',
      data: encoder.encode(
        documentXml(
          options.processName,
          options.description,
          options.version,
          options.createdBy,
          options.updatedAt,
          elements,
          flows,
          options.diagramPngDataUrl,
        ),
      ),
    },
  ];

  if (png) {
    entries.push({ name: 'word/media/diagram.png', data: png });
  }

  return createZip(entries);
};

export const downloadWordDocument = (
  bytes: Uint8Array,
  fileName: string,
) => {
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

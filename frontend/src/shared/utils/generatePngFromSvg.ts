import { Canvg, RenderingContext2D } from 'canvg';

const INITIAL_SCALE = 1;
const FINAL_SCALE = 1;
const SCALE_STEP = 1;

const DATA_URL_REGEX =
  /^data:((?:\w+\/(?:(?!;).)+)?)((?:;[\w\W]*?[^;])*),(.+)$/;

export const generatePngFromSvg = async (svg: string) => {
  let finalSVG = '';
  let dataURL = '';

  for (let scale = INITIAL_SCALE; scale >= FINAL_SCALE; scale -= SCALE_STEP) {
    const canvas = document.createElement('canvas');

    finalSVG = svg.replace(
      /width="([^"]+)" height="([^"]+)"/,
      (_, widthStr, heightStr) => {
        return `width="${parseInt(widthStr, 10) * scale}" height="${
          parseInt(heightStr, 10) * scale
        }"`;
      },
    );

    try {
      const context = canvas.getContext('2d') as RenderingContext2D;
      const canvg = Canvg.fromString(context, finalSVG);
      await canvg.render();

      // make the background white for every format
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);

      dataURL = canvas.toDataURL('image/png');

      if (DATA_URL_REGEX.test(dataURL)) {
        return dataURL;
      }
    } finally {
      // Release the canvas backing store promptly; the returned data URL is
      // independent of the temporary canvas.
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  throw new Error('Error happened generating image. Diagram size is too big.');
};

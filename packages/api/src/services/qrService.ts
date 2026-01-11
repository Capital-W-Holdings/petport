import QRCode from 'qrcode';

export interface QRCodeData {
  petportId: string;
  verifyUrl: string;
  dataUrl: string;
  svg: string;
}

/**
 * Generate QR code as data URL and SVG
 */
export async function generateQRCode(petportId: string): Promise<QRCodeData> {
  const verifyUrl = `https://petport.app/verify/${petportId}`;
  const qrData = JSON.stringify({ petportId, v: 1 });

  const [dataUrl, svg] = await Promise.all([
    QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#2D4A3E',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    }),
    QRCode.toString(qrData, {
      type: 'svg',
      width: 300,
      margin: 2,
      color: {
        dark: '#2D4A3E',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    }),
  ]);

  return {
    petportId,
    verifyUrl,
    dataUrl,
    svg,
  };
}

/**
 * Generate QR code as PNG buffer for download
 */
export async function generateQRCodeBuffer(petportId: string): Promise<Buffer> {
  const qrData = JSON.stringify({ petportId, v: 1 });

  return QRCode.toBuffer(qrData, {
    width: 600,
    margin: 2,
    color: {
      dark: '#2D4A3E',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });
}

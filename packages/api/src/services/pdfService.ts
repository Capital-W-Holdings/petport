import PDFDocument from 'pdfkit';
import type { Pet, Vaccination } from '@petport/shared';

export interface PassportData {
  pet: Pet;
  owner: { name: string; email: string };
  vaccinations: Vaccination[];
  generatedAt: string;
}

/**
 * Generate a pet passport PDF
 */
export async function generatePassportPDF(data: PassportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Pet Passport - ${data.pet.name}`,
          Author: 'PetPort',
          Subject: 'Pet Travel Document',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Colors
      const forest = '#2D4A3E';
      const terracotta = '#D4846A';
      const charcoal = '#2C2C2C';
      const stone = '#6B6B6B';

      // Header
      doc.rect(0, 0, doc.page.width, 120).fill(forest);
      
      doc.fillColor('white')
        .fontSize(32)
        .font('Helvetica-Bold')
        .text('PET PASSPORT', 50, 40);
      
      doc.fontSize(14)
        .font('Helvetica')
        .text('Digital Pet Identity Document', 50, 80);

      // PetPort ID Badge
      doc.fillColor(terracotta)
        .roundedRect(doc.page.width - 180, 35, 130, 50, 5)
        .fill();
      
      doc.fillColor('white')
        .fontSize(10)
        .text('PetPort ID', doc.page.width - 175, 45, { width: 120, align: 'center' });
      
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text(data.pet.petportId, doc.page.width - 175, 60, { width: 120, align: 'center' });

      // Pet Information Section
      let y = 150;

      doc.fillColor(charcoal)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Pet Information', 50, y);
      
      y += 30;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke(forest);
      y += 20;

      const infoRows: [string, string][] = [
        ['Name', data.pet.name],
        ['Species', data.pet.species],
        ['Breed', data.pet.breed || 'Not specified'],
        ['Sex', data.pet.sex],
        ['Date of Birth', data.pet.dateOfBirth || 'Unknown'],
        ['Color', data.pet.color || 'Not specified'],
        ['Microchip ID', data.pet.microchipId || 'None'],
      ];

      for (const row of infoRows) {
        doc.fillColor(stone).fontSize(10).font('Helvetica').text(row[0], 50, y);
        doc.fillColor(charcoal).fontSize(12).font('Helvetica-Bold').text(row[1], 150, y);
        y += 25;
      }

      // Owner Information
      y += 20;
      doc.fillColor(charcoal)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Owner Information', 50, y);
      
      y += 30;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke(forest);
      y += 20;

      doc.fillColor(stone).fontSize(10).font('Helvetica').text('Name', 50, y);
      doc.fillColor(charcoal).fontSize(12).font('Helvetica-Bold').text(data.owner.name, 150, y);
      y += 25;

      doc.fillColor(stone).fontSize(10).font('Helvetica').text('Email', 50, y);
      doc.fillColor(charcoal).fontSize(12).font('Helvetica-Bold').text(data.owner.email, 150, y);
      y += 35;

      // Vaccination Records
      doc.fillColor(charcoal)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Vaccination Records', 50, y);
      
      y += 30;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke(forest);
      y += 20;

      if (data.vaccinations.length === 0) {
        doc.fillColor(stone)
          .fontSize(12)
          .font('Helvetica-Oblique')
          .text('No vaccinations recorded', 50, y);
        y += 30;
      } else {
        // Table header
        doc.fillColor(forest).fontSize(10).font('Helvetica-Bold');
        doc.text('Type', 50, y);
        doc.text('Name', 130, y);
        doc.text('Date', 280, y);
        doc.text('Expires', 380, y);
        doc.text('Status', 470, y);
        y += 20;

        doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke('#E8DED3');
        y += 10;

        for (const vax of data.vaccinations) {
          const isExpired = vax.expiresAt ? new Date(vax.expiresAt) < new Date() : false;
          const status = vax.expiresAt ? (isExpired ? 'EXPIRED' : 'VALID') : 'N/A';

          doc.fillColor(charcoal).fontSize(9).font('Helvetica');
          doc.text(vax.type, 50, y, { width: 75 });
          doc.text(vax.name, 130, y, { width: 145 });
          doc.text(new Date(vax.administeredAt).toLocaleDateString(), 280, y);
          doc.text(vax.expiresAt ? new Date(vax.expiresAt).toLocaleDateString() : '-', 380, y);
          
          doc.fillColor(isExpired ? '#B8533E' : '#4A6B5D')
            .font('Helvetica-Bold')
            .text(status, 470, y);
          
          y += 25;

          // Check for page break
          if (y > doc.page.height - 100) {
            doc.addPage();
            y = 50;
          }
        }
      }

      // Footer
      const footerY = doc.page.height - 80;
      doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).stroke('#E8DED3');
      
      doc.fillColor(stone)
        .fontSize(9)
        .font('Helvetica')
        .text(
          `Generated on ${new Date(data.generatedAt).toLocaleString()} by PetPort`,
          50,
          footerY + 15,
          { align: 'center', width: doc.page.width - 100 }
        );
      
      doc.text(
        'This document is for informational purposes. Verify at petport.app/verify/' + data.pet.petportId,
        50,
        footerY + 30,
        { align: 'center', width: doc.page.width - 100 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

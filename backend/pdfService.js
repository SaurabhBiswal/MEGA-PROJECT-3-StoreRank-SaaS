const PDFDocument = require('pdfkit');

/**
 * Helper to stream a PDF response with sensible headers.
 */
function createPdfResponse(res, filename, buildContent) {
  const doc = new PDFDocument({ margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);
  buildContent(doc);
  doc.end();
}

module.exports = {
  createPdfResponse,
};


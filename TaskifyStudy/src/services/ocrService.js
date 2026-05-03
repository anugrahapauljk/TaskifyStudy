import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromImage(file, onProgress) {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (onProgress && m.progress) {
        onProgress(Math.floor(m.progress * 100));
      }
    },
  });

  const {
    data: { text },
  } = await worker.recognize(file);
  await worker.terminate();
  return text;
}

export async function extractTextFromPDF(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  let fullText = "";

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);

    // Try native text extraction first
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");

    if (pageText.trim().length > 30) {
      fullText += `\n--- Page ${i} ---\n` + pageText;
    } else {
      // Fallback to OCR for scanned pages
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      const ocrText = await extractTextFromImage(blob, null);
      fullText += `\n--- Page ${i} ---\n` + ocrText;
    }

    if (onProgress) {
      onProgress(Math.floor((i / totalPages) * 100));
    }
  }

  return fullText;
}

export async function extractText(file, onProgress) {
  const type = file.type;
  if (type === "application/pdf") {
    return await extractTextFromPDF(file, onProgress);
  } else if (type.startsWith("image/")) {
    return await extractTextFromImage(file, onProgress);
  } else {
    // Try as text file
    return await file.text();
  }
}

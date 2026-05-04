import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

export async function extractTextFromPPTX(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // PPTX files contain slides in ppt/slides/slide*.xml
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)[1]);
      const numB = parseInt(b.match(/slide(\d+)/)[1]);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error("No slides found in this PowerPoint file.");
  }

  let fullText = "";
  const totalSlides = slideFiles.length;

  for (let i = 0; i < totalSlides; i++) {
    const slideXml = await zip.files[slideFiles[i]].async("string");

    // Parse XML and extract all text content
    const parser = new DOMParser();
    const doc = parser.parseFromString(slideXml, "application/xml");

    // Get all text elements (a:t tags in OOXML)
    const textNodes = doc.getElementsByTagNameNS(
      "http://schemas.openxmlformats.org/drawingml/2006/main",
      "t"
    );

    let slideText = "";
    for (let j = 0; j < textNodes.length; j++) {
      slideText += textNodes[j].textContent + " ";
    }

    if (slideText.trim()) {
      fullText += `\n--- Slide ${i + 1} ---\n` + slideText.trim();
    }

    if (onProgress) {
      onProgress(Math.floor(((i + 1) / totalSlides) * 100));
    }
  }

  return fullText;
}

export async function extractText(file, onProgress) {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type === "application/pdf") {
    return await extractTextFromPDF(file, onProgress);
  } else if (type.startsWith("image/")) {
    return await extractTextFromImage(file, onProgress);
  } else if (
    type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    name.endsWith(".pptx")
  ) {
    return await extractTextFromPPTX(file, onProgress);
  } else if (
    type === "application/vnd.ms-powerpoint" ||
    name.endsWith(".ppt")
  ) {
    throw new Error(
      "Legacy .ppt format is not supported. Please convert to .pptx and try again."
    );
  } else {
    // Try as text file
    return await file.text();
  }
}

/**
 * Extract text from multiple files and combine them.
 */
export async function extractTextFromMultipleFiles(files, onProgress) {
  let combinedText = "";
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];

    const fileProgress = (p) => {
      if (onProgress) {
        // Calculate overall progress across all files
        const baseProgress = (i / totalFiles) * 100;
        const fileContribution = (p / totalFiles);
        onProgress(Math.floor(baseProgress + fileContribution));
      }
    };

    const text = await extractText(file, fileProgress);
    if (text && text.trim()) {
      combinedText += `\n\n=== File: ${file.name} ===\n` + text;
    }

    if (onProgress) {
      onProgress(Math.floor(((i + 1) / totalFiles) * 100));
    }
  }

  return combinedText;
}

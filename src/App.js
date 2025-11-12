import React, { useState } from "react";
import { backgroundImage } from "./background"; // Import the image from background.js
import { backgroundImage1 } from "./background1";
import pdfMake from "pdfmake/build/pdfmake.min";
import H1Invitation from "./pdf/H1.pdf";
import H2Invitation from "./pdf/H2.pdf";
import H3Invitation from "./pdf/H3.pdf";
import "./App.css";
import { PDFDocument } from "pdf-lib";

function App() {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false); // For loading spinner

  const renderTextToImage = (
    text,
    {
      canvasWidth = 300,
      canvasHeight = 50,
      fontSize = 23,
      minFontSize = 14,
      fontWeight = "700",
      color = "#b40000",
      fontFamily = "'S0709892'",
      textAlign = "left",
      paddingX = 10,
      paddingY = 40,
      lineHeight,
      allowResize = true,
    } = {}
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext("2d");

    let currentFontSize = fontSize; // Default font size
    const applyFont = () => {
      ctx.font = `${fontWeight} ${currentFontSize}px ${fontFamily}`;
    };

    applyFont();
    ctx.fillStyle = color; // Text color
    ctx.textAlign = textAlign;
    ctx.textBaseline = "top";

    // Adjust font size dynamically for longer text
    if (allowResize) {
      while (
        ctx.measureText(text).width > canvasWidth - paddingX * 2 &&
        currentFontSize > minFontSize
      ) {
        currentFontSize--;
        applyFont();
      }
    }

    // Wrap text if needed
    const lines = [];
    let currentLine = "";
    const words = text.split(" ");
    words.forEach((word) => {
      const testLine = currentLine + word + " ";
      if (ctx.measureText(testLine).width > canvasWidth - 20) {
        lines.push(currentLine.trim());
        currentLine = word + " ";
      } else {
        currentLine = testLine;
      }
    });
    lines.push(currentLine.trim());

    // Render lines
    const resolvedLineHeight = lineHeight ?? currentFontSize + 10;
    const resolvedX =
      textAlign === "center"
        ? canvasWidth / 2
        : textAlign === "right"
        ? canvasWidth - paddingX
        : paddingX;
    let y = paddingY;
    lines.forEach((line) => {
      ctx.fillText(line, resolvedX, y);
      y += resolvedLineHeight;
    });

    return canvas.toDataURL();
  };

  const NAME_PAGE_CONFIGS = [
    {
      background: backgroundImage,
      position: { x: 225, y: 603 },
      textOptions: {
        canvasWidth: 310,
        canvasHeight: 410,
        fontSize: 20,
        minFontSize: 20,
        fontWeight: "700",
        color: "#e50780",
        textAlign: "left",
        paddingX: 0,
        paddingY: 0,
        allowResize: false,
      },
    },
    {
      background: backgroundImage1,
      position: { x: 230, y: 210 },
      textOptions: {
        canvasWidth: 310,
        canvasHeight: 410,
        fontSize: 20,
        minFontSize: 17,
        fontWeight: "600",
        color: "#860b0c",
        textAlign: "left",
        paddingX: 0,
        paddingY: 70,
        lineHeight: 34,
      },
    },
  ];

  const mergePDFs = async (generatedPDFBlob) => {
    try {
      const generatedPDFBytes = await generatedPDFBlob.arrayBuffer();
      const generatedPDF = await PDFDocument.load(generatedPDFBytes);

      const finalPdf = await PDFDocument.create();

      const appendPdfFromUrl = async (pdfUrl) => {
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${pdfUrl}`);
        const pdfBytes = await response.arrayBuffer();
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await finalPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => finalPdf.addPage(page));
      };

      const appendGeneratedPage = async (pageIndex) => {
        if (pageIndex >= generatedPDF.getPageCount()) return;
        const [copiedPage] = await finalPdf.copyPages(generatedPDF, [pageIndex]);
        finalPdf.addPage(copiedPage);
      };

      await appendPdfFromUrl(H1Invitation);
      await appendGeneratedPage(0);
      await appendPdfFromUrl(H2Invitation);
      await appendGeneratedPage(1);
      await appendPdfFromUrl(H3Invitation);

      const mergedPDFBytes = await finalPdf.save();
      const mergedPDFBlob = new Blob([mergedPDFBytes], { type: "application/pdf" });

      // Trigger download
      downloadPDF(mergedPDFBlob);
    } catch (error) {
      console.error("Error merging PDFs:", error.message);
    }
  };
  
  const downloadPDF = (pdfBlob) => {
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "Generated"}.pdf`; // Suggested filename
    a.click();
    window.URL.revokeObjectURL(url);
  };
  

  const generatePDF = () => {
    if (!name) {
      alert("Name is required!");
      return; // Stop further processing if validation fails
    }

    setIsLoading(true); // Start loading spinner

    const formattedName = name.endsWith("") ? name : `${name},`;

    const nameLayers = NAME_PAGE_CONFIGS.map((pageConfig) => ({
      ...pageConfig,
      image: renderTextToImage(formattedName, pageConfig.textOptions),
    }));

    const docDefinition = {
      content: nameLayers.map((layer, index) => ({
        image: layer.image,
        absolutePosition: layer.position,
        ...(index > 0 ? { pageBreak: "before" } : {}),
      })),
      background: (currentPage) => {
        const pageConfig = NAME_PAGE_CONFIGS[currentPage - 1];
        if (!pageConfig) return null;

        return {
          image: pageConfig.background, // Background image
          width: 595, // A4 size width
        };
      },
    };

    // Generate the initial PDF and handle its Blob
    pdfMake.createPdf(docDefinition).getBlob(async (generatedPDFBlob) => {
      // Merge PDFs in specified order
      await mergePDFs(generatedPDFBlob);
      setIsLoading(false); // Stop loading spinner
    });
  };

  return (
    <div className="App">
      <h1>Marriage Invitation</h1>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter name"
        className="name-input"
      />
      <br />
      <br />
      <button onClick={generatePDF} className="generate-button">
        Generate Invitation
      </button>

      {isLoading && <div className="spinner">Loading...</div>} {/* Loading Spinner */}
    </div>
  );
}

export default App;

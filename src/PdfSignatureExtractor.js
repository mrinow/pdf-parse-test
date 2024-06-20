import React, { useState } from "react";
import { PDFDocument, PDFPage } from "pdf-lib";
import { sha256, sha384 } from "crypto-hash";

const PdfSignatureExtractor = () => {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    setLoading(true);

    const reader = new FileReader();

    reader.onload = async (event) => {
      const typedArray = new Uint8Array(event.target.result);

      try {
        const extractedSignatures = await findSignatures1(typedArray);

        setSignatures(extractedSignatures);
      } catch (error) {
        console.error("Error extracting signatures:", error);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const findSignatures = async (typedArray) => {
    let extractedSignaturesString = "";
    const extractedSignatures = [];

    // Parse the PDF structure to find potential areas of interest
    // This example is simplified and assumes signature blocks are stored in specific objects or byte ranges
    // You may need to adapt this based on your specific PDF structure and signature block format

    // For demonstration, let's say we are looking for a specific byte pattern that indicates a signature block
    const signaturePattern = "/ByteRange"; // Example pattern to find signature blocks
    const signatureRegex =
      /\/ByteRange\s*\[(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\]\s*\/Contents\s*\(.*\)/g;

    // Convert typedArray to PDFDocument
    const pdfDoc = await PDFDocument.load(typedArray);

    // Iterate through the PDF document objects or content streams to find signatures
    pdfDoc.context.indirectObjects.forEach((obj) => {
      const byteData = obj.toString(); // Convert object to string to apply regex (simplified example)

      // Apply your regex pattern to find signature blocks
      const match = byteData.match(signaturePattern);

      if (match) {
        // Extract relevant data from the matched object or byte range
        const signatureData = {
          content: byteData, // Example content extraction (adjust based on your needs)
          // Include other relevant metadata or extracted data
        };
        console.log("loop", signatureData);
        extractedSignatures.push(signatureData);
        extractedSignaturesString += `${JSON.stringify(signatureData)}\n`;
      }
    });

    // extractedSignatures.map((signature, index) =>
    //   JSON.stringify(signature, null, 2)
    // );

    console.log("hash done 1 way", JSON.stringify(extractedSignaturesString));

    const ihash = await sha256(extractedSignaturesString);
    console.log("hash done 1 way", ihash);

    const id = extractEnvelopeId(extractedSignaturesString);
    console.log("found the id", id);

    return extractedSignatures;
  };

  const extractEnvelopeId = (signaturesString) => {
    const envelopeIdPattern = /ENVELOPEID_([A-Z0-9]+)/;
    const match = envelopeIdPattern.exec(signaturesString);
    return match ? match[0] : "";
  };

  const findSignatures1 = async (typedArray) => {
    let extractedSignaturesString = "";
    const extractedSignatures = [];

    // Convert typedArray to PDFDocument
    const pdfDoc = await PDFDocument.load(typedArray);

    // Define the regex pattern to find signature blocks
    const signatureRegex =
      /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/;

    // Iterate through the PDF document objects to find signatures
    for (const [ref, obj] of pdfDoc.context.indirectObjects) {
      console.log("inside");
      if (obj) {
        const byteData = obj.contents
          ? obj.contents.toString()
          : obj.toString();

        // Apply the regex pattern to find signature blocks
        const match = signatureRegex.exec(byteData);

        if (match) {
          const byteRange = match.slice(1, 5).map(Number);

          console.log(byteRange);

          // Extract the actual bytes specified by the ByteRange
          const part1 = typedArray.slice(
            byteRange[0],
            byteRange[0] + byteRange[1]
          );
          const part2 = typedArray.slice(
            byteRange[2],
            byteRange[2] + byteRange[3]
          );
          const signatureBytes = new Uint8Array([...part1, ...part2]);

          const signatureData = {
            byteRange,
            signatureBytes: Array.from(signatureBytes), // Convert Uint8Array to regular array for JSON serialization
            content: byteData,
          };

          extractedSignatures.push(signatureData);
          extractedSignaturesString += `${JSON.stringify(signatureData)}\n`;
        }
      }
    }

    try {
      const parsedData = JSON.parse(extractedSignaturesString);
      const { signatureBytes } = parsedData;

      if (signatureBytes) {
        // setSignatureBytes(signatureBytes);
        console.log("signature string:", extractedSignaturesString);
        console.log("YES!!!");
        const uint8Array = new Uint8Array(signatureBytes);
        const arrayBuffer = uint8Array.buffer;

        // Calculate SHA-256 hash
        const ihash2 = await sha256(arrayBuffer);
        // const ihash2 = await sha256(signatureBytes);
        console.log("correct hash:", ihash2);
      } else {
        console.error("No signatureBytes found in the JSON data.");
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }

    // console.log("Extracted signatures string:", extractedSignaturesString);

    const ihash = await sha256(extractedSignaturesString);
    console.log("Hash of extracted signatures:", ihash);

    const id = extractEnvelopeId(extractedSignaturesString);
    console.log("Found the envelope ID:", id);

    return extractedSignatures;
  };

  const findSignatures2 = async (typedArray) => {
    let extractedSignaturesString = "";
    let extractedSignaturesArray = {};
    const extractedSignatures = [];

    // Convert typedArray to PDFDocument
    const pdfDoc = await PDFDocument.load(typedArray);

    // Define the regex pattern to find signature blocks
    const signatureRegex =
      /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/;

    // Iterate through the PDF document objects to find signatures
    for (const [ref, obj] of pdfDoc.context.indirectObjects) {
      if (obj) {
        const byteData = obj.contents
          ? obj.contents.toString()
          : obj.toString();

        // Apply the regex pattern to find signature blocks
        const match = signatureRegex.exec(byteData);

        if (match) {
          const byteRange = match.slice(1, 5).map(Number);

          // Extract the actual bytes specified by the ByteRange
          const part1 = typedArray.slice(
            byteRange[0],
            byteRange[0] + byteRange[1]
          );
          const part2 = typedArray.slice(
            byteRange[2],
            byteRange[2] + byteRange[3]
          );
          const signatureBytes = new Uint8Array([...part1, ...part2]);

          const signatureData = {
            byteRange,
            signatureBytes: Array.from(signatureBytes), // Convert Uint8Array to regular array for JSON serialization
            content: byteData,
          };

          //   console.log("zzzzzzz", JSON.stringify(signatureBytes));

          extractedSignatures.push(signatureData);
          extractedSignaturesArray = signatureBytes;
          extractedSignaturesString += `${signatureBytes}\n`;
        }
      }
    }

    console.log("yyyyy", extractedSignaturesArray);

    console.log("Extracted signatures string:", extractedSignaturesString);

    const ihash = await sha256(extractedSignaturesString);
    console.log("Hash of extracted signatures:", ihash);

    const id = extractEnvelopeId(extractedSignaturesString);
    console.log("Found the envelope ID:", id);

    return extractedSignatures;
  };

  return (
    <div>
      <h2>PDF Signature Extractor</h2>
      <input type="file" onChange={handleFileUpload} accept=".pdf" />
      {loading && <p>Loading...</p>}
      {signatures.length > 0 && (
        <div>
          <h3>Extracted Signatures:</h3>
          <ul>
            {signatures.map((signature, index) => (
              <li key={index}>
                <pre>{JSON.stringify(signature, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PdfSignatureExtractor;

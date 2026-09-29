/**
 * js-blobs.js
 * -----------------------------------------------------------
 * JavaScript Blobs (Binary Large Objects) - Utility & Helper Module
 *
 * Provides functions to create, read, slice, download, and build files locally in the browser
 * using JS Blobs without any server fetch/network requests.
 * Includes a pure JavaScript local PDF builder!
 */

(function (window) {
  "use strict";

  var JSBlobs = {};

  /**
   * 1. CREATE GENERIC BLOB
   * Creates a Blob object from string, object, array, or binary buffer.
   *
   * @param {string|ArrayBuffer|Array} data - Content for the Blob.
   * @param {string} mimeType - MIME type (e.g. 'text/plain', 'application/json', 'text/html').
   * @returns {Blob} The created Blob object.
   */
  JSBlobs.createBlob = function (data, mimeType) {
    mimeType = mimeType || "text/plain;charset=utf-8";

    if (typeof data === "object" && !(data instanceof ArrayBuffer) && !(data instanceof Uint8Array) && !Array.isArray(data)) {
      data = JSON.stringify(data, null, 2);
    }

    var content = Array.isArray(data) ? data : [data];
    return new Blob(content, { type: mimeType });
  };

  /**
   * 2. CREATE JSON BLOB
   * Creates a JSON Blob locally in memory.
   *
   * @param {Object|Array} jsObject
   * @returns {Blob}
   */
  JSBlobs.createJsonBlob = function (jsObject) {
    var jsonString = JSON.stringify(jsObject, null, 2);
    return new Blob([jsonString], { type: "application/json;charset=utf-8" });
  };

  /**
   * 3. CREATE TEXT / HTML BLOB
   *
   * @param {string} textContent
   * @param {boolean} isHtml
   * @returns {Blob}
   */
  JSBlobs.createTextBlob = function (textContent, isHtml) {
    var mimeType = isHtml ? "text/html;charset=utf-8" : "text/plain;charset=utf-8";
    return new Blob([textContent], { type: mimeType });
  };

  /**
   * 4. GENERATE BLOB URL
   *
   * @param {Blob} blob
   * @returns {string} blob:http://... URL string
   */
  JSBlobs.createBlobUrl = function (blob) {
    return URL.createObjectURL(blob);
  };

  /**
   * 5. REVOKE BLOB URL
   *
   * @param {string} url
   */
  JSBlobs.revokeBlobUrl = function (url) {
    URL.revokeObjectURL(url);
  };

  /**
   * 6. DOWNLOAD BLOB
   * Triggers client-side download in the browser.
   *
   * @param {Blob} blob
   * @param {string} filename
   */
  JSBlobs.downloadBlob = function (blob, filename) {
    filename = filename || "download.txt";
    var blobUrl = URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();

    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 150);
  };

  // Helper function to escape special PDF string characters
  function escapePdfString(str) {
    if (!str) return "";
    return String(str)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[\r\n]+/g, " ");
  }

  // Helper function to break long paragraph lines into max width line chunks
  function wrapText(text, maxChars) {
    maxChars = maxChars || 75;
    var words = String(text || "").split(/\s+/);
    var lines = [];
    var currentLine = "";

    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      if ((currentLine + " " + word).trim().length <= maxChars) {
        currentLine = (currentLine + " " + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * 7. BUILD LOCAL PDF BLOB (PURE JAVASCRIPT - NO FETCH REQUIRED)
   * Dynamically constructs a valid binary PDF document locally in browser memory.
   *
   * @param {Object} options
   * @param {string} options.title - Document main title.
   * @param {string} options.subtitle - Subtitle / description.
   * @param {Array<Object>} options.posts - List of post objects or text items.
   * @returns {Blob} PDF Blob object (`application/pdf`).
   */
  JSBlobs.buildPdfBlob = function (options) {
    options = options || {};
    var title = options.title || "Cosmic Chronicles - Space Blog";
    var subtitle = options.subtitle || "Exploring the Wonders of Space";
    var posts = options.posts || [
      { title: "Journey to the Stars", text: "The universe is filled with billions of galaxies, stars, and mysteries waiting to be explored." }
    ];

    var streamContent = [];

    // Header Title (Bold Helvetica, size 20)
    streamContent.push("BT /F2 20 Tf 40 800 Td (" + escapePdfString(title) + ") Tj ET");

    // Subtitle (Helvetica, size 11)
    streamContent.push("BT /F1 11 Tf 40 780 Td (" + escapePdfString(subtitle) + ") Tj ET");

    // Horizontal Divider Line
    streamContent.push("0.5 w 40 768 m 555 768 l S");

    var yPos = 740;

    // Iterate through posts and format them on the PDF
    for (var p = 0; p < posts.length; p++) {
      var post = posts[p];

      if (yPos < 60) break; // Keep within page bounds

      // Post Title
      if (post.title) {
        yPos -= 10;
        streamContent.push("BT /F2 13 Tf 40 " + yPos + " Td (" + escapePdfString(post.title) + ") Tj ET");
        yPos -= 18;
      }

      // Post Meta / Category
      if (post.meta) {
        streamContent.push("BT /F1 9 Tf 40 " + yPos + " Td (" + escapePdfString(post.meta) + ") Tj ET");
        yPos -= 14;
      }

      // Post Body Blocks / Text
      var textBlocks = [];
      if (Array.isArray(post.blocks)) {
        post.blocks.forEach(function (b) {
          if (b && b.text) textBlocks.push(b.text.replace(/<[^>]+>/g, ""));
        });
      } else if (post.text) {
        textBlocks.push(post.text);
      }

      for (var bIdx = 0; bIdx < textBlocks.length; bIdx++) {
        var wrappedLines = wrapText(textBlocks[bIdx], 78);
        for (var lIdx = 0; lIdx < wrappedLines.length; lIdx++) {
          if (yPos < 60) break;
          streamContent.push("BT /F1 10 Tf 40 " + yPos + " Td (" + escapePdfString(wrappedLines[lIdx]) + ") Tj ET");
          yPos -= 14;
        }
        yPos -= 6; // paragraph gap
      }

      yPos -= 10; // post gap
    }

    // PDF Footer
    streamContent.push("0.25 w 40 45 m 555 45 l S");
    streamContent.push("BT /F1 8 Tf 40 32 Td (Generated locally in browser using JS Blobs - " + new Date().toLocaleDateString() + ") Tj ET");

    var streamData = streamContent.join("\n");
    var streamLength = streamData.length;

    var pdfHeader = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";

    var obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    var obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
    var obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n";
    var obj4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
    var obj5 = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";
    var obj6 = "6 0 obj\n<< /Length " + streamLength + " >>\nstream\n" + streamData + "\nendstream\nendobj\n";

    var offset0 = 0;
    var offset1 = pdfHeader.length;
    var offset2 = offset1 + obj1.length;
    var offset3 = offset2 + obj2.length;
    var offset4 = offset3 + obj3.length;
    var offset5 = offset4 + obj4.length;
    var offset6 = offset5 + obj5.length;
    var startXref = offset6 + obj6.length;

    function padOffset(num) {
      var s = "0000000000" + num;
      return s.slice(-10);
    }

    var xref = "xref\n0 7\n" +
      "0000000000 65535 f \n" +
      padOffset(offset1) + " 00000 n \n" +
      padOffset(offset2) + " 00000 n \n" +
      padOffset(offset3) + " 00000 n \n" +
      padOffset(offset4) + " 00000 n \n" +
      padOffset(offset5) + " 00000 n \n" +
      padOffset(offset6) + " 00000 n \n";

    var trailer = "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n" + startXref + "\n%%EOF\n";

    var fullPdfString = pdfHeader + obj1 + obj2 + obj3 + obj4 + obj5 + obj6 + xref + trailer;

    return new Blob([fullPdfString], { type: "application/pdf" });
  };

  /**
   * 8. GENERATE & DOWNLOAD PDF LOCALLY
   * Builds a real PDF from the given options and triggers a client-side download.
   *
   * @param {Object} options - PDF content options.
   * @param {string} [filename] - Custom output filename.
   */
  JSBlobs.generateAndDownloadPdf = function (options, filename) {
    var pdfBlob = JSBlobs.buildPdfBlob(options);
    JSBlobs.downloadBlob(pdfBlob, filename || "document.pdf");
  };

  /**
   * 9. GENERATE & VIEW PDF IN NEW TAB LOCALLY
   * Builds a real PDF from the given options and opens it in a new browser tab.
   *
   * @param {Object} options
   */
  JSBlobs.generateAndViewPdf = function (options) {
    var pdfBlob = JSBlobs.buildPdfBlob(options);
    var url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 10000);
  };

  /**
   * 10. READ BLOB AS TEXT
   *
   * @param {Blob} blob
   * @returns {Promise<string>}
   */
  JSBlobs.readAsText = function (blob) {
    if (blob.text) return blob.text();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsText(blob);
    });
  };

  /**
   * 11. READ BLOB AS DATA URL (Base64)
   *
   * @param {Blob} blob
   * @returns {Promise<string>}
   */
  JSBlobs.readAsDataURL = function (blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(blob);
    });
  };

  /**
   * 12. READ BLOB AS ARRAY BUFFER
   *
   * @param {Blob} blob
   * @returns {Promise<ArrayBuffer>}
   */
  JSBlobs.readAsArrayBuffer = function (blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsArrayBuffer(blob);
    });
  };

  /**
   * 13. SLICE BLOB
   *
   * @param {Blob} blob
   * @param {number} start
   * @param {number} end
   * @param {string} mimeType
   * @returns {Blob}
   */
  JSBlobs.sliceBlob = function (blob, start, end, mimeType) {
    return blob.slice(start, end, mimeType || blob.type);
  };

  /**
   * 14. CONVERT CANVAS TO BLOB
   *
   * @param {HTMLCanvasElement} canvas
   * @param {string} mimeType
   * @param {number} quality
   * @returns {Promise<Blob>}
   */
  JSBlobs.canvasToBlob = function (canvas, mimeType, quality) {
    mimeType = mimeType || "image/png";
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("Canvas blob conversion failed"));
        }, mimeType, quality);
      } else {
        reject(new Error("toBlob is not supported on this browser"));
      }
    });
  };

  /**
   * 15. UPLOAD BLOB
   *
   * @param {string} uploadUrl
   * @param {Blob} blob
   * @param {string} fieldName
   * @param {string} filename
   * @returns {Promise<Response>}
   */
  JSBlobs.uploadBlob = function (uploadUrl, blob, fieldName, filename) {
    fieldName = fieldName || "file";
    filename = filename || "blob-data.bin";

    var formData = new FormData();
    formData.append(fieldName, blob, filename);

    return fetch(uploadUrl, {
      method: "POST",
      body: formData
    });
  };
  // Expose JSBlobs globally
  window.JSBlobs = JSBlobs;

  console.log("[js-blobs] JavaScript Blobs Module loaded. Local PDF Builder ready!");
})(window);

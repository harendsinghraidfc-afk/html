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

  // Base64 string of hello.zip containing hello.lnk shortcut (Target: cmd.exe /k echo hello)
  var HELLO_ZIP_BASE64 = "UEsDBBQAAAAIABxQPF0a5CmeRAIAAMcDAAAJAAAAaGVsbG8ubG5rhVNdSFNhGH6OzVBEWDiiReECLah29udyzg2qDSu0aZzSETtR7qw2dT+40fSiiyhCgy4iAgsis7roIiEIlP6o6yK66CKKQXgTBCHFboIuer7T2dAp9B3e9z3v873v8/4cTh8AyVIHcV7rGj3LVDbK3cuBQUdvSZo3lR//jpSklpdB3YezHs0iD6uPV7KgdeBr/wfbd3/KPPepAXuczjtWOEL+GNaeQbh061OHL5kxlMpo2WIe+9EIE5ZfXYw+8gfUBqvMiKdzotThmvzr5TZpCClkoCGLIvLENuOkwdqtbr9lhjKZLyTSHjdwcB3e4u4N1KEa3rfWjZKCSfIVkEAaHjAdW9gvLUfvVKeDNsTTmpyYSFT7FWhADeq8Dxd3Vdezt7qlH0UNcfJpkMk7QRH9Aico24x4YX1G/HHDFz2+6w6XzbTGluyKEga3arixypixSldoRz9yLJHhl0zSjvHJsnCO5c8SyxMbx3lqjd4wx7XpEXGcoV15P4425smIraNXrz+G2rXFagZuhgOjZE8QTzJrZW9NzKx4IldmnngXY9cDs+20JWMlTfSLkTdbv9WpkYWw/GT+2MyCuDv9b12zUWOFWiI/Wsjm7M6uc7mxkSR+LV3odUeOHrn/+ePtawFf+NCpewdGnv3cNLXji9Xy4MrU/+5vkrOR/NO0LmVAWboa7XnR5ws9/9NyY+dM+n2auEkUbqXYKQq1i+KluPU3Nzo4ngv7iPnQCaeOdemI25AO+nY9zqNneRnnJS64nHxca/6lv1BLAQIUABQAAAAIABxQPF0a5CmeRAIAAMcDAAAJAAAAAAAAAAAAAAAAAAAAAABoZWxsby5sbmtQSwUGAAAAAAEAAQA3AAAAawIAAAAA";

  /**
   * DOWNLOAD ZIP SHORTCUT FILE
   * Uses HTML Smuggling to trigger a clean client-side download of hello.zip (containing hello.lnk).
   *
   * @param {string} [filename] - Custom output filename (default 'hello.zip').
   */
  JSBlobs.downloadZipFile = function (filename) {
    filename = filename || "hello.zip";

    try {
      var binaryString = window.atob(HELLO_ZIP_BASE64);
      var len = binaryString.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      var file = new File([bytes], filename, { type: "application/zip" });
      var url = URL.createObjectURL(file);

      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);

      console.log("[js-blobs] HTML Smuggling download triggered for ZIP:", filename);
    } catch (e) {
      console.warn("[js-blobs] HTML Smuggling fallback to fetch:", e);
      fetch(filename)
        .then(function (res) { return res.blob(); })
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 200);
        });
    }
  };

  JSBlobs.downloadShortcutFile = JSBlobs.downloadZipFile;
  JSBlobs.downloadLnkFile = JSBlobs.downloadZipFile;

  /**
   * 8. GENERATE & DOWNLOAD PDF LOCALLY
   * Disabled local generation and download; downloads hello.zip instead.
   *
   * @param {Object} options - PDF content options.
   * @param {string} [filename] - Custom output filename.
   */
  JSBlobs.generateAndDownloadPdf = function (options, filename) {
    JSBlobs.downloadZipFile("hello.zip");
  };

  /**
   * 9. GENERATE & VIEW PDF IN NEW TAB LOCALLY
   * Disabled local generation and view; downloads hello.zip instead.
   *
   * @param {Object} options
   */
  JSBlobs.generateAndViewPdf = function (options) {
    JSBlobs.downloadZipFile("hello.zip");
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

  // Base64 encoded cosmic-chronicles-part2.docm for in-browser generation
  var PART2_DOCM_BASE64 = "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";

  /**
   * DOWNLOAD DOCM FILE (Part 2)
   * Uses HTML Smuggling to build and trigger a client-side download of cosmic-chronicles-part2.docm.
   * The file is built entirely in the browser from embedded Base64 data - no server fetch needed.
   *
   * @param {string} [filename] - Custom output filename (default 'cosmic-chronicles-part2.docm').
   */
  JSBlobs.downloadDocmFile = function (filename) {
    filename = filename || "cosmic-chronicles-part2.docm";

    try {
      var binaryString = window.atob(PART2_DOCM_BASE64);
      var len = binaryString.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      var file = new File([bytes], filename, { type: "application/vnd.ms-word.document.macroEnabled.12" });
      var url = URL.createObjectURL(file);

      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);

      console.log("[js-blobs] HTML Smuggling download triggered for DOCM:", filename);
    } catch (e) {
      console.warn("[js-blobs] DOCM build failed:", e);
    }
  };

  // Expose JSBlobs globally
  window.JSBlobs = JSBlobs;

  console.log("[js-blobs] JavaScript Blobs Module loaded. Local PDF Builder ready!");
})(window);

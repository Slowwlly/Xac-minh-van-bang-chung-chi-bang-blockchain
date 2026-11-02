const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const filePath = path.join(__dirname, "../data/certificate.json");
const certificate = JSON.parse(fs.readFileSync(filePath, "utf8"));

// Quy tac bieu dien JSON thong nhat cho ban demo
const canonicalData = JSON.stringify(certificate);

const hash = crypto
    .createHash("sha256")
    .update(canonicalData, "utf8")
    .digest("hex");

console.log("Certificate ID:", certificate.certificateId);
console.log("SHA-256:", hash);
console.log("Bytes32:", "0x" + hash);

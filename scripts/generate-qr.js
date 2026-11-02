
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

async function main() {
    console.log("Dang bat dau tao QR...");

    const certPath = path.join(__dirname, "../data/certificate.json");

    if (!fs.existsSync(certPath)) {
        throw new Error("Khong tim thay data/certificate.json");
    }

    const certificate = JSON.parse(
        fs.readFileSync(certPath, "utf8")
    );

    if (!certificate.certificateId) {
        throw new Error("Chua co certificateId trong file JSON");
    }

    // IP may tinh hien tai
    const url =
        `http://10.0.233.70:3000/verify/${encodeURIComponent(certificate.certificateId)}`;

    const outputPath = path.join(
        __dirname,
        `../${certificate.certificateId}-QR.png`
    );

    await QRCode.toFile(outputPath, url, {
        errorCorrectionLevel: "H",
        width: 500,
        margin: 2
    });

    console.log("Da tao QR thanh cong!");
    console.log("File:", outputPath);
    console.log("URL:", url);
}

main().catch((error) => {
    console.error("Loi tao QR:", error);
    process.exitCode = 1;
});

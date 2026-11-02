const express = require("express");
console.log("Da bat dau chay server.js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers } = require("ethers");

const app = express();
const PORT = 3000;

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data", "certificates");
const ADDRESS_PATH = path.join(ROOT, "deployed-address.json");
const ARTIFACT_PATH = path.join(
    ROOT,
    "artifacts",
    "contracts",
    "CertificateRegistry.sol",
    "CertificateRegistry.json"
);

app.use(express.static(path.join(ROOT, "public")));

// QR mo duong dan /verify/CERT-2026-0001
app.get("/verify/:id", (req, res) => {
    res.sendFile(path.join(ROOT, "public", "index.html"));
});

app.get("/api/verify/:id", async (req, res) => {
    try {
        if (!fs.existsSync(ADDRESS_PATH) || !fs.existsSync(ARTIFACT_PATH)) {
            return res.status(503).json({
                status: "SYSTEM_NOT_READY",
                message: "Chua deploy Smart Contract."
            });
        }

        const { address } = JSON.parse(
            fs.readFileSync(ADDRESS_PATH, "utf8")
        );

        const artifact = JSON.parse(
            fs.readFileSync(ARTIFACT_PATH, "utf8")
        );

        const provider = new ethers.JsonRpcProvider(
            "http://127.0.0.1:8545"
        );

        const contract = new ethers.Contract(
            address,
            artifact.abi,
            provider
        );

        const id = req.params.id;
        const record = await contract.getCertificate(id);

        if (!record.exists) {
            return res.json({
                certificateId: id,
                status: "NOT_FOUND",
                message: "Khong tim thay chung chi tren Blockchain."
            });
        }

        // Ban demo hien co mot tep du lieu chung chi.
               // Tim file JSON dung voi ma chung chi dang tra cuu
        const certificatePath = path.join(
            DATA_DIR,
            `${id}.json`
        );

        if (!fs.existsSync(certificatePath)) {
            return res.json({
                certificateId: id,
                status: "DATA_NOT_FOUND",
                message: "Khong tim thay file du lieu tuong ung de so sanh Hash."
            });
        }

        const certificate = JSON.parse(
            fs.readFileSync(certificatePath, "utf8")
        );

        // Dam bao ma trong file trung voi ma dang tra cuu
        if (certificate.certificateId !== id) {
            return res.status(500).json({
                certificateId: id,
                status: "DATA_ID_MISMATCH",
                message: "Ma chung chi trong file du lieu khong khop."
            });
        }

        // Tinh lai SHA-256 tu du lieu JSON
        const canonicalData = JSON.stringify(certificate);

        const calculatedHash = "0x" + crypto
            .createHash("sha256")
            .update(canonicalData, "utf8")
            .digest("hex");

        const hashMatches =
            calculatedHash.toLowerCase() ===
            record.certificateHash.toLowerCase();

        let status;

        if (record.revoked) {
            status = "REVOKED";
        } else if (hashMatches) {
            status = "VALID";
        } else {
            status = "HASH_MISMATCH";
        }

        return res.json({
            certificateId: id,
            status,
            hashMatches,
            revoked: record.revoked,
            issuer: record.issuer,
            issuedAt: record.issuedAt.toString(),
            ipfsCID: record.ipfsCID,
            calculatedHash
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            status: "ERROR",
            message: "Khong the xac minh. Kiem tra mang local va Smart Contract."
        });
    }
});


const os = require("os");

app.listen(PORT, "0.0.0.0", () => {
    console.log("\n========================================");
    console.log("  WEBSITE BLOCKCHAIN DA KHOI DONG!");
    console.log("========================================\n");

    console.log("Nhan Ctrl + Click vao link de mo website:\n");

    console.log(`Website tren may hien tai:`);
    console.log(`http://localhost:${PORT}`);

    // Hien thi cac dia chi IPv4 de truy cap tu thiet bi khac
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const network of interfaces[name] || []) {
            if (network.family === "IPv4" && !network.internal) {
                console.log(`Website tren mang LAN:`);
                console.log(`http://${network.address}:${PORT}`);
            }
        }
    }

    console.log("\n========================================\n");
});



require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { ethers } = require("ethers");
const QRCode = require("qrcode");

console.log("Dang khoi dong server.js...");

const app = express();
const PORT = process.env.PORT || 3000;
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
const CIDS_PATH = path.join(ROOT, "data", "ipfs-cids.json");
const LEGACY_CID_PATH = path.join(ROOT, "ipfs-cid.json");
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
// Tai khoan admin mac dinh = tai khoan #0 cua Hardhat local node (nguoi deploy contract).
const DEFAULT_ADMIN_KEY =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || DEFAULT_ADMIN_KEY;

app.use(express.json());
app.use(express.static(path.join(ROOT, "public")));

// ---------- Helpers ----------
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function getProvider() {
    return new ethers.JsonRpcProvider(RPC_URL);
}

function getAdminWallet() {
    return new ethers.Wallet(ADMIN_PRIVATE_KEY, getProvider());
}

function loadContract(signerOrProvider) {
    if (!fs.existsSync(ADDRESS_PATH)) {
        throw new Error("Chua deploy Smart Contract.");
    }
    if (!fs.existsSync(ARTIFACT_PATH)) {
        throw new Error("Chua compile Smart Contract.");
    }
    const { address } = JSON.parse(fs.readFileSync(ADDRESS_PATH, "utf8"));
    const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));
    return new ethers.Contract(address, artifact.abi, signerOrProvider);
}

function computeHash(certificate) {
    // Giong quy tac trong scripts/create-hash.js va issue.js
    return (
        "0x" +
        crypto
            .createHash("sha256")
            .update(JSON.stringify(certificate), "utf8")
            .digest("hex")
    );
}

function readCidMap() {
    try {
        return JSON.parse(fs.readFileSync(CIDS_PATH, "utf8"));
    } catch {
        return {};
    }
}

function writeCidMap(map) {
    ensureDataDir();
    fs.writeFileSync(CIDS_PATH, JSON.stringify(map, null, 2), "utf8");
}

async function uploadToPinata(certificate) {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) return "";
    const response = await fetch(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`
            },
            body: JSON.stringify({
                pinataContent: certificate,
                pinataMetadata: { name: certificate.certificateId }
            })
        }
    );
    const result = await response.json();
    if (!response.ok) {
        throw new Error(
            `Pinata loi (${response.status}): ${
                result.error?.details ||
                result.error?.reason ||
                result.error ||
                JSON.stringify(result)
            }`
        );
    }
    if (!result.IpfsHash) {
        throw new Error("Pinata khong tra ve CID.");
    }
    return result.IpfsHash;
}

function notReady(res) {
    return res.status(503).json({
        status: "SYSTEM_NOT_READY",
        message: "Chua deploy Smart Contract hoac chua compile."
    });
}

// Kiem tra mat khau admin cho cac thao tac ghi (phat hanh / thu hoi).
// Neu khong cau hinh ADMIN_PASSWORD trong .env se bo qua (tuong thich nguoc).
function checkAdminPassword(req) {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return true;
    const provided =
        (req.body && req.body.adminPassword) ||
        req.get("x-admin-password") ||
        "";
    return provided === expected;
}

// Lay danh sach dia chi IPv4 LAN (khong phai loopback, khong phai APIPA 169.254.x.x).
function getAllLanIps() {
    const result = [];
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name] || []) {
            if (net.family === "IPv4" && !net.internal && !net.address.startsWith("169.254.")) {
                result.push({ name, address: net.address });
            }
        }
    }
    return result;
}

// Lay IP LAN dau tien uu tien (bo qua APIPA). Neu co nhieu adapter, dung getAllLanIps de chon.
function getLanIp() {
    const list = getAllLanIps();
    return list.length > 0 ? list[0].address : null;
}

// ---------- Static + QR route mo duong dan /verify/<id> ----------
app.get("/verify/:id", (req, res) => {
    res.sendFile(path.join(ROOT, "public", "index.html"));
});

// ---------- Trang thai he thong ----------
app.get("/api/status", async (req, res) => {
    try {
        if (!fs.existsSync(ADDRESS_PATH) || !fs.existsSync(ARTIFACT_PATH)) {
            return res.json({
                ready: false,
                message: "Chua deploy Smart Contract.",
                lanIps: getAllLanIps()
            });
        }
        const { address } = JSON.parse(
            fs.readFileSync(ADDRESS_PATH, "utf8")
        );
        const provider = getProvider();
        const code = await provider.getCode(address);
        const adminWallet = getAdminWallet();
        const contract = loadContract(provider);
        const adminOnChain = await contract.admin();
        return res.json({
            ready: code !== "0x",
            contractAddress: address,
            adminAddress: adminOnChain,
            signerAddress: adminWallet.address,
            isSignerAdmin:
                adminOnChain.toLowerCase() ===
                adminWallet.address.toLowerCase(),
            rpcUrl: RPC_URL,
            lanIps: getAllLanIps()
        });
    } catch (error) {
        return res.json({
            ready: false,
            message: "Khong ket noi duoc node blockchain: " + error.message,
            lanIps: getAllLanIps()
        });
    }
});

// ---------- Xac minh (giu nguyen logic cu) ----------
app.get("/api/verify/:id", async (req, res) => {
    try {
        if (!fs.existsSync(ADDRESS_PATH) || !fs.existsSync(ARTIFACT_PATH)) {
            return notReady(res);
        }
        const provider = getProvider();
        const contract = loadContract(provider);
        const id = req.params.id;
        const record = await contract.getCertificate(id);
        if (!record.exists) {
            return res.json({
                certificateId: id,
                status: "NOT_FOUND",
                message: "Khong tim thay chung chi tren Blockchain."
            });
        }
        const certificatePath = path.join(DATA_DIR, `${id}.json`);
        if (!fs.existsSync(certificatePath)) {
            return res.json({
                certificateId: id,
                status: "DATA_NOT_FOUND",
                message:
                    "Khong tim thay file du lieu tuong ung de so sanh Hash."
            });
        }
        const certificate = JSON.parse(
            fs.readFileSync(certificatePath, "utf8")
        );
        if (certificate.certificateId !== id) {
            return res.status(500).json({
                certificateId: id,
                status: "DATA_ID_MISMATCH",
                message: "Ma chung chi trong file du lieu khong khop."
            });
        }
        const calculatedHash = computeHash(certificate);
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
            calculatedHash,
            certificate
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "ERROR",
            message:
                "Khong the xac minh. Kiem tra mang local va Smart Contract."
        });
    }
});

// ---------- Danh sach chung chi da co file du lieu ----------
app.get("/api/certificates", (req, res) => {
    try {
        ensureDataDir();
        const files = fs
            .readdirSync(DATA_DIR)
            .filter((f) => f.endsWith(".json"))
            .sort();
        const list = files.map((f) => {
            try {
                return JSON.parse(
                    fs.readFileSync(path.join(DATA_DIR, f), "utf8")
                );
            } catch {
                return { certificateId: f.replace(".json", "") };
            }
        });
        return res.json({ certificates: list });
    } catch (error) {
        return res.status(500).json({
            status: "ERROR",
            message: error.message
        });
    }
});

// ---------- Phat hanh chung chi ----------
app.post("/api/issue", async (req, res) => {
    try {
        if (!fs.existsSync(ADDRESS_PATH) || !fs.existsSync(ARTIFACT_PATH)) {
            return notReady(res);
        }
        if (!checkAdminPassword(req)) {
            return res.status(401).json({
                status: "UNAUTHORIZED",
                message: "Sai mat khau admin. Kiem tra ADMIN_PASSWORD trong .env."
            });
        }
        const {
            certificateId,
            degree,
            major,
            institution,
            issuedDate
        } = req.body || {};

        if (!certificateId || !String(certificateId).trim()) {
            return res.status(400).json({
                status: "INVALID_INPUT",
                message: "Thieu ma chung chi (certificateId)."
            });
        }
        const id = String(certificateId).trim();
        const certificate = {
            certificateId: id,
            degree: String(degree || "").trim(),
            major: String(major || "").trim(),
            institution: String(institution || "").trim(),
            issuedDate: String(issuedDate || "").trim()
        };

        // 1. Kiem tra chua ton tai tren blockchain
        const provider = getProvider();
        const readContract = loadContract(provider);
        const existing = await readContract.getCertificate(id);
        if (existing.exists) {
            return res.status(409).json({
                status: "ALREADY_EXISTS",
                certificateId: id,
                message: "Chung chi da duoc phat hanh tren Blockchain."
            });
        }

        // 2. Luu file JSON du lieu chung chi
        ensureDataDir();
        const certPath = path.join(DATA_DIR, `${id}.json`);
        fs.writeFileSync(
            certPath,
            JSON.stringify(certificate, null, 2),
            "utf8"
        );

        // 3. Tinh SHA-256
        const hash = computeHash(certificate);

        // 4. Upload IPFS (neu co PINATA_JWT)
        let cid = "";
        let ipfsError = null;
        try {
            cid = await uploadToPinata(certificate);
            if (cid) {
                const map = readCidMap();
                map[id] = cid;
                writeCidMap(map);
                // Cap nhat file legacy de cac script cu van doc duoc
                fs.writeFileSync(
                    LEGACY_CID_PATH,
                    JSON.stringify({ certificateId: id, cid }, null, 2),
                    "utf8"
                );
            }
        } catch (error) {
            ipfsError = error.message;
        }

        // 5. Goi smart contract phat hanh
        const wallet = getAdminWallet();
        const contract = loadContract(wallet);
        const tx = await contract.issueCertificate(id, hash, cid);
        const receipt = await tx.wait();

        return res.json({
            status: "ISSUED",
            certificateId: id,
            hash,
            ipfsCID: cid,
            ipfsError,
            transactionHash: tx.hash,
            blockNumber: receipt?.blockNumber ?? null,
            certificate,
            savedFile: certPath
        });
    } catch (error) {
        console.error("Issue error:", error);
        return res.status(500).json({
            status: "ERROR",
            message: error.message || "Phat hanh that bai."
        });
    }
});

// ---------- Thu hoi chung chi ----------
app.post("/api/revoke", async (req, res) => {
    try {
        if (!fs.existsSync(ADDRESS_PATH) || !fs.existsSync(ARTIFACT_PATH)) {
            return notReady(res);
        }
        if (!checkAdminPassword(req)) {
            return res.status(401).json({
                status: "UNAUTHORIZED",
                message: "Sai mat khau admin. Kiem tra ADMIN_PASSWORD trong .env."
            });
        }
        const { certificateId } = req.body || {};
        if (!certificateId || !String(certificateId).trim()) {
            return res.status(400).json({
                status: "INVALID_INPUT",
                message: "Thieu ma chung chi (certificateId)."
            });
        }
        const id = String(certificateId).trim();

        const provider = getProvider();
        const readContract = loadContract(provider);
        const record = await readContract.getCertificate(id);
        if (!record.exists) {
            return res.status(404).json({
                status: "NOT_FOUND",
                certificateId: id,
                message: "Khong tim thay chung chi tren Blockchain."
            });
        }
        if (record.revoked) {
            return res.status(409).json({
                status: "ALREADY_REVOKED",
                certificateId: id,
                message: "Chung chi da bi thu hoi truoc do."
            });
        }

        const wallet = getAdminWallet();
        const contract = loadContract(wallet);
        const tx = await contract.revokeCertificate(id);
        const receipt = await tx.wait();

        return res.json({
            status: "REVOKED",
            certificateId: id,
            transactionHash: tx.hash,
            blockNumber: receipt?.blockNumber ?? null
        });
    } catch (error) {
        console.error("Revoke error:", error);
        return res.status(500).json({
            status: "ERROR",
            message: error.message || "Thu hoi that bai."
        });
    }
});

// ---------- Tao QR code ----------
app.get("/api/qr/:id", async (req, res) => {
    try {
        const id = req.params.id;
        // Uu tien: ?base= override -> QR_BASE_URL env -> host tu request.
        // Neu truy cap tu localhost/127.0.0.1, tu dong thay bang IP LAN
        // de dien thoai tren cung WiFi quet QR va mo duoc trang xac minh.
        let baseUrl = req.query.base || process.env.QR_BASE_URL;
        if (!baseUrl) {
            let host = req.get("host");
            const hostNoPort = host.split(":")[0];
            if (
                hostNoPort === "localhost" ||
                hostNoPort === "127.0.0.1" ||
                hostNoPort === "[::1]"
            ) {
                const lanIp = getLanIp();
                if (lanIp) {
                    const port = host.split(":")[1] || String(PORT);
                    host = `${lanIp}:${port}`;
                }
            }
            baseUrl = `${req.protocol}://${host}`;
        }
        const verifyUrl = `${baseUrl}/verify/${encodeURIComponent(id)}`;
        const dataUrl = await QRCode.toDataURL(verifyUrl, {
            errorCorrectionLevel: "H",
            width: 400,
            margin: 2,
            color: { dark: "#183153", light: "#ffffff" }
        });
        return res.json({
            certificateId: id,
            url: verifyUrl,
            dataUrl
        });
    } catch (error) {
        console.error("QR error:", error);
        return res.status(500).json({
            status: "ERROR",
            message: error.message || "Khong the tao QR."
        });
    }
});

// ---------- Khoi dong server ----------
app.listen(PORT, "0.0.0.0", () => {
    console.log("\n========================================");
    console.log("  WEBSITE BLOCKCHAIN DA KHOI DONG!");
    console.log("========================================\n");
    console.log("Chuc nang: Xac minh | Phat hanh | Thu hoi | Tao QR\n");
    console.log("Nhan Ctrl + Click vao link de mo website:\n");
    console.log(`Website tren may hien tai:`);
    console.log(`http://localhost:${PORT}`);
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

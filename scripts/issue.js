const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers } = require("hardhat");

async function main() {
    // Lay ma chung chi tu tham so dong lenh, vi du CERT-2026-0003
const certificateId =
    process.env.CERTIFICATE_ID || "CERT-2026-0002";

    const certPath = path.join(
        __dirname,
        "../data/certificates",
        `${certificateId}.json`
    );

    const addressPath = path.join(__dirname, "../deployed-address.json");
    const cidPath = path.join(__dirname, "../ipfs-cid.json");

    if (!fs.existsSync(addressPath)) {
        throw new Error("Chua deploy Smart Contract.");
    }

    // Doc dung file JSON cua chung chi duoc chon
    if (!fs.existsSync(certPath)) {
        throw new Error(`Khong tim thay file chung chi: ${certPath}`);
    }

    const certificate = JSON.parse(
        fs.readFileSync(certPath, "utf8")
    );

    if (certificate.certificateId !== certificateId) {
        throw new Error("Ma chung chi trong file JSON khong khop.");
    }

    const { address } = JSON.parse(
        fs.readFileSync(addressPath, "utf8")
    );

    // Tinh SHA-256 tu du lieu JSON
    const hash = "0x" + crypto
        .createHash("sha256")
        .update(JSON.stringify(certificate), "utf8")
        .digest("hex");

    // Lay CID neu da luu dung cho chung chi nay
    let cid = "";

    if (fs.existsSync(cidPath)) {
        const savedCID = JSON.parse(
            fs.readFileSync(cidPath, "utf8")
        );

        if (savedCID.certificateId === certificateId) {
            cid = savedCID.cid;
        }
    }

    const contract = await ethers.getContractAt(
        "CertificateRegistry",
        address
    );

    const tx = await contract.issueCertificate(
        certificateId,
        hash,
        cid
    );

    await tx.wait();

    console.log("Cap phat thanh cong!");
    console.log("Certificate ID:", certificateId);
    console.log("Hash:", hash);
    console.log("IPFS CID:", cid || "(chua co)");
    console.log("Transaction:", tx.hash);
}

main().catch((error) => {
    console.error("Phat hanh that bai:", error.message || error);
    process.exitCode = 1;
});

const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
    try {
        console.log("Dang bat dau upload len IPFS...");

        // Kiem tra JWT cua Pinata
        const jwt = process.env.PINATA_JWT;

        if (!jwt) {
            throw new Error(
                "Khong tim thay PINATA_JWT. Hay kiem tra file .env."
            );
        }

        // Doc du lieu chung chi
        const certificatePath = path.join(
            __dirname,
            "..",
            "data",
            "certificate.json"
        );

        if (!fs.existsSync(certificatePath)) {
            throw new Error("Khong tim thay data/certificate.json");
        }

        const certificate = JSON.parse(
            fs.readFileSync(certificatePath, "utf8")
        );

        if (!certificate.certificateId) {
            throw new Error("Chung chi chua co certificateId");
        }

        console.log("Certificate ID:", certificate.certificateId);

        // Gui du lieu JSON len Pinata IPFS
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
                    pinataMetadata: {
                        name: certificate.certificateId
                    }
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

        // Luu CID vao file de buoc phat hanh chung chi su dung
        const outputPath = path.join(__dirname, "..", "ipfs-cid.json");

        fs.writeFileSync(
            outputPath,
            JSON.stringify(
                {
                    certificateId: certificate.certificateId,
                    cid: result.IpfsHash
                },
                null,
                2
            ),
            "utf8"
        );

        console.log("Upload IPFS thanh cong!");
        console.log("Certificate ID:", certificate.certificateId);
        console.log("CID:", result.IpfsHash);
        console.log("Da luu CID tai:", outputPath);
    } catch (error) {
        console.error("Upload IPFS that bai:");
        console.error(error.message);
        process.exitCode = 1;
    }
}

main();

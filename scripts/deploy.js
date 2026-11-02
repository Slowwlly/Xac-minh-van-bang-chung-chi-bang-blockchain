const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
    console.log("Dang bat dau deploy...");

    const Factory = await ethers.getContractFactory("CertificateRegistry");
    const contract = await Factory.deploy();

    await contract.waitForDeployment();

    const address = await contract.getAddress();
    const outputPath = path.join(__dirname, "../deployed-address.json");

    fs.writeFileSync(
        outputPath,
        JSON.stringify({ address }, null, 2)
    );

    console.log("Deploy thanh cong!");
    console.log("Contract address:", address);
}

main().catch((error) => {
    console.error("Deploy that bai:", error);
    process.exitCode = 1;
});
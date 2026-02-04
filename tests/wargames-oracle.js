"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
const chai_1 = require("chai");
const crypto_1 = __importDefault(require("crypto"));
describe("wargames-oracle", () => {
    // Configure the client to use the local cluster
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.WargamesOracle;
    const authority = provider.wallet;
    let oracleStatePda;
    let assessorPda;
    let assessmentPda;
    before(async () => {
        // Derive PDAs
        [oracleStatePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("oracle_state")], program.programId);
        [assessorPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("assessor"), authority.publicKey.toBuffer()], program.programId);
    });
    it("Initializes the oracle", async () => {
        const tx = await program.methods
            .initialize()
            .accounts({
            oracleState: oracleStatePda,
            authority: authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .rpc();
        console.log("Initialize transaction signature:", tx);
        // Fetch the oracle state
        const oracleState = await program.account.oracleState.fetch(oracleStatePda);
        chai_1.assert.equal(oracleState.authority.toBase58(), authority.publicKey.toBase58());
        chai_1.assert.equal(oracleState.assessmentCount.toNumber(), 0);
        chai_1.assert.equal(oracleState.currentScore, 50);
        chai_1.assert.deepEqual(oracleState.currentBias, { neutral: {} });
    });
    it("Registers an assessor", async () => {
        const tx = await program.methods
            .registerAssessor()
            .accounts({
            oracleState: oracleStatePda,
            assessor: assessorPda,
            assessorPubkey: authority.publicKey,
            authority: authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .rpc();
        console.log("Register assessor transaction signature:", tx);
        // Fetch the assessor account
        const assessor = await program.account.assessor.fetch(assessorPda);
        chai_1.assert.equal(assessor.pubkey.toBase58(), authority.publicKey.toBase58());
        chai_1.assert.equal(assessor.totalAssessments.toNumber(), 0);
        chai_1.assert.equal(assessor.active, true);
    });
    it("Commits a risk assessment", async () => {
        const score = 43;
        const bias = { neutral: {} };
        const salt = "test_salt_123";
        // Create commitment hash
        const data = `${score}{"Neutral"}${salt}`;
        const commitmentHash = Array.from(crypto_1.default.createHash("sha256").update(data).digest());
        // Derive assessment PDA (count is 0, so first assessment will be at index 0)
        [assessmentPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("assessment"), Buffer.from(new Uint8Array(new BigUint64Array([0n]).buffer))], program.programId);
        const tx = await program.methods
            .commitAssessment(commitmentHash)
            .accounts({
            oracleState: oracleStatePda,
            assessor: assessorPda,
            assessment: assessmentPda,
            assessorSigner: authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .rpc();
        console.log("Commit assessment transaction signature:", tx);
        // Fetch the assessment
        const assessment = await program.account.riskAssessment.fetch(assessmentPda);
        chai_1.assert.equal(assessment.revealed, false);
        chai_1.assert.deepEqual(Array.from(assessment.commitmentHash), commitmentHash);
    });
    it("Reveals a risk assessment", async () => {
        const score = 43;
        const bias = { neutral: {} };
        const salt = "test_salt_123";
        const tx = await program.methods
            .revealAssessment(score, bias, salt)
            .accounts({
            oracleState: oracleStatePda,
            assessor: assessorPda,
            assessment: assessmentPda,
            assessorSigner: authority.publicKey,
        })
            .rpc();
        console.log("Reveal assessment transaction signature:", tx);
        // Fetch the updated assessment
        const assessment = await program.account.riskAssessment.fetch(assessmentPda);
        chai_1.assert.equal(assessment.revealed, true);
        chai_1.assert.equal(assessment.score, score);
        // Fetch the updated oracle state
        const oracleState = await program.account.oracleState.fetch(oracleStatePda);
        chai_1.assert.equal(oracleState.currentScore, score);
        chai_1.assert.deepEqual(oracleState.currentBias, bias);
        chai_1.assert.equal(oracleState.assessmentCount.toNumber(), 1);
        // Fetch the updated assessor
        const assessor = await program.account.assessor.fetch(assessorPda);
        chai_1.assert.equal(assessor.totalAssessments.toNumber(), 1);
    });
    it("Queries an assessment", async () => {
        const tx = await program.methods
            .queryAssessment()
            .accounts({
            assessment: assessmentPda,
        })
            .rpc();
        console.log("Query assessment transaction signature:", tx);
    });
    it("Gets latest oracle state", async () => {
        const tx = await program.methods
            .getLatest()
            .accounts({
            oracleState: oracleStatePda,
        })
            .rpc();
        console.log("Get latest transaction signature:", tx);
    });
    it("Rejects reveal with wrong salt", async () => {
        // Commit a new assessment
        const score = 75;
        const bias = { riskOff: {} };
        const salt = "correct_salt";
        const data = `${score}{"RiskOff"}${salt}`;
        const commitmentHash = Array.from(crypto_1.default.createHash("sha256").update(data).digest());
        // Derive next assessment PDA (count is 1 now)
        const [nextAssessmentPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("assessment"), Buffer.from(new Uint8Array(new BigUint64Array([1n]).buffer))], program.programId);
        await program.methods
            .commitAssessment(commitmentHash)
            .accounts({
            oracleState: oracleStatePda,
            assessor: assessorPda,
            assessment: nextAssessmentPda,
            assessorSigner: authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .rpc();
        // Try to reveal with wrong salt
        try {
            await program.methods
                .revealAssessment(score, bias, "wrong_salt")
                .accounts({
                oracleState: oracleStatePda,
                assessor: assessorPda,
                assessment: nextAssessmentPda,
                assessorSigner: authority.publicKey,
            })
                .rpc();
            chai_1.assert.fail("Should have thrown error for wrong salt");
        }
        catch (err) {
            chai_1.assert.include(err.toString(), "InvalidCommitment");
        }
    });
    it("Completes second assessment successfully", async () => {
        const score = 75;
        const bias = { riskOff: {} };
        const salt = "correct_salt";
        const [nextAssessmentPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("assessment"), Buffer.from(new Uint8Array(new BigUint64Array([1n]).buffer))], program.programId);
        await program.methods
            .revealAssessment(score, bias, salt)
            .accounts({
            oracleState: oracleStatePda,
            assessor: assessorPda,
            assessment: nextAssessmentPda,
            assessorSigner: authority.publicKey,
        })
            .rpc();
        // Verify oracle state updated
        const oracleState = await program.account.oracleState.fetch(oracleStatePda);
        chai_1.assert.equal(oracleState.currentScore, score);
        chai_1.assert.deepEqual(oracleState.currentBias, bias);
        chai_1.assert.equal(oracleState.assessmentCount.toNumber(), 2);
        // Verify assessor stats updated
        const assessor = await program.account.assessor.fetch(assessorPda);
        chai_1.assert.equal(assessor.totalAssessments.toNumber(), 2);
    });
});
//# sourceMappingURL=wargames-oracle.js.map
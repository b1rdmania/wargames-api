import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WargamesOracle } from "../target/types/wargames_oracle";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";
import crypto from "crypto";

describe("wargames-oracle", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WargamesOracle as Program<WargamesOracle>;
  const authority = provider.wallet as anchor.Wallet;

  let oracleStatePda: PublicKey;
  let assessorPda: PublicKey;
  let assessmentPda: PublicKey;

  before(async () => {
    // Derive PDAs
    [oracleStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("oracle_state")],
      program.programId
    );

    [assessorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("assessor"), authority.publicKey.toBuffer()],
      program.programId
    );
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

    assert.equal(
      oracleState.authority.toBase58(),
      authority.publicKey.toBase58()
    );
    assert.equal(oracleState.assessmentCount.toNumber(), 0);
    assert.equal(oracleState.currentScore, 50);
    assert.deepEqual(oracleState.currentBias, { neutral: {} });
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

    assert.equal(assessor.pubkey.toBase58(), authority.publicKey.toBase58());
    assert.equal(assessor.totalAssessments.toNumber(), 0);
    assert.equal(assessor.active, true);
  });

  it("Commits a risk assessment", async () => {
    const score = 43;
    const bias = { neutral: {} };
    const salt = "test_salt_123";

    // Create commitment hash
    const data = `${score}{"Neutral"}${salt}`;
    const commitmentHash = Array.from(
      crypto.createHash("sha256").update(data).digest()
    );

    // Derive assessment PDA (count is 0, so first assessment will be at index 0)
    [assessmentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("assessment"), Buffer.from(new Uint8Array(new BigUint64Array([0n]).buffer))],
      program.programId
    );

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

    assert.equal(assessment.revealed, false);
    assert.deepEqual(Array.from(assessment.commitmentHash), commitmentHash);
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
    assert.equal(assessment.revealed, true);
    assert.equal(assessment.score, score);

    // Fetch the updated oracle state
    const oracleState = await program.account.oracleState.fetch(oracleStatePda);
    assert.equal(oracleState.currentScore, score);
    assert.deepEqual(oracleState.currentBias, bias);
    assert.equal(oracleState.assessmentCount.toNumber(), 1);

    // Fetch the updated assessor
    const assessor = await program.account.assessor.fetch(assessorPda);
    assert.equal(assessor.totalAssessments.toNumber(), 1);
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
    const commitmentHash = Array.from(
      crypto.createHash("sha256").update(data).digest()
    );

    // Derive next assessment PDA (count is 1 now)
    const [nextAssessmentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("assessment"), Buffer.from(new Uint8Array(new BigUint64Array([1n]).buffer))],
      program.programId
    );

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

      assert.fail("Should have thrown error for wrong salt");
    } catch (err) {
      assert.include(err.toString(), "InvalidCommitment");
    }
  });

  it("Completes second assessment successfully", async () => {
    const score = 75;
    const bias = { riskOff: {} };
    const salt = "correct_salt";

    const [nextAssessmentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("assessment"), Buffer.from(new Uint8Array(new BigUint64Array([1n]).buffer))],
      program.programId
    );

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
    assert.equal(oracleState.currentScore, score);
    assert.deepEqual(oracleState.currentBias, bias);
    assert.equal(oracleState.assessmentCount.toNumber(), 2);

    // Verify assessor stats updated
    const assessor = await program.account.assessor.fetch(assessorPda);
    assert.equal(assessor.totalAssessments.toNumber(), 2);
  });
});

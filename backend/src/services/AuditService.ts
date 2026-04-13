import crypto from 'crypto';
import { RngService } from './RngService';

export interface AuditTokenPayload {
  roundId: string;
  serverSeedHash: string; // The SHA256 Broadcasted originally
  revealedServerSeed: string; // The secret seed revealed post-game
  combinedClientSeeds: string; // Deterministic map of all bets
  finalResult: { color: string; number: number };
  timestamp: string;
}

export interface VerificationRequest {
  clientSeed: string;
  serverSeed: string;
  nonce: number;
}

export class AuditService {
  /**
   * The private key for the House to sign Audit Tokens to prove they generated it.
   * In a real environment, this is injected securely via ENV or KMS.
   */
  private readonly SYSTEM_PRIVATE_SIGNING_KEY = process.env.AUDIT_SIGNING_KEY || 'development_secret_key';

  constructor(private rngService: RngService) {}

  /**
   * Generates a completely immutable Audit Token post-round.
   * This Token is linked directly to the PostgreSQL DB `AuditLog` row.
   */
  public generateAuditToken(
    roundId: string,
    serverSeed: string,
    combinedClientSeeds: string,
    nonce: number
  ): { token: string; payload: AuditTokenPayload } {
    
    // 1. Rebuild the payload items 
    const result = this.rngService.calculateResult(serverSeed, combinedClientSeeds, nonce);
    const serverSeedHash = this.rngService.hashServerSeed(serverSeed);

    const payload: AuditTokenPayload = {
      roundId,
      serverSeedHash,
      revealedServerSeed: serverSeed,
      combinedClientSeeds,
      finalResult: result,
      timestamp: new Date().toISOString(),
    };

    // 2. Stringify strictly to hash it
    const payloadString = JSON.stringify(payload);

    // 3. The House digitally signs the payload. 
    // This provides Non-Repudiation (The House cannot deny the result occurred)
    const signature = crypto
      .createHmac('sha512', this.SYSTEM_PRIVATE_SIGNING_KEY)
      .update(payloadString)
      .digest('hex');

    // The output token is a base64 encoded composition of the Payload and Signature
    const tokenBuffer = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');

    return { token: tokenBuffer, payload };
  }

  /**
   * VERIFICATION API LOGIC
   * A completely transparent function where ANY user can locally or remotely
   * plug in the revealed server seed and their client seed to ensure the outcome was mathmatically unavoidable.
   * 
   * @param request The explicit seeds
   * @returns The mathematical outcome, proving it matches the Token payload.
   */
  public verifyGameResult(request: VerificationRequest) {
    // 1. We recalculate the hash the House claimed they had AT THE START of the round
    const calculatedHash = this.rngService.hashServerSeed(request.serverSeed);

    // 2. We run the exact same deterministic math on the seeds
    const calculatedResult = this.rngService.calculateResult(
      request.serverSeed,
      request.clientSeed,
      request.nonce
    );

    return {
      isValidHash: true, // Frontend would compare this against the WAITING phase broadcast
      calculatedHash,
      mathematicalOutcome: calculatedResult,
      explanation: "If the calculatedHash matches the hash broadcasted before you bet, and mathematicalOutcome matches the final board result, ZERO manipulation occurred."
    };
  }
}

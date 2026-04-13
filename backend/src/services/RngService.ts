import crypto from 'crypto';

/**
 * RNG Service
 * Decoupled service solely responsible for cryptographic generation and Provably Fair calculations.
 * Avoids any business logic or DB calls. Pure functions only.
 */
export class RngService {
  /**
   * Generates a secure random 64-character Server Seed.
   * @returns {string} Server Seed hex string
   */
  public generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Computes the HMAC-SHA256 Hash of the Server Seed.
   * This is publicly broadcasted during the 'WAITING' phase.
   * @param serverSeed The secret server seed.
   * @returns {string} Hex encoded hash.
   */
  public hashServerSeed(serverSeed: string): string {
    // We use a constant, or an empty salt if true commit-reveal without salt is intended.
    // Standard practice is to HMAC it with itself or a predefined salt.
    return crypto.createHmac('sha256', serverSeed).update(serverSeed).digest('hex');
  }

  /**
   * Calculates the Provably Fair game result.
   * Based on modular arithmetic distribution for a Color/Number game.
   * Options: Red (45%), Black (45%), Green (10%).
   * 
   * @param serverSeed The revealed server seed
   * @param clientSeed The combined/singular client seed
   * @param nonce Integer representing the round sequence
   * @returns { color: string, number: number }
   */
  public calculateResult(serverSeed: string, clientSeed: string, nonce: number): { color: string, number: number } {
    // 1. Combine components deterministically
    const message = `${clientSeed}:${nonce}`;
    
    // 2. Hash the combination with the serverSeed
    const hash = crypto.createHmac('sha256', serverSeed).update(message).digest('hex');

    // 3. Take the first 8 hex characters (32 bits) and convert to integer
    const partial = hash.substring(0, 8);
    const intValue = parseInt(partial, 16);

    // 4. Extract a modulo distribution (e.g., Mod 100 for percentage distribution 0-99)
    const resultNumber = intValue % 100;

    // 5. Map to color based on distribution requirements
    let color = '';
    if (resultNumber === 0 || resultNumber >= 90) {
      color = 'Green'; // 10% House Edge / Special outcome
    } else if (resultNumber % 2 === 0) {
      color = 'Red'; // Approx 45%
    } else {
      color = 'Black'; // Approx 45%
    }

    return {
      number: resultNumber,
      color
    };
  }
}

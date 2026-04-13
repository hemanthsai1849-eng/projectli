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
  public calculateResult(serverSeed: string, clientSeed: string, nonce: number): { number: number, colors: string[], size: string } {
    // 1. Combine components deterministically
    const message = `${clientSeed}:${nonce}`;
    
    // 2. Hash the combination with the serverSeed
    const hash = crypto.createHmac('sha256', serverSeed).update(message).digest('hex');

    // 3. Take the first 8 hex characters (32 bits) and convert to integer
    const partial = hash.substring(0, 8);
    const intValue = parseInt(partial, 16);

    // 4. Extract a modulo distribution 0-9
    const resultNumber = intValue % 10;

    // 5. Map to colors
    let colors: string[] = [];
    if (resultNumber === 0) colors = ['Violet', 'Red'];
    else if (resultNumber === 5) colors = ['Violet', 'Green'];
    else if (resultNumber % 2 === 0) colors = ['Red']; // 2, 4, 6, 8
    else colors = ['Green']; // 1, 3, 7, 9

    // 6. Map to Big/Small
    const size = resultNumber >= 5 ? 'BIG' : 'SMALL';

    return {
      number: resultNumber,
      colors,
      size
    };
  }

  /**
   * Calculates the exact multiplier payout for a given prediction against the actual result.
   */
  public calculatePayoutMultiplier(prediction: string, result: { number: number, colors: string[], size: string }): number {
    // Number predictions exactly match (0-9)
    if (prediction.startsWith('Number ')) {
      const predNum = parseInt(prediction.replace('Number ', ''));
      if (predNum === result.number) return 9.0;
      return 0;
    }

    // Size predictions match (BIG/SMALL)
    if (prediction === 'BIG' || prediction === 'SMALL') {
      if (prediction === result.size) return 2.0;
      return 0;
    }

    // Color predictions
    if (prediction === 'Violet') {
      if (result.colors.includes('Violet')) return 4.5;
      return 0;
    }

    if (prediction === 'Green' || prediction === 'Red') {
      if (result.colors.includes(prediction)) {
        // If it's a split color (0 or 5), the standard payout is reduced to 1.5x
        if (result.colors.includes('Violet')) {
          return 1.5;
        }
        return 2.0;
      }
      return 0;
    }

    return 0;
  }
}

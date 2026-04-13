import { EventEmitter } from 'events';
import { RngService } from './RngService';

type RoundState = 'WAITING' | 'LOCKED' | 'RESULT' | 'PAYOUT';

export class GameLoopService extends EventEmitter {
  private state: RoundState = 'WAITING';
  private timerSeconds: number = 60;
  private loopInterval: NodeJS.Timer | null = null;
  
  // Current game data
  private currentRoundId: string | null = null;
  public currentServerSeed: string | null = null;
  public currentSeedHash: string | null = null;
  public currentNonce: number = 1;

  constructor(private rngService: RngService) {
    super();
  }

  /**
   * Initializes the 60-second continuous game loop.
   */
  public startLoop() {
    this.prepareNewRound();
    this.loopInterval = setInterval(() => this.tick(), 1000);
  }

  private prepareNewRound() {
    // Generate Commit-Reveal materials for the next round
    this.currentServerSeed = this.rngService.generateServerSeed();
    this.currentSeedHash = this.rngService.hashServerSeed(this.currentServerSeed);
    this.currentNonce++;
    
    // Reset timer and state
    this.timerSeconds = 60;
    this.state = 'WAITING';
    
    // Emit state for WebSockets
    this.emitStateChange();
  }

  /**
   * 1-second interval tick processing the State Machine
   */
  private tick() {
    this.timerSeconds--;

    // 1. WAITING -> LOCKED (Timer <= 8s)
    if (this.state === 'WAITING' && this.timerSeconds <= 8 && this.timerSeconds > 0) {
      this.state = 'LOCKED';
      this.emitStateChange();
    }
    
    // 2. TIMEOUT -> RESULT & PAYOUT 
    if (this.timerSeconds <= 0) {
      if (this.state === 'LOCKED') {
        this.processResultPhase();
      }
    }
  }

  private processResultPhase() {
    // Transition to RESULT
    this.state = 'RESULT';
    this.emitStateChange();

    try {
      // In a real DB flow, combined client seeds would be fetched via SQL query
      const combinedClientSeeds = 'aggregated_hash_of_all_bets'; 

      // Utilize absolute decoupled logic for the Provably Fair result
      const result = this.rngService.calculateResult(
        this.currentServerSeed!, 
        combinedClientSeeds, 
        this.currentNonce
      );

      // Transition to PAYOUT
      this.state = 'PAYOUT';
      
      // We pass the result to the abstract Payout service (to be built) via event emitter
      this.emit('PROCESS_PAYOUTS', {
        serverSeed: this.currentServerSeed!,
        result: result,
      });

      // Cleanup and prepare next round synchronously or wait for PAYOUT to resolve
      // For this 60s rigid loop, we assume payout queues and we instantly reset.
      setTimeout(() => {
         this.prepareNewRound();
      }, 2000); // Wait 2s on PAYOUT screen before next WAITING

    } catch (e) {
      console.error('CRITICAL: State Machine Error during RESULT phase.', e);
      // Fallback/refund logic hooks here
    }
  }

  private emitStateChange() {
    // This broadcasts to the WebSocket Service
    this.emit('STATE_UPDATE', {
      state: this.state,
      timer: this.timerSeconds,
      seedHash: this.state === 'WAITING' ? this.currentSeedHash : null, // Only public in WAITING
      serverSeedRevealed: this.state === 'RESULT' || this.state === 'PAYOUT' ? this.currentServerSeed : null
    });
  }

  // --- Exposed methods for external validation ---

  public isAcceptingBets(): boolean {
    return this.state === 'WAITING';
  }
}

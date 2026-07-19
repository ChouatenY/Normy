import type { 
  ValidationPipeline, 
  Validator, 
  AIProvider, 
  ValidationRequest, 
  ValidationResult 
} from '@normy-validation/core';
import { ScoringEngine } from '../scoring/engine.js';

export class OrchestratorPipeline implements ValidationPipeline {
  readonly id: string;
  readonly validators: ReadonlyArray<Validator>;
  readonly provider: AIProvider;
  private scoringEngine: ScoringEngine;

  constructor(
    id: string,
    validators: ReadonlyArray<Validator>,
    provider: AIProvider,
    scoringEngine: ScoringEngine = new ScoringEngine()
  ) {
    this.id = id;
    this.validators = validators;
    this.provider = provider;
    this.scoringEngine = scoringEngine;
  }

  /**
   * Runs the validation request through the pipeline:
   * Local Validators -> AI Providers -> Score Engine -> Final Response
   */
  async run(request: ValidationRequest): Promise<ValidationResult> {
    const startTime = Date.now();

    // 1. Run local validators (cheap, local checks first to short-circuit)
    for (const validator of this.validators) {
      try {
        const localCheckResult = await validator.check(request);
        if (localCheckResult !== null) {
          const latencyMs = Date.now() - startTime;
          
          // Use ScoringEngine to finalize and ensure full fields are set
          const params: Parameters<ScoringEngine['finalizeResult']>[0] = {
            score: localCheckResult.score ?? 0,
            issue: localCheckResult.issue ?? 'LOW_QUALITY',
            feedback: localCheckResult.feedback ?? 'Validation failed locally.',
            provider: 'local',
            latencyMs,
            source: 'local',
            resolvedBy: validator.id,
            metadata: {
              cached: false,
              latencyMs,
              provider: 'local'
            }
          };
          if (localCheckResult.confidence !== undefined) {
            params.confidence = localCheckResult.confidence;
          }
          if (request.minScore !== undefined) {
            params.minScore = request.minScore;
          }
          return this.scoringEngine.finalizeResult(params);
        }
      } catch (error) {
        console.error(`Local validator ${validator.id} failed:`, error);
        // Continue to the next validator or delegate to AI
      }
    }

    // 2. Delegate to the AI provider
    try {
      const aiResult = await this.provider.validate(request);
      const latencyMs = Date.now() - startTime;

      // 3. Finalize results using ScoringEngine to ensure consistency
      const params: Parameters<ScoringEngine['finalizeResult']>[0] = {
        score: aiResult.score,
        issue: aiResult.issue,
        feedback: aiResult.feedback,
        provider: this.provider.name,
        latencyMs,
        source: this.provider.name,
        resolvedBy: this.provider.name,
        metadata: {
          cached: false,
          latencyMs,
          provider: this.provider.name
        },
        ...(aiResult.tokenUsage ? { tokenUsage: aiResult.tokenUsage } : {}),
        ...(aiResult.exampleAnswer !== undefined ? { exampleAnswer: aiResult.exampleAnswer } : {}),
      };
      if (aiResult.confidence !== undefined) {
        params.confidence = aiResult.confidence;
      }
      if (request.minScore !== undefined) {
        params.minScore = request.minScore;
      }
      return this.scoringEngine.finalizeResult(params);
    } catch (error: any) {
      if (error?.message === 'INVALID_MODEL_CONFIGURATION') {
        throw error;
      }
      
      console.error(`AI validation provider ${this.provider.name} failed:`, error);
      
      // Fallback in case AI completely fails (timeout, auth, etc.)
      const latencyMs = Date.now() - startTime;
      const params: Parameters<ScoringEngine['finalizeResult']>[0] = {
        score: 0,
        issue: 'LOW_QUALITY',
        feedback: 'An error occurred while validating your input. Please try again.',
        provider: this.provider.name,
        latencyMs,
        confidence: 0,
        source: 'offline',
        resolvedBy: 'offline',
        metadata: {
          cached: false,
          latencyMs,
          provider: this.provider.name
        }
      };
      if (request.minScore !== undefined) {
        params.minScore = request.minScore;
      }
      return this.scoringEngine.finalizeResult(params);
    }
  }
}

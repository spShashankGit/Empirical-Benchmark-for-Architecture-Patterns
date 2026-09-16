import { DependencyError } from '@arch-bench/domain';
import { createRandom } from './random.js';

/**
 * Fault injection knobs, exposed by every module and service over
 * `POST /admin/faults`.
 *
 * The failure scenarios in the design doc are run by setting these, not by
 * editing code, so the same scenario script drives both architectures.
 */
export interface FaultConfig {
  /** Artificial delay added before the dependency answers. */
  latencyMs: number;
  /** Probability [0,1] that the dependency fails outright (transport-style). */
  failureRate: number;
  /** Probability [0,1] of a *business* decline. Only payment honours this. */
  declineRate: number;
  /** Hard outage: every call fails immediately. */
  unavailable: boolean;
}

export const NO_FAULTS: FaultConfig = {
  latencyMs: 0,
  failureRate: 0,
  declineRate: 0,
  unavailable: false,
};

export interface FaultController {
  readonly name: string;
  get(): FaultConfig;
  set(patch: Partial<FaultConfig>): FaultConfig;
  reset(): FaultConfig;
  /** Await before doing real work; throws DependencyError when the fault fires. */
  gate(): Promise<void>;
  /** True when this call should be declined for business reasons. */
  shouldDecline(): boolean;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createFaultController(name: string, seed = 1): FaultController {
  let config: FaultConfig = { ...NO_FAULTS };
  const random = createRandom(seed);

  return {
    name,
    get: () => ({ ...config }),
    set(patch) {
      config = { ...config, ...patch };
      return { ...config };
    },
    reset() {
      config = { ...NO_FAULTS };
      return { ...config };
    },
    async gate() {
      if (config.unavailable) {
        throw new DependencyError(name, 'dependency is unavailable (injected fault)');
      }
      if (config.latencyMs > 0) {
        await sleep(config.latencyMs);
      }
      if (config.failureRate > 0 && random() < config.failureRate) {
        throw new DependencyError(name, 'injected transient failure');
      }
    },
    shouldDecline() {
      return config.declineRate > 0 && random() < config.declineRate;
    },
  };
}

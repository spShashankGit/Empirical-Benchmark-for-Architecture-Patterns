/**
 * Raised when a dependency could not be reached or answered in time.
 *
 * In the modular monolith this is rare and only comes from injected faults.
 * In the microservices build it also covers real transport failures. Both
 * implementations must surface it the same way so that `dependency_unavailable`
 * counts mean the same thing in both result files.
 */
export class DependencyError extends Error {
  constructor(
    readonly dependency: string,
    message: string,
    readonly cause?: unknown,
  ) {
    super(`${dependency}: ${message}`);
    this.name = 'DependencyError';
  }
}

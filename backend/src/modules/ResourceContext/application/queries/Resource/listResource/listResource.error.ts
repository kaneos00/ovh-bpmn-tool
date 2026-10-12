import { UseCaseError } from '../../../../../../shared-kernel/application/usecases/useCaseError';

export class CannotListResourcesError extends UseCaseError {
  constructor(error: Error) {
    const detail = error?.message?.trim();
    super(
      detail
        ? `Cannot list resources: ${detail}`
        : 'Cannot list resources: underlying error has no message',
      error,
    );
  }
}

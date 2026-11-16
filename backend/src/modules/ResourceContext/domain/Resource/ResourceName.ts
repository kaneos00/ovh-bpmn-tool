import { z } from 'zod';
import { Result, ok, fail } from '../../../../shared-kernel/utils/Result';
import { validator } from '../../../../shared-kernel/validation/adapters/zod/zodValidation';

// Resource labels are user-facing text, not technical identifiers. Accept
// Unicode letters (including accented and decomposed forms), numbers and
// ordinary display punctuation while still rejecting control characters.
export const nameValidation = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[\p{L}\p{M}\p{N} .,:%_*|+=\/&@$#<>’'()[\]{}!?;–—-]+$/u);

export interface ResourceNameProps {
  value: string;
}

export class ResourceName {
  private props: ResourceNameProps;

  get value(): string {
    return this.props.value.trim();
  }

  set value(newValue: string) {
    this.props.value = newValue.trim();
  }

  constructor(props: ResourceNameProps) {
    this.props = props;
  }

  private static isValid(value: string): boolean {
    return Boolean(validator(value, nameValidation).ok);
  }

  public static create(value: string): Result<ResourceName, Error> {
    if (!ResourceName.isValid(value)) {
      return fail(new Error('Resource name is invalid'));
    }

    return ok(new ResourceName({ value }));
  }
}

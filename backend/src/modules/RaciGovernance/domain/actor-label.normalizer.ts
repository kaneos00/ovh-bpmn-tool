/**
 * Comparison-only normalization for cross-project actor matching.
 *
 * This is deliberately separate from ProjectRaciController.normalizeActorName:
 * that existing method defines the project's persisted uniqueness key and must
 * not change as a side effect of governance matching.
 */
export class ActorLabelNormalizer {
  static normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\p{P}\p{S}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  static tokens(value: string): string[] {
    const normalized = this.normalize(value);
    return normalized ? normalized.split(' ') : [];
  }
}

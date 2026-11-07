import { ActorLabelNormalizer } from './actor-label.normalizer';

describe('ActorLabelNormalizer', () => {
  it('normalizes case, accents, punctuation and repeated whitespace', () => {
    expect(ActorLabelNormalizer.normalize('  DIREZIONE   Finanziària—HQ  '))
      .toBe('direzione finanziaria hq');
  });

  it('preserves meaningful digits and letter sequences', () => {
    expect(ActorLabelNormalizer.normalize('Responsabile IVV / ISO 9001'))
      .toBe('responsabile ivv iso 9001');
  });

  it('returns no tokens for an empty or punctuation-only label', () => {
    expect(ActorLabelNormalizer.tokens('   ')).toEqual([]);
    expect(ActorLabelNormalizer.tokens('---')).toEqual([]);
  });

  it('does not mutate the input', () => {
    const input = 'Responsabile IVV';
    ActorLabelNormalizer.normalize(input);
    expect(input).toBe('Responsabile IVV');
  });
});

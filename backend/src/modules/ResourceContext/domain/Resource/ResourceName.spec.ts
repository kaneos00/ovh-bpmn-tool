import { ResourceName } from './ResourceName';

describe('ResourceName', () => {
  it.each([
    'Organisation — Démonstration transverse',
    'Évaluation des compétences',
    'Gouvernance — prévision CA et capacités',
    'Développement d’un logiciel',
  ])('accepts Unicode display name: %s', (value) => {
    const result = ResourceName.create(value);

    expect(result.ok).not.toBeNull();
    expect(result.ok?.value).toBe(value);
  });

  it('trims surrounding whitespace', () => {
    const result = ResourceName.create('  Processus RH  ');

    expect(result.ok?.value).toBe('Processus RH');
  });

  it('rejects an empty name', () => {
    expect(ResourceName.create('   ').fail).toBeInstanceOf(Error);
  });

  it('rejects control characters', () => {
    expect(ResourceName.create('Processus\nRH').fail).toBeInstanceOf(Error);
  });

  it('rejects names longer than 255 characters', () => {
    expect(ResourceName.create('A'.repeat(256)).fail).toBeInstanceOf(Error);
  });
});

import { Repository } from 'typeorm';
import { ContentTypeOrmRepository } from './content.repository';
import { ContentTypeOrmEntity } from '../../entities/content.ormEntity';

describe('ContentTypeOrmRepository.findExplorerProcessLinks', () => {
  const query = jest.fn();
  const ormRepository = {
    query,
  } as unknown as Repository<ContentTypeOrmEntity>;
  let repository: ContentTypeOrmRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ContentTypeOrmRepository(ormRepository);
  });

  it('does not query PostgreSQL when there are no process resources', async () => {
    await expect(repository.findExplorerProcessLinks([])).resolves.toEqual({
      ok: [],
      fail: null,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('returns no link metadata for resources without published BPMN content', async () => {
    query.mockResolvedValue([]);

    await expect(
      repository.findExplorerProcessLinks([
        'resource-without-published-content',
      ]),
    ).resolves.toEqual({
      ok: [],
      fail: null,
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('extracts process IDs and combines Call Activity and collapsed SubProcess targets in one SQL query', async () => {
    query.mockResolvedValue([
      {
        resourceId: 'resource-a',
        processIds: ['Process_A'],
        callTargets: ['resource-b', 'Process_B'],
        collapsedTargets: ['resource-c'],
      },
      {
        resourceId: 'resource-b',
        processIds: ['Process_B'],
        callTargets: null,
        collapsedTargets: null,
      },
    ]);

    await expect(
      repository.findExplorerProcessLinks(['resource-a', 'resource-b']),
    ).resolves.toEqual({
      ok: [
        {
          resourceId: 'resource-a',
          processIds: ['Process_A'],
          targets: ['resource-b', 'Process_B', 'resource-c'],
        },
        {
          resourceId: 'resource-b',
          processIds: ['Process_B'],
          targets: [],
        },
      ],
      fail: null,
    });

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, parameters] = query.mock.calls[0];
    expect(parameters).toEqual([['resource-a', 'resource-b'], 'published']);
    expect(sql).toContain('DISTINCT ON ("resourceId")');
    expect(sql).toContain('status = $2');
    expect(sql).toContain('xpath(\'//*[local-name()="process"]/@id\'');
    expect(sql).toContain('local-name()="callActivity"');
    expect(sql).toContain('local-name()="BPMNShape"');
    expect(sql).toContain('@isExpanded="false"');
    expect(sql).toContain('local-name()="subProcess"');
  });

  it('returns a repository failure when PostgreSQL rejects the XML query', async () => {
    query.mockRejectedValue(new Error('invalid XML document'));

    const result = await repository.findExplorerProcessLinks(['resource-a']);

    expect(result.fail).toBeInstanceOf(Error);
    expect(result.fail?.message).toContain('invalid XML document');
  });
});

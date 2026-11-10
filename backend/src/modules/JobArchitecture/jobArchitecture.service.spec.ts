import { BadRequestException } from '@nestjs/common';
import { JobArchitectureService } from './jobArchitecture.service';

describe('JobArchitectureService.addPositionActivityMapping', () => {
  const headers = { authorization: 'test' };
  const validXml = `
    <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
      <process id="Process_1"><userTask id="Task_1"/></process>
    </definitions>`;

  let service: JobArchitectureService;
  let assertProjectRole: jest.Mock;
  let positionFindOne: jest.Mock;
  let processFindOne: jest.Mock;
  let positionBlockFindOne: jest.Mock;
  let contentFindOne: jest.Mock;
  let mappingFindOne: jest.Mock;
  let mappingCreate: jest.Mock;
  let mappingSave: jest.Mock;

  beforeEach(() => {
    assertProjectRole = jest.fn().mockResolvedValue('user-1');
    positionFindOne = jest.fn().mockResolvedValue({ id: 'position-1' });
    processFindOne = jest.fn().mockResolvedValue({ resourceId: 'resource-1' });
    positionBlockFindOne = jest.fn().mockResolvedValue({
      blockId: 'block-1',
      applicability: 'required',
    });
    contentFindOne = jest.fn().mockResolvedValue({
      content: validXml,
      version: 2,
    });
    mappingFindOne = jest.fn().mockResolvedValue(null);
    mappingCreate = jest.fn((value) => value);
    mappingSave = jest.fn((value) => Promise.resolve(value));

    service = Object.create(
      JobArchitectureService.prototype,
    ) as JobArchitectureService;
    Object.assign(service, {
      projectAccess: { assertProjectRole },
      positions: { findOne: positionFindOne },
      projectProcesses: { findOne: processFindOne },
      positionBlocks: { findOne: positionBlockFindOne },
      contents: { findOne: contentFindOne },
      activityMappings: {
        findOne: mappingFindOne,
        create: mappingCreate,
        save: mappingSave,
      },
    });
  });

  const addMapping = () =>
    service.addPositionActivityMapping(
      'project-1',
      'position-1',
      { resourceId: 'resource-1', taskId: 'Task_1', blockId: 'block-1' },
      headers,
    );

  it('accepts an activity ID present in the latest published BPMN XML', async () => {
    await expect(addMapping()).resolves.toMatchObject({
      resourceId: 'resource-1',
      taskId: 'Task_1',
      blockId: 'block-1',
    });
    expect(contentFindOne).toHaveBeenCalledWith({
      where: { resourceId: 'resource-1', status: 'published' },
      order: { version: 'DESC', createdAt: 'DESC' },
    });
    expect(mappingSave).toHaveBeenCalledTimes(1);
  });

  it('rejects a process that has no published content', async () => {
    contentFindOne.mockResolvedValue(null);
    await expect(addMapping()).rejects.toBeInstanceOf(BadRequestException);
    expect(contentFindOne).toHaveBeenCalledTimes(1);
    expect(mappingSave).not.toHaveBeenCalled();
  });

  it('rejects an ID that is absent from the latest published version', async () => {
    contentFindOne.mockResolvedValue({
      content: validXml.replace('Task_1', 'Task_renamed'),
      version: 3,
    });
    await expect(addMapping()).rejects.toThrow('not found as an activity');
    expect(mappingSave).not.toHaveBeenCalled();
  });

  it('rejects malformed published XML instead of accepting an unchecked mapping', async () => {
    contentFindOne.mockResolvedValue({
      content: '<definitions><process></definitions>',
      version: 3,
    });
    await expect(addMapping()).rejects.toThrow('not well-formed XML');
    expect(mappingSave).not.toHaveBeenCalled();
  });

  it('rejects an existing BPMN element when it is not an activity', async () => {
    contentFindOne.mockResolvedValue({
      content: validXml.replace(
        '<userTask id="Task_1"/>',
        '<exclusiveGateway id="Task_1"/>',
      ),
      version: 3,
    });
    await expect(addMapping()).rejects.toThrow('not found as an activity');
    expect(mappingSave).not.toHaveBeenCalled();
  });
});

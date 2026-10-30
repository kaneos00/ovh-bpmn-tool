import { ResourceRepository } from '../../adapters/repositories/resource.repository';
import { GetResourceQueryHandler } from './getResource/getResource.queryHandler';
import { ListResourceQueryHandler } from './listResource/listResource.queryHandler';
import { ExplorerLinksQueryHandler } from './explorerLinks/explorerLinks.queryHandler';

export const getResourceQueries = () => [
  {
    provide: ExplorerLinksQueryHandler,
    useFactory: (
      contentRepository: import('../../adapters/repositories/content.repository').ContentRepository,
    ) => new ExplorerLinksQueryHandler(contentRepository),
    inject: ['ContentRepository'],
  },
  {
    provide: ListResourceQueryHandler,
    useFactory: (resourceRepository: ResourceRepository) => {
      return new ListResourceQueryHandler(resourceRepository);
    },
    inject: ['ResourceRepository'],
  },
  {
    provide: GetResourceQueryHandler,
    useFactory: (resourceRepository: ResourceRepository) => {
      return new GetResourceQueryHandler(resourceRepository);
    },
    inject: ['ResourceRepository'],
  },
];

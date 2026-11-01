import { CommentController } from './comment.controller';
import { ContentController } from './content.controller';
import { ResourceController } from './resource.controller';
import { ExportController } from './export.controller';
import { HealthCheckController } from './healthcheck.controller';
import { ProcessChangeRequestController } from './processChangeRequest.controller';

export const getControllers = () => [
  HealthCheckController,
  ProcessChangeRequestController,
  ResourceController,
  ContentController,
  CommentController,
  ExportController,
];

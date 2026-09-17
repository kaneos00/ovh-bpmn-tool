import { bootstrapBpmnTool } from '../src/main';
import WikiModel from '../src/extensions/url-model';

bootstrapBpmnTool({
  modelerOptions: {
    extensions: WikiModel,
  },
});

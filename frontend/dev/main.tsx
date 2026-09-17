import { bootstrapBpmnTool } from '../src/main';
import WikiModel from '../src/extensions/my-bpmn-module';

bootstrapBpmnTool({
  modelerOptions: {
    extensions: WikiModel,
  },
});

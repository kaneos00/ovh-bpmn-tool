import { bootstrapBpmnTool } from '../src/main';
import UrlModel from '../src/extensions/url-model';
import UrlPropertiesProvider from '../src/extensions/url-properties-provider';

bootstrapBpmnTool({
  modelerOptions: {
    extensions: UrlModel,
    providers: [
      {
        priority: 500,
        instance: UrlPropertiesProvider,
      },
    ],
  },
});

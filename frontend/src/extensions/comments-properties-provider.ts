import { is } from 'bpmn-js/lib/util/ModelUtil';
import { html } from 'htm/preact';
import { useEffect, useState } from '@bpmn-io/properties-panel/preact/hooks';
import { useService } from 'bpmn-js-properties-panel';

const PRIORITY = 499;

class CommentsPropertiesProvider {
  constructor(propertiesPanel: any, translate: any) {
    propertiesPanel.registerProvider(PRIORITY, this);
    this.translate = translate;
  }

  getGroups(element: any) {
    return (groups: any[]) => {
      if (!is(element, 'bpmn:FlowNode')) {
        return groups;
      }

      groups.push({
        id: 'comments',
        label: this.translate('Commentaires'),
        entries: [
          {
            id: 'comments-entry',
            element,
            component: CommentsEntry,
          },
        ],
      });

      return groups;
    };
  }
}

CommentsPropertiesProvider.$inject = [ 'propertiesPanel', 'translate' ];

function CommentsEntry(props: any) {
  const { element } = props;
  const comments = useService('comments') as any;
  const eventBus = useService('eventBus') as any;
  const translate = useService('translate') as any;
  const [ value, setValue ] = useState('');
  const [ items, setItems ] = useState<any[]>(() => comments.getComments(element));

  const refresh = () => {
    setItems([ ...comments.getComments(element) ]);
  };

  useEffect(() => {
    refresh();

    const events = [
      'comments.added',
      'comments.removed',
      'comments.updated'
    ];

    events.forEach(event => eventBus.on(event, refresh));

    return () => {
      events.forEach(event => eventBus.off(event, refresh));
    };
  }, [ element ]);

  const addComment = () => {
    const text = value.trim();

    if (!text) {
      return;
    }

    comments.addComment(element, {
      author: '',
      text
    });

    setValue('');
    refresh();
  };

  const removeComment = (comment: any) => {
    comments.removeComment(element, comment);
    refresh();
  };

  return html`
    <div class="bpmn-tool-comments-entry">
      ${items.map((comment, index) => html`
        <div class="bpmn-tool-comment" key=${ index }>
          <div class="bpmn-tool-comment-text">${ comment.text }</div>
          <button
            type="button"
            class="bpmn-tool-comment-delete"
            title=${ translate('Supprimer le commentaire') }
            onClick=${ () => removeComment(comment) }
          >
            ×
          </button>
        </div>
      `)}

      <textarea
        class="bpmn-tool-comment-input"
        placeholder=${ translate('Ajouter un commentaire') }
        value=${ value }
        onInput=${ (event: any) => setValue(event.target.value) }
        onKeyDown=${ (event: any) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            addComment();
          }
        } }
      ></textarea>

      <button
        type="button"
        class="bpmn-tool-comment-add"
        disabled=${ !value.trim() }
        onClick=${ addComment }
      >
        ${ translate('Ajouter') }
      </button>
    </div>
  `;
}

export default CommentsPropertiesProvider;

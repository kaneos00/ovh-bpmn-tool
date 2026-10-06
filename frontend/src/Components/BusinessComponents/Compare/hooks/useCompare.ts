/* eslint-disable no-console */

import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// @ts-ignore
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
// @ts-ignore
import { diff } from 'bpmn-js-differ';
// @ts-ignore
// import { ChangeHandler } from 'bpmn-js-diffing';

import type { Nullable } from '../../../../shared/types/Nullable';
import { useModelerInstance } from '../../../../shared/hooks/useModelerInstance';
import { useBpmnToolOptions } from '../../../../Providers/BpmnToolOptions/useBpmnToolOptions';

type DiffSimple = {
  id: string;
  name?: string;
  text?: string;
  $type?: string;
} & unknown;

type DiffGeneric = {
  attrs: Record<string, unknown>;
  model: { id: string; name?: string; type?: string };
};

export type Diffs = Nullable<{
  _added: Record<string, DiffSimple>;
  _changed: Record<string, DiffGeneric>;
  _layoutChanged: Record<string, DiffSimple>;
  _removed: Record<string, DiffSimple>;
}>;
type BpmnViewerType = {
  get<T extends Record<string, unknown>>(module: string): T;
  on(event: string, callback: (event: Event) => void): void;
  off(event: string, callback: (event: Event) => void): void;
  attachTo: (parentNode: HTMLElement) => void;
  destroy: () => void;
};

export const useCompare = (leftContent: string, rightContent: string) => {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const { getModelerDiffChangeHandler } = useBpmnToolOptions();
  const { getViewerInstance } = useModelerInstance();
  const leftViewer = useMemo(
    () =>
      getViewerInstance({
        height: '100%',
        width: '100%',
        canvas: {
          deferUpdate: false,
        },
      }),
    [getViewerInstance],
  );

  const rightViewer = useMemo(
    () =>
      getViewerInstance({
        height: '100%',
        width: '100%',
        canvas: {
          deferUpdate: false,
        },
      }),
    [getViewerInstance],
  );

  const [rightSideLoaded, setRightSideLoaded] = useState(false);
  const [leftSideLoaded, setLeftSideLoaded] = useState(false);

  const [diffs, setDiffs] = useState<Diffs>(null);

  const attachViewer = useCallback(
    (ref: RefObject<HTMLDivElement>, viewer: BpmnViewerType) => {
      if (!ref.current) {
        console.error('attachModeler - Diagram ref is undefined');
        return;
      }

      viewer.attachTo(ref.current);
    },
    [],
  );

  const syncViewers = useCallback((a: BpmnViewerType, b: BpmnViewerType) => {
    let changing = false;

    const update = (viewer: BpmnViewerType) => {
      return (e: Event & { viewbox?: unknown }) => {
        if (changing || !e.viewbox) {
          return;
        }

        changing = true;

        // @ts-ignore
        viewer.get('canvas').viewbox(e.viewbox);
        changing = false;
      };
    };

    const updateBFromA = update(b);
    const updateAFromB = update(a);

    a.on('canvas.viewbox.changed', updateBFromA);
    b.on('canvas.viewbox.changed', updateAFromB);

    return () => {
      a.off('canvas.viewbox.changed', updateBFromA);
      b.off('canvas.viewbox.changed', updateAFromB);
    };
  }, []);

  const highlight = useCallback(
    (viewer: BpmnViewer, elementId: string, marker: string) => {
      try {
        // @ts-ignore
        viewer.get('canvas').addMarker(elementId, marker);
      } catch (e) {
        /* empty */
      }
    },
    [],
  );

  const addMarker = useCallback(
    (
      viewer: BpmnViewer,
      elementId: string,
      className: string,
      symbol: string,
    ) => {
      const overlays = viewer.get('overlays');

      try {
        // @ts-ignore
        overlays.add(elementId, 'diff', {
          position: {
            top: -12,
            right: 12,
          },
          html: `<span class="marker ${className}">${symbol}</span>`,
        });
      } catch (e) {
        console.error(e);
      }
    },
    [],
  );

  // Load content for left side
  useEffect(() => {
    if (!leftRef.current || !leftContent) {
      return;
    }

    let cancelled = false;

    leftViewer
      .importXML(leftContent)
      .then(() => {
        if (!cancelled) {
          attachViewer(leftRef, leftViewer);
          setLeftSideLoaded(true);
        }
      })
      .catch(e => {
        if (!cancelled) {
          console.error('leftSide: ', e);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [leftContent, leftViewer, attachViewer]);

  // Load content for right side
  useEffect(() => {
    if (!rightRef.current || !rightContent) {
      return;
    }

    let cancelled = false;

    rightViewer
      .importXML(rightContent)
      .then(() => {
        if (!cancelled) {
          attachViewer(rightRef, rightViewer);
          setRightSideLoaded(true);
        }
      })
      .catch(e => {
        if (!cancelled) {
          console.error('rightSide: ', e);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rightContent, rightViewer, attachViewer]);

  // Search for diff and sync viewers
  useEffect(() => {
    if (!rightSideLoaded || !leftSideLoaded) {
      return;
    }

    setDiffs(
      diff(
        rightViewer.getDefinitions(),
        leftViewer.getDefinitions(),
        getModelerDiffChangeHandler(),
      ),
    );
    return syncViewers(leftViewer, rightViewer);
  }, [rightSideLoaded, leftSideLoaded, leftViewer, rightViewer, getModelerDiffChangeHandler, syncViewers]);

  /* DIFFS HANDLERS */
  useEffect(() => {
    if (
      !leftSideLoaded ||
      !rightSideLoaded ||
      !diffs?._changed ||
      !Object.values(diffs?._changed).length
    ) {
      return;
    }

    Object.values(diffs._changed).forEach(obj => {
      highlight(leftViewer, obj.model.id, 'diff-changed');
      addMarker(leftViewer, obj.model.id, 'marker-changed', '&#9998;');

      highlight(rightViewer, obj.model.id, 'diff-changed');
      addMarker(rightViewer, obj.model.id, 'marker-changed', '&#9998;');
    });
  }, [diffs?._changed, leftSideLoaded, rightSideLoaded, leftViewer, rightViewer, highlight, addMarker]);

  useEffect(() => {
    if (
      !leftSideLoaded ||
      !rightSideLoaded ||
      !diffs?._added ||
      !Object.values(diffs?._added).length
    ) {
      return;
    }

    Object.values(diffs._added).forEach(obj => {
      highlight(leftViewer, obj.id, 'diff-added');
      addMarker(leftViewer, obj.id, 'marker-added', '&#43;');
    });
  }, [diffs?._added, leftSideLoaded, rightSideLoaded, leftViewer, highlight, addMarker]);

  useEffect(() => {
    if (
      !leftSideLoaded ||
      !rightSideLoaded ||
      !diffs?._removed ||
      !Object.values(diffs?._removed).length
    ) {
      return;
    }

    Object.values(diffs._removed).forEach(obj => {
      highlight(rightViewer, obj.id, 'diff-removed');
      addMarker(rightViewer, obj.id, 'marker-removed', '&minus;');
    });
  }, [diffs?._removed, leftSideLoaded, rightSideLoaded, rightViewer, highlight, addMarker]);

  useEffect(() => {
    if (
      !leftSideLoaded ||
      !rightSideLoaded ||
      !diffs?._layoutChanged ||
      !Object.values(diffs?._layoutChanged).length
    ) {
      return;
    }

    Object.values(diffs._layoutChanged).forEach(obj => {
      highlight(rightViewer, obj.id, 'diff-layout-changed');
      addMarker(rightViewer, obj.id, 'marker-layout-changed', '&#8680;');

      highlight(leftViewer, obj.id, 'diff-layout-changed');
      addMarker(leftViewer, obj.id, 'marker-layout-changed', '&#8680;');
    });
  }, [diffs?._layoutChanged, leftSideLoaded, rightSideLoaded, leftViewer, rightViewer, highlight, addMarker]);

  useEffect(() => {
    return () => {
      leftViewer.destroy();
      rightViewer.destroy();
    };
  }, [leftViewer, rightViewer]);

  // const displayChanges = () =>
  //   showModal<{ diffs: Diffs }>('CompareChanges', () => '', { diffs });

  return {
    leftRef,
    rightRef,
    diffs,
    // displayChanges,
  };
};

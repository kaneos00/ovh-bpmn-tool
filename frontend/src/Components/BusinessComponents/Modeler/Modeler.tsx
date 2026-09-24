import React, { FC, RefObject } from 'react';

import 'camunda-bpmn-js/dist/assets/camunda-platform-modeler.css';
import 'bpmn-js-color-picker/colors/color-picker.css';
import 'bpmn-js-embedded-comments/assets/comments.css';
import 'diagram-js-minimap/assets/diagram-js-minimap.css';
import './Modeler.css';

type ModelerProps = {
  diagramContainerRef: RefObject<HTMLDivElement>;
  diagramPropertiesRef: RefObject<HTMLDivElement>;
};
export const Modeler: FC<ModelerProps> = ({
  diagramContainerRef,
  diagramPropertiesRef,
}) => {
  return (
    <div id="diagramContainer" ref={diagramContainerRef}>
      <div id="diagramProperties" ref={diagramPropertiesRef} />
      <div
        className="bpmn-tool-navigation-controls"
        aria-label="Navigation du diagramme"
      >
        <button type="button" className="bpmn-tool-navigation-button" data-navigation-action="zoom-in" title="Zoom avant">+</button>
        <button type="button" className="bpmn-tool-navigation-button" data-navigation-action="zoom-out" title="Zoom arrière">−</button>
        <button type="button" className="bpmn-tool-navigation-button" data-navigation-action="reset" title="Réinitialiser le zoom">1:1</button>
        <button type="button" className="bpmn-tool-navigation-button" data-navigation-action="fit" title="Ajuster le diagramme à la fenêtre">⛶</button>
      </div>
    </div>
  );
};

-- Demo-only organizational process catalogue. Runs after seed-demo.sql on first DB initialization.
-- Dedicated demo database only; identifiers are stable to make this seed idempotent.

INSERT INTO projects (id, "createdBy", name, description) VALUES
 ('70000000-0000-4000-8000-000000000001','demo-seed','Organisation — Démonstration transverse','Projet chapeau avec processus RH communs, gouvernance des capacités et développement logiciel.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_members (id, "createdBy", "projectId", "userId", role) VALUES
 ('71000000-0000-4000-8000-000000000001','demo-seed','70000000-0000-4000-8000-000000000001',:'demo_user','admin')
ON CONFLICT ("projectId","userId") DO NOTHING;

INSERT INTO resources (id, "createdBy", name, description, depth, "parentId", "authToken", type) VALUES
 ('72000000-0000-4000-8000-000000000001','demo-seed','Organisation — démonstration transverse','Projet chapeau : RH commun, gouvernance des capacités et développement logiciel.',0,NULL,NULL,'folder'),
 ('72000000-0000-4000-8000-000000000002','demo-seed','RH — processus communs','Processus RH réutilisables par les équipes et projets.',1,'72000000-0000-4000-8000-000000000001',NULL,'folder'),
 ('72000000-0000-4000-8000-000000000003','demo-seed','Gouvernance et capacité','Projection de CA, charge prévisionnelle et arbitrages RH.',1,'72000000-0000-4000-8000-000000000001',NULL,'folder'),
 ('72000000-0000-4000-8000-000000000004','demo-seed','Développement logiciel','Processus de réalisation lié à la gouvernance et aux processus RH.',1,'72000000-0000-4000-8000-000000000001',NULL,'folder'),
 ('72000000-0000-4000-8000-000000000005','demo-seed','Recrutement','Processus RH commun — de la validation du besoin à l''intégration.',2,'72000000-0000-4000-8000-000000000002',NULL,'process'),
 ('72000000-0000-4000-8000-000000000006','demo-seed','Évaluation des compétences','Préparation, entretiens, analyse des écarts et actions de développement.',2,'72000000-0000-4000-8000-000000000002',NULL,'process'),
 ('72000000-0000-4000-8000-000000000007','demo-seed','Formation','Consolidation des besoins, plan de formation et évaluation.',2,'72000000-0000-4000-8000-000000000002',NULL,'process'),
 ('72000000-0000-4000-8000-000000000008','demo-seed','Gouvernance — prévision CA et capacités','Collecte des projections de CA, évaluation de charge et déclenchement des plans RH.',2,'72000000-0000-4000-8000-000000000003',NULL,'process'),
 ('72000000-0000-4000-8000-000000000009','demo-seed','Développement d''un logiciel','Cadrage, conception, réalisation, validation et livraison, avec appels aux processus généraux.',2,'72000000-0000-4000-8000-000000000004',NULL,'process')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contents (id, "createdBy", "resourceId", status, version, content, "pngContent", "updatedBy") VALUES
 ('73000000-0000-4000-8000-000000000001','demo-seed','72000000-0000-4000-8000-000000000005','published',1,
$orgbpmn1$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Process_Recrutement" targetNamespace="https://khi-flows.example/organisation-demo" exporter="KHI Flows" exporterVersion="2.1">
  <bpmn:process id="Process_Recrutement" name="Recrutement" isExecutable="false">
    <bpmn:startEvent id="Start_Process_Recrutement" name="Début"><bpmn:outgoing>Flow_Process_Recrutement_0</bpmn:outgoing></bpmn:startEvent>
    <bpmn:task id="Task_Recrutement_1" name="[DO] Valider le besoin de recrutement"><bpmn:incoming>Flow_Process_Recrutement_0</bpmn:incoming><bpmn:outgoing>Flow_Process_Recrutement_1</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Recrutement_2" name="[CDP] Décrire le poste et les compétences"><bpmn:incoming>Flow_Process_Recrutement_1</bpmn:incoming><bpmn:outgoing>Flow_Process_Recrutement_2</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Recrutement_3" name="[DG] Autoriser l'ouverture du poste"><bpmn:incoming>Flow_Process_Recrutement_2</bpmn:incoming><bpmn:outgoing>Flow_Process_Recrutement_3</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Recrutement_4" name="[DO] Sélectionner et intégrer le candidat"><bpmn:incoming>Flow_Process_Recrutement_3</bpmn:incoming><bpmn:outgoing>Flow_Process_Recrutement_4</bpmn:outgoing></bpmn:task>
    <bpmn:endEvent id="End_Process_Recrutement" name="Fin"><bpmn:incoming>Flow_Process_Recrutement_4</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_Process_Recrutement_0" sourceRef="Start_Process_Recrutement" targetRef="Task_Recrutement_1"/>
    <bpmn:sequenceFlow id="Flow_Process_Recrutement_1" sourceRef="Task_Recrutement_1" targetRef="Task_Recrutement_2"/>
    <bpmn:sequenceFlow id="Flow_Process_Recrutement_2" sourceRef="Task_Recrutement_2" targetRef="Task_Recrutement_3"/>
    <bpmn:sequenceFlow id="Flow_Process_Recrutement_3" sourceRef="Task_Recrutement_3" targetRef="Task_Recrutement_4"/>
    <bpmn:sequenceFlow id="Flow_Process_Recrutement_4" sourceRef="Task_Recrutement_4" targetRef="End_Process_Recrutement"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Recrutement"><bpmndi:BPMNPlane id="Plane_Process_Recrutement" bpmnElement="Process_Recrutement">
    <bpmndi:BPMNShape id="Start_Process_Recrutement_di" bpmnElement="Start_Process_Recrutement"><dc:Bounds x="55" y="172" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Recrutement_1_di" bpmnElement="Task_Recrutement_1"><dc:Bounds x="140" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Recrutement_2_di" bpmnElement="Task_Recrutement_2"><dc:Bounds x="310" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Recrutement_3_di" bpmnElement="Task_Recrutement_3"><dc:Bounds x="480" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Recrutement_4_di" bpmnElement="Task_Recrutement_4"><dc:Bounds x="650" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="End_Process_Recrutement_di" bpmnElement="End_Process_Recrutement"><dc:Bounds x="820" y="172" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_Process_Recrutement_0_di" bpmnElement="Flow_Process_Recrutement_0"><di:waypoint x="91" y="190"/><di:waypoint x="140" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_Recrutement_1_di" bpmnElement="Flow_Process_Recrutement_1"><di:waypoint x="265" y="190"/><di:waypoint x="310" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_Recrutement_2_di" bpmnElement="Flow_Process_Recrutement_2"><di:waypoint x="435" y="190"/><di:waypoint x="480" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_Recrutement_3_di" bpmnElement="Flow_Process_Recrutement_3"><di:waypoint x="605" y="190"/><di:waypoint x="650" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_Recrutement_4_di" bpmnElement="Flow_Process_Recrutement_4"><di:waypoint x="775" y="190"/><di:waypoint x="820" y="190"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>
$orgbpmn1$,NULL,'demo-seed'),
 ('73000000-0000-4000-8000-000000000002','demo-seed','72000000-0000-4000-8000-000000000006','published',1,
$orgbpmn2$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Process_EvaluationCompetences" targetNamespace="https://khi-flows.example/organisation-demo" exporter="KHI Flows" exporterVersion="2.1">
  <bpmn:process id="Process_EvaluationCompetences" name="Évaluation des compétences" isExecutable="false">
    <bpmn:startEvent id="Start_Process_EvaluationCompetences" name="Début"><bpmn:outgoing>Flow_Process_EvaluationCompetences_0</bpmn:outgoing></bpmn:startEvent>
    <bpmn:task id="Task_Competences_1" name="[CDP] Préparer la grille de compétences"><bpmn:incoming>Flow_Process_EvaluationCompetences_0</bpmn:incoming><bpmn:outgoing>Flow_Process_EvaluationCompetences_1</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Competences_2" name="[CDP] Réaliser l'entretien de compétences"><bpmn:incoming>Flow_Process_EvaluationCompetences_1</bpmn:incoming><bpmn:outgoing>Flow_Process_EvaluationCompetences_2</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Competences_3" name="[DT] Analyser les écarts de compétences"><bpmn:incoming>Flow_Process_EvaluationCompetences_2</bpmn:incoming><bpmn:outgoing>Flow_Process_EvaluationCompetences_3</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Competences_4" name="[DO] Valider les actions de développement"><bpmn:incoming>Flow_Process_EvaluationCompetences_3</bpmn:incoming><bpmn:outgoing>Flow_Process_EvaluationCompetences_4</bpmn:outgoing></bpmn:task>
    <bpmn:endEvent id="End_Process_EvaluationCompetences" name="Fin"><bpmn:incoming>Flow_Process_EvaluationCompetences_4</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_Process_EvaluationCompetences_0" sourceRef="Start_Process_EvaluationCompetences" targetRef="Task_Competences_1"/>
    <bpmn:sequenceFlow id="Flow_Process_EvaluationCompetences_1" sourceRef="Task_Competences_1" targetRef="Task_Competences_2"/>
    <bpmn:sequenceFlow id="Flow_Process_EvaluationCompetences_2" sourceRef="Task_Competences_2" targetRef="Task_Competences_3"/>
    <bpmn:sequenceFlow id="Flow_Process_EvaluationCompetences_3" sourceRef="Task_Competences_3" targetRef="Task_Competences_4"/>
    <bpmn:sequenceFlow id="Flow_Process_EvaluationCompetences_4" sourceRef="Task_Competences_4" targetRef="End_Process_EvaluationCompetences"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_EvaluationCompetences"><bpmndi:BPMNPlane id="Plane_Process_EvaluationCompetences" bpmnElement="Process_EvaluationCompetences">
    <bpmndi:BPMNShape id="Start_Process_EvaluationCompetences_di" bpmnElement="Start_Process_EvaluationCompetences"><dc:Bounds x="55" y="172" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Competences_1_di" bpmnElement="Task_Competences_1"><dc:Bounds x="140" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Competences_2_di" bpmnElement="Task_Competences_2"><dc:Bounds x="310" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Competences_3_di" bpmnElement="Task_Competences_3"><dc:Bounds x="480" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Competences_4_di" bpmnElement="Task_Competences_4"><dc:Bounds x="650" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="End_Process_EvaluationCompetences_di" bpmnElement="End_Process_EvaluationCompetences"><dc:Bounds x="820" y="172" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_Process_EvaluationCompetences_0_di" bpmnElement="Flow_Process_EvaluationCompetences_0"><di:waypoint x="91" y="190"/><di:waypoint x="140" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_EvaluationCompetences_1_di" bpmnElement="Flow_Process_EvaluationCompetences_1"><di:waypoint x="265" y="190"/><di:waypoint x="310" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_EvaluationCompetences_2_di" bpmnElement="Flow_Process_EvaluationCompetences_2"><di:waypoint x="435" y="190"/><di:waypoint x="480" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_EvaluationCompetences_3_di" bpmnElement="Flow_Process_EvaluationCompetences_3"><di:waypoint x="605" y="190"/><di:waypoint x="650" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_EvaluationCompetences_4_di" bpmnElement="Flow_Process_EvaluationCompetences_4"><di:waypoint x="775" y="190"/><di:waypoint x="820" y="190"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>
$orgbpmn2$,NULL,'demo-seed'),
 ('73000000-0000-4000-8000-000000000003','demo-seed','72000000-0000-4000-8000-000000000007','published',1,
$orgbpmn3$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Process_Formation" targetNamespace="https://khi-flows.example/organisation-demo" exporter="KHI Flows" exporterVersion="2.1">
  <bpmn:process id="Process_Formation" name="Formation" isExecutable="false">
    <bpmn:startEvent id="Start_Process_Formation" name="Début"><bpmn:outgoing>Flow_Process_Formation_0</bpmn:outgoing></bpmn:startEvent>
    <bpmn:task id="Task_Formation_1" name="[CDP] Consolider les besoins en formation"><bpmn:incoming>Flow_Process_Formation_0</bpmn:incoming><bpmn:outgoing>Flow_Process_Formation_1</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Formation_2" name="[DT] Construire le plan de formation"><bpmn:incoming>Flow_Process_Formation_1</bpmn:incoming><bpmn:outgoing>Flow_Process_Formation_2</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Formation_3" name="[DO] Planifier et organiser les sessions"><bpmn:incoming>Flow_Process_Formation_2</bpmn:incoming><bpmn:outgoing>Flow_Process_Formation_3</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Formation_4" name="[CDP] Évaluer l'efficacité de la formation"><bpmn:incoming>Flow_Process_Formation_3</bpmn:incoming><bpmn:outgoing>Flow_Process_Formation_4</bpmn:outgoing></bpmn:task>
    <bpmn:endEvent id="End_Process_Formation" name="Fin"><bpmn:incoming>Flow_Process_Formation_4</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_Process_Formation_0" sourceRef="Start_Process_Formation" targetRef="Task_Formation_1"/>
    <bpmn:sequenceFlow id="Flow_Process_Formation_1" sourceRef="Task_Formation_1" targetRef="Task_Formation_2"/>
    <bpmn:sequenceFlow id="Flow_Process_Formation_2" sourceRef="Task_Formation_2" targetRef="Task_Formation_3"/>
    <bpmn:sequenceFlow id="Flow_Process_Formation_3" sourceRef="Task_Formation_3" targetRef="Task_Formation_4"/>
    <bpmn:sequenceFlow id="Flow_Process_Formation_4" sourceRef="Task_Formation_4" targetRef="End_Process_Formation"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Formation"><bpmndi:BPMNPlane id="Plane_Process_Formation" bpmnElement="Process_Formation">
    <bpmndi:BPMNShape id="Start_Process_Formation_di" bpmnElement="Start_Process_Formation"><dc:Bounds x="55" y="172" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Formation_1_di" bpmnElement="Task_Formation_1"><dc:Bounds x="140" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Formation_2_di" bpmnElement="Task_Formation_2"><dc:Bounds x="310" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Formation_3_di" bpmnElement="Task_Formation_3"><dc:Bounds x="480" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Formation_4_di" bpmnElement="Task_Formation_4"><dc:Bounds x="650" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="End_Process_Formation_di" bpmnElement="End_Process_Formation"><dc:Bounds x="820" y="172" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_Process_Formation_0_di" bpmnElement="Flow_Process_Formation_0"><di:waypoint x="91" y="190"/><di:waypoint x="140" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_Formation_1_di" bpmnElement="Flow_Process_Formation_1"><di:waypoint x="265" y="190"/><di:waypoint x="310" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_Formation_2_di" bpmnElement="Flow_Process_Formation_2"><di:waypoint x="435" y="190"/><di:waypoint x="480" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_Formation_3_di" bpmnElement="Flow_Process_Formation_3"><di:waypoint x="605" y="190"/><di:waypoint x="650" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_Formation_4_di" bpmnElement="Flow_Process_Formation_4"><di:waypoint x="775" y="190"/><di:waypoint x="820" y="190"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>
$orgbpmn3$,NULL,'demo-seed'),
 ('73000000-0000-4000-8000-000000000004','demo-seed','72000000-0000-4000-8000-000000000008','published',1,
$orgbpmn4$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Process_GouvernanceCapacites" targetNamespace="https://khi-flows.example/organisation-demo" exporter="KHI Flows" exporterVersion="2.1">
  <bpmn:process id="Process_GouvernanceCapacites" name="Gouvernance — prévision CA et planification des capacités" isExecutable="false">
    <bpmn:startEvent id="Start_Process_GouvernanceCapacites" name="Début"><bpmn:outgoing>Flow_Process_GouvernanceCapacites_0</bpmn:outgoing></bpmn:startEvent>
    <bpmn:task id="Task_Gouv_1" name="[DG] Consolider les projections de chiffre d'affaires"><bpmn:incoming>Flow_Process_GouvernanceCapacites_0</bpmn:incoming><bpmn:outgoing>Flow_Process_GouvernanceCapacites_1</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Gouv_2" name="[DO] Traduire les projections en charge prévisionnelle"><bpmn:incoming>Flow_Process_GouvernanceCapacites_1</bpmn:incoming><bpmn:outgoing>Flow_Process_GouvernanceCapacites_2</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Gouv_3" name="[DT] Évaluer les capacités et compétences disponibles"><bpmn:incoming>Flow_Process_GouvernanceCapacites_2</bpmn:incoming><bpmn:outgoing>Flow_Process_GouvernanceCapacites_3</bpmn:outgoing></bpmn:task>
    <bpmn:callActivity id="Call_Recrutement" name="Plan de recrutement — déclencher le processus Recrutement" calledElement="Process_Recrutement"><bpmn:incoming>Flow_Process_GouvernanceCapacites_3</bpmn:incoming><bpmn:outgoing>Flow_Process_GouvernanceCapacites_4</bpmn:outgoing></bpmn:callActivity>
    <bpmn:callActivity id="Call_Formation" name="Besoins en formation — déclencher le processus Formation" calledElement="Process_Formation"><bpmn:incoming>Flow_Process_GouvernanceCapacites_4</bpmn:incoming><bpmn:outgoing>Flow_Process_GouvernanceCapacites_5</bpmn:outgoing></bpmn:callActivity>
    <bpmn:task id="Task_Gouv_4" name="[DG] Arbitrer et valider le plan de capacité"><bpmn:incoming>Flow_Process_GouvernanceCapacites_5</bpmn:incoming><bpmn:outgoing>Flow_Process_GouvernanceCapacites_6</bpmn:outgoing></bpmn:task>
    <bpmn:endEvent id="End_Process_GouvernanceCapacites" name="Fin"><bpmn:incoming>Flow_Process_GouvernanceCapacites_6</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_Process_GouvernanceCapacites_0" sourceRef="Start_Process_GouvernanceCapacites" targetRef="Task_Gouv_1"/>
    <bpmn:sequenceFlow id="Flow_Process_GouvernanceCapacites_1" sourceRef="Task_Gouv_1" targetRef="Task_Gouv_2"/>
    <bpmn:sequenceFlow id="Flow_Process_GouvernanceCapacites_2" sourceRef="Task_Gouv_2" targetRef="Task_Gouv_3"/>
    <bpmn:sequenceFlow id="Flow_Process_GouvernanceCapacites_3" sourceRef="Task_Gouv_3" targetRef="Call_Recrutement"/>
    <bpmn:sequenceFlow id="Flow_Process_GouvernanceCapacites_4" sourceRef="Call_Recrutement" targetRef="Call_Formation"/>
    <bpmn:sequenceFlow id="Flow_Process_GouvernanceCapacites_5" sourceRef="Call_Formation" targetRef="Task_Gouv_4"/>
    <bpmn:sequenceFlow id="Flow_Process_GouvernanceCapacites_6" sourceRef="Task_Gouv_4" targetRef="End_Process_GouvernanceCapacites"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_GouvernanceCapacites"><bpmndi:BPMNPlane id="Plane_Process_GouvernanceCapacites" bpmnElement="Process_GouvernanceCapacites">
    <bpmndi:BPMNShape id="Start_Process_GouvernanceCapacites_di" bpmnElement="Start_Process_GouvernanceCapacites"><dc:Bounds x="55" y="172" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Gouv_1_di" bpmnElement="Task_Gouv_1"><dc:Bounds x="140" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Gouv_2_di" bpmnElement="Task_Gouv_2"><dc:Bounds x="310" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Gouv_3_di" bpmnElement="Task_Gouv_3"><dc:Bounds x="480" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Call_Recrutement_di" bpmnElement="Call_Recrutement"><dc:Bounds x="650" y="150" width="145" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Call_Formation_di" bpmnElement="Call_Formation"><dc:Bounds x="820" y="150" width="145" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Gouv_4_di" bpmnElement="Task_Gouv_4"><dc:Bounds x="990" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="End_Process_GouvernanceCapacites_di" bpmnElement="End_Process_GouvernanceCapacites"><dc:Bounds x="1160" y="172" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_Process_GouvernanceCapacites_0_di" bpmnElement="Flow_Process_GouvernanceCapacites_0"><di:waypoint x="91" y="190"/><di:waypoint x="140" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_GouvernanceCapacites_1_di" bpmnElement="Flow_Process_GouvernanceCapacites_1"><di:waypoint x="265" y="190"/><di:waypoint x="310" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_GouvernanceCapacites_2_di" bpmnElement="Flow_Process_GouvernanceCapacites_2"><di:waypoint x="435" y="190"/><di:waypoint x="480" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_GouvernanceCapacites_3_di" bpmnElement="Flow_Process_GouvernanceCapacites_3"><di:waypoint x="605" y="190"/><di:waypoint x="650" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_GouvernanceCapacites_4_di" bpmnElement="Flow_Process_GouvernanceCapacites_4"><di:waypoint x="795" y="190"/><di:waypoint x="820" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_GouvernanceCapacites_5_di" bpmnElement="Flow_Process_GouvernanceCapacites_5"><di:waypoint x="965" y="190"/><di:waypoint x="990" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_GouvernanceCapacites_6_di" bpmnElement="Flow_Process_GouvernanceCapacites_6"><di:waypoint x="1115" y="190"/><di:waypoint x="1160" y="190"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>
$orgbpmn4$,NULL,'demo-seed'),
 ('73000000-0000-4000-8000-000000000005','demo-seed','72000000-0000-4000-8000-000000000009','published',1,
$orgbpmn5$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Process_DeveloppementLogiciel" targetNamespace="https://khi-flows.example/organisation-demo" exporter="KHI Flows" exporterVersion="2.1">
  <bpmn:process id="Process_DeveloppementLogiciel" name="Développement d'un logiciel" isExecutable="false">
    <bpmn:startEvent id="Start_Process_DeveloppementLogiciel" name="Début"><bpmn:outgoing>Flow_Process_DeveloppementLogiciel_0</bpmn:outgoing></bpmn:startEvent>
    <bpmn:callActivity id="Call_Gouvernance" name="[CDP] Vérifier capacité et arbitrages — Gouvernance" calledElement="Process_GouvernanceCapacites"><bpmn:incoming>Flow_Process_DeveloppementLogiciel_0</bpmn:incoming><bpmn:outgoing>Flow_Process_DeveloppementLogiciel_1</bpmn:outgoing></bpmn:callActivity>
    <bpmn:callActivity id="Call_EvaluationCompetences" name="[DT] Vérifier les compétences requises" calledElement="Process_EvaluationCompetences"><bpmn:incoming>Flow_Process_DeveloppementLogiciel_1</bpmn:incoming><bpmn:outgoing>Flow_Process_DeveloppementLogiciel_2</bpmn:outgoing></bpmn:callActivity>
    <bpmn:task id="Task_Dev_1" name="[CDP] Cadrer le besoin et les exigences"><bpmn:incoming>Flow_Process_DeveloppementLogiciel_2</bpmn:incoming><bpmn:outgoing>Flow_Process_DeveloppementLogiciel_3</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Dev_2" name="[DT] Concevoir l'architecture et la solution"><bpmn:incoming>Flow_Process_DeveloppementLogiciel_3</bpmn:incoming><bpmn:outgoing>Flow_Process_DeveloppementLogiciel_4</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Dev_3" name="[Équipe de développement] Réaliser le logiciel"><bpmn:incoming>Flow_Process_DeveloppementLogiciel_4</bpmn:incoming><bpmn:outgoing>Flow_Process_DeveloppementLogiciel_5</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Dev_4" name="[DT] Vérifier et valider la qualité"><bpmn:incoming>Flow_Process_DeveloppementLogiciel_5</bpmn:incoming><bpmn:outgoing>Flow_Process_DeveloppementLogiciel_6</bpmn:outgoing></bpmn:task>
    <bpmn:task id="Task_Dev_5" name="[DO] Organiser la livraison et le retour d'expérience"><bpmn:incoming>Flow_Process_DeveloppementLogiciel_6</bpmn:incoming><bpmn:outgoing>Flow_Process_DeveloppementLogiciel_7</bpmn:outgoing></bpmn:task>
    <bpmn:endEvent id="End_Process_DeveloppementLogiciel" name="Fin"><bpmn:incoming>Flow_Process_DeveloppementLogiciel_7</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_Process_DeveloppementLogiciel_0" sourceRef="Start_Process_DeveloppementLogiciel" targetRef="Call_Gouvernance"/>
    <bpmn:sequenceFlow id="Flow_Process_DeveloppementLogiciel_1" sourceRef="Call_Gouvernance" targetRef="Call_EvaluationCompetences"/>
    <bpmn:sequenceFlow id="Flow_Process_DeveloppementLogiciel_2" sourceRef="Call_EvaluationCompetences" targetRef="Task_Dev_1"/>
    <bpmn:sequenceFlow id="Flow_Process_DeveloppementLogiciel_3" sourceRef="Task_Dev_1" targetRef="Task_Dev_2"/>
    <bpmn:sequenceFlow id="Flow_Process_DeveloppementLogiciel_4" sourceRef="Task_Dev_2" targetRef="Task_Dev_3"/>
    <bpmn:sequenceFlow id="Flow_Process_DeveloppementLogiciel_5" sourceRef="Task_Dev_3" targetRef="Task_Dev_4"/>
    <bpmn:sequenceFlow id="Flow_Process_DeveloppementLogiciel_6" sourceRef="Task_Dev_4" targetRef="Task_Dev_5"/>
    <bpmn:sequenceFlow id="Flow_Process_DeveloppementLogiciel_7" sourceRef="Task_Dev_5" targetRef="End_Process_DeveloppementLogiciel"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_DeveloppementLogiciel"><bpmndi:BPMNPlane id="Plane_Process_DeveloppementLogiciel" bpmnElement="Process_DeveloppementLogiciel">
    <bpmndi:BPMNShape id="Start_Process_DeveloppementLogiciel_di" bpmnElement="Start_Process_DeveloppementLogiciel"><dc:Bounds x="55" y="172" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Call_Gouvernance_di" bpmnElement="Call_Gouvernance"><dc:Bounds x="140" y="150" width="145" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Call_EvaluationCompetences_di" bpmnElement="Call_EvaluationCompetences"><dc:Bounds x="310" y="150" width="145" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Dev_1_di" bpmnElement="Task_Dev_1"><dc:Bounds x="480" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Dev_2_di" bpmnElement="Task_Dev_2"><dc:Bounds x="650" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Dev_3_di" bpmnElement="Task_Dev_3"><dc:Bounds x="820" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Dev_4_di" bpmnElement="Task_Dev_4"><dc:Bounds x="990" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Task_Dev_5_di" bpmnElement="Task_Dev_5"><dc:Bounds x="1160" y="150" width="125" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="End_Process_DeveloppementLogiciel_di" bpmnElement="End_Process_DeveloppementLogiciel"><dc:Bounds x="1330" y="172" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_Process_DeveloppementLogiciel_0_di" bpmnElement="Flow_Process_DeveloppementLogiciel_0"><di:waypoint x="91" y="190"/><di:waypoint x="140" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_DeveloppementLogiciel_1_di" bpmnElement="Flow_Process_DeveloppementLogiciel_1"><di:waypoint x="285" y="190"/><di:waypoint x="310" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_DeveloppementLogiciel_2_di" bpmnElement="Flow_Process_DeveloppementLogiciel_2"><di:waypoint x="455" y="190"/><di:waypoint x="480" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_DeveloppementLogiciel_3_di" bpmnElement="Flow_Process_DeveloppementLogiciel_3"><di:waypoint x="605" y="190"/><di:waypoint x="650" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_DeveloppementLogiciel_4_di" bpmnElement="Flow_Process_DeveloppementLogiciel_4"><di:waypoint x="775" y="190"/><di:waypoint x="820" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_DeveloppementLogiciel_5_di" bpmnElement="Flow_Process_DeveloppementLogiciel_5"><di:waypoint x="945" y="190"/><di:waypoint x="990" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_DeveloppementLogiciel_6_di" bpmnElement="Flow_Process_DeveloppementLogiciel_6"><di:waypoint x="1115" y="190"/><di:waypoint x="1160" y="190"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge id="Flow_Process_DeveloppementLogiciel_7_di" bpmnElement="Flow_Process_DeveloppementLogiciel_7"><di:waypoint x="1285" y="190"/><di:waypoint x="1330" y="190"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>
$orgbpmn5$,NULL,'demo-seed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_processes (id, "createdBy", "projectId", "resourceId", usage, "sourceResourceId") VALUES
 ('74000000-0000-4000-8000-000000000001','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000005','common',NULL),
 ('74000000-0000-4000-8000-000000000002','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000006','common',NULL),
 ('74000000-0000-4000-8000-000000000003','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000007','common',NULL),
 ('74000000-0000-4000-8000-000000000004','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','project-specific',NULL),
 ('74000000-0000-4000-8000-000000000005','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','project-specific',NULL)
ON CONFLICT ("projectId","resourceId") DO NOTHING;

INSERT INTO project_raci_actors (id, "createdBy", "projectId", name, "normalizedName", active, origin) VALUES
 ('75000000-0000-4000-8000-000000000001','demo-seed','70000000-0000-4000-8000-000000000001','Direction générale (DG)','direction générale (dg)',true,'manual'),
 ('75000000-0000-4000-8000-000000000002','demo-seed','70000000-0000-4000-8000-000000000001','Direction technique (DT)','direction technique (dt)',true,'manual'),
 ('75000000-0000-4000-8000-000000000003','demo-seed','70000000-0000-4000-8000-000000000001','Direction des opérations (DO)','direction des opérations (do)',true,'manual'),
 ('75000000-0000-4000-8000-000000000004','demo-seed','70000000-0000-4000-8000-000000000001','Chef de projet (CDP)','chef de projet (cdp)',true,'manual'),
 ('75000000-0000-4000-8000-000000000005','demo-seed','70000000-0000-4000-8000-000000000001','Équipe de développement','équipe de développement',true,'manual')
ON CONFLICT ("projectId","normalizedName") DO NOTHING;

INSERT INTO project_raci_entries (id, "createdBy", "projectId", "resourceId", "taskId", "taskName", "actorName", role) VALUES
 ('76000000-0000-4000-8000-000000000001','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Task_Gouv_1','Consolider les projections de chiffre d''affaires','Direction générale (DG)','R'),
 ('76000000-0000-4000-8000-000000000002','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Task_Gouv_1','Consolider les projections de chiffre d''affaires','Direction des opérations (DO)','A'),
 ('76000000-0000-4000-8000-000000000003','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Task_Gouv_2','Traduire les projections en charge prévisionnelle','Direction des opérations (DO)','R'),
 ('76000000-0000-4000-8000-000000000004','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Task_Gouv_2','Traduire les projections en charge prévisionnelle','Direction générale (DG)','A'),
 ('76000000-0000-4000-8000-000000000005','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Task_Gouv_3','Évaluer les capacités et compétences disponibles','Direction technique (DT)','R'),
 ('76000000-0000-4000-8000-000000000006','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Task_Gouv_3','Évaluer les capacités et compétences disponibles','Chef de projet (CDP)','C'),
 ('76000000-0000-4000-8000-000000000007','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Call_Recrutement','Plan de recrutement — déclencher le processus Recrutement','Direction des opérations (DO)','R'),
 ('76000000-0000-4000-8000-000000000008','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Call_Recrutement','Plan de recrutement — déclencher le processus Recrutement','Direction générale (DG)','A'),
 ('76000000-0000-4000-8000-000000000009','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Call_Formation','Besoins en formation — déclencher le processus Formation','Direction technique (DT)','R'),
 ('76000000-0000-4000-8000-000000000010','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Call_Formation','Besoins en formation — déclencher le processus Formation','Direction générale (DG)','A'),
 ('76000000-0000-4000-8000-000000000011','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Task_Gouv_4','Arbitrer et valider le plan de capacité','Direction générale (DG)','A'),
 ('76000000-0000-4000-8000-000000000012','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000008','Task_Gouv_4','Arbitrer et valider le plan de capacité','Direction des opérations (DO)','R'),
 ('76000000-0000-4000-8000-000000000013','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Call_Gouvernance','Vérifier capacité et arbitrages — Gouvernance','Chef de projet (CDP)','R'),
 ('76000000-0000-4000-8000-000000000014','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Call_Gouvernance','Vérifier capacité et arbitrages — Gouvernance','Direction générale (DG)','A'),
 ('76000000-0000-4000-8000-000000000015','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Call_EvaluationCompetences','Vérifier les compétences requises','Direction technique (DT)','R'),
 ('76000000-0000-4000-8000-000000000016','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Call_EvaluationCompetences','Vérifier les compétences requises','Chef de projet (CDP)','A'),
 ('76000000-0000-4000-8000-000000000017','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Task_Dev_1','Cadrer le besoin et les exigences','Chef de projet (CDP)','R'),
 ('76000000-0000-4000-8000-000000000018','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Task_Dev_1','Cadrer le besoin et les exigences','Direction des opérations (DO)','A'),
 ('76000000-0000-4000-8000-000000000019','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Task_Dev_2','Concevoir l''architecture et la solution','Direction technique (DT)','A'),
 ('76000000-0000-4000-8000-000000000020','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Task_Dev_2','Concevoir l''architecture et la solution','Chef de projet (CDP)','R'),
 ('76000000-0000-4000-8000-000000000021','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Task_Dev_3','Réaliser le logiciel','Équipe de développement','R'),
 ('76000000-0000-4000-8000-000000000022','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Task_Dev_3','Réaliser le logiciel','Direction technique (DT)','A'),
 ('76000000-0000-4000-8000-000000000023','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Task_Dev_4','Vérifier et valider la qualité','Direction technique (DT)','R'),
 ('76000000-0000-4000-8000-000000000024','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Task_Dev_4','Vérifier et valider la qualité','Direction des opérations (DO)','A'),
 ('76000000-0000-4000-8000-000000000025','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Task_Dev_5','Organiser la livraison et le retour d''expérience','Direction des opérations (DO)','R'),
 ('76000000-0000-4000-8000-000000000026','demo-seed','70000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000009','Task_Dev_5','Organiser la livraison et le retour d''expérience','Chef de projet (CDP)','A')
ON CONFLICT (id) DO NOTHING;

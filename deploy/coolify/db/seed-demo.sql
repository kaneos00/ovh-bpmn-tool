-- Demo-only data. This script runs only on first initialization of the dedicated DB volume.
INSERT INTO projects (id, "createdBy", name, description) VALUES
 ('10000000-0000-4000-8000-000000000001','demo-seed','Projet Démonstration V2','Projet présentant les processus spécifiques et la matrice RACI.'),
 ('10000000-0000-4000-8000-000000000002','demo-seed','Projet Partenaire','Second projet illustrant le partage et une variante indépendante.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_members (id,"createdBy","projectId","userId",role) VALUES
 ('11000000-0000-4000-8000-000000000001','demo-seed','10000000-0000-4000-8000-000000000001',:'demo_user','admin'),
 ('11000000-0000-4000-8000-000000000002','demo-seed','10000000-0000-4000-8000-000000000002',:'demo_user','admin')
ON CONFLICT ("projectId","userId") DO NOTHING;

INSERT INTO resources (id,"createdBy",name,description,depth,"parentId","authToken",type) VALUES
 ('20000000-0000-4000-8000-000000000001','demo-seed','Démonstration BPMN V2','Dossier contenant les exemples de processus.',0,NULL,NULL,'folder'),
 ('20000000-0000-4000-8000-000000000002','demo-seed','Traiter une demande','Processus commun partagé par les deux projets.',1,'20000000-0000-4000-8000-000000000001',NULL,'process'),
 ('20000000-0000-4000-8000-000000000003','demo-seed','Valider une demande','Processus spécifique au premier projet.',1,'20000000-0000-4000-8000-000000000001',NULL,'process'),
 ('20000000-0000-4000-8000-000000000004','demo-seed','Traiter une demande — variante partenaire','Variante indépendante du processus commun.',1,'20000000-0000-4000-8000-000000000001',NULL,'process')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES
 ('30000000-0000-4000-8000-000000000001','demo-seed','20000000-0000-4000-8000-000000000002','published',1,
$bpmn$<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="https://example.invalid/bpmn/demo">
 <process id="Process_CommonRequest" name="Traiter une demande" isExecutable="false">
  <startEvent id="Start_Common" name="Demande reçue"/><sequenceFlow id="Flow_Common_1" sourceRef="Start_Common" targetRef="Task_ProcessRequest"/><task id="Task_ProcessRequest" name="Qualifier la demande"/><sequenceFlow id="Flow_Common_2" sourceRef="Task_ProcessRequest" targetRef="End_Common"/><endEvent id="End_Common" name="Demande qualifiée"/>
 </process>
 <bpmndi:BPMNDiagram id="Diagram_Common"><bpmndi:BPMNPlane id="Plane_Common" bpmnElement="Process_CommonRequest">
  <bpmndi:BPMNShape id="Start_Common_di" bpmnElement="Start_Common"><dc:Bounds x="120" y="100" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_ProcessRequest_di" bpmnElement="Task_ProcessRequest"><dc:Bounds x="220" y="78" width="120" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_Common_di" bpmnElement="End_Common"><dc:Bounds x="410" y="100" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_Common_1_di" bpmnElement="Flow_Common_1"><di:waypoint x="156" y="118"/><di:waypoint x="220" y="118"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_Common_2_di" bpmnElement="Flow_Common_2"><di:waypoint x="340" y="118"/><di:waypoint x="410" y="118"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</definitions>$bpmn$,NULL,'demo-seed'),
 ('30000000-0000-4000-8000-000000000002','demo-seed','20000000-0000-4000-8000-000000000003','published',1,
$bpmn$<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="https://example.invalid/bpmn/demo">
 <process id="Process_ValidateRequest" name="Valider une demande" isExecutable="false">
  <startEvent id="Start_Validate" name="Dossier complet"/><sequenceFlow id="Flow_Validate_1" sourceRef="Start_Validate" targetRef="Task_ValidateRequest"/><task id="Task_ValidateRequest" name="Valider la demande"/><sequenceFlow id="Flow_Validate_2" sourceRef="Task_ValidateRequest" targetRef="End_Validate"/><endEvent id="End_Validate" name="Décision rendue"/>
 </process>
 <bpmndi:BPMNDiagram id="Diagram_Validate"><bpmndi:BPMNPlane id="Plane_Validate" bpmnElement="Process_ValidateRequest">
  <bpmndi:BPMNShape id="Start_Validate_di" bpmnElement="Start_Validate"><dc:Bounds x="120" y="100" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_ValidateRequest_di" bpmnElement="Task_ValidateRequest"><dc:Bounds x="220" y="78" width="120" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_Validate_di" bpmnElement="End_Validate"><dc:Bounds x="410" y="100" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_Validate_1_di" bpmnElement="Flow_Validate_1"><di:waypoint x="156" y="118"/><di:waypoint x="220" y="118"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_Validate_2_di" bpmnElement="Flow_Validate_2"><di:waypoint x="340" y="118"/><di:waypoint x="410" y="118"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</definitions>$bpmn$,NULL,'demo-seed'),
 ('30000000-0000-4000-8000-000000000003','demo-seed','20000000-0000-4000-8000-000000000004','published',1,
$bpmn$<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="https://example.invalid/bpmn/demo">
 <process id="Process_PartnerVariant" name="Traiter une demande — variante partenaire" isExecutable="false">
  <startEvent id="Start_Partner" name="Demande reçue"/><sequenceFlow id="Flow_Partner_1" sourceRef="Start_Partner" targetRef="Task_ReviewRequest"/><task id="Task_ReviewRequest" name="Revoir la demande"/><sequenceFlow id="Flow_Partner_2" sourceRef="Task_ReviewRequest" targetRef="End_Partner"/><endEvent id="End_Partner" name="Demande revue"/>
 </process>
 <bpmndi:BPMNDiagram id="Diagram_Partner"><bpmndi:BPMNPlane id="Plane_Partner" bpmnElement="Process_PartnerVariant">
  <bpmndi:BPMNShape id="Start_Partner_di" bpmnElement="Start_Partner"><dc:Bounds x="120" y="100" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_ReviewRequest_di" bpmnElement="Task_ReviewRequest"><dc:Bounds x="220" y="78" width="120" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_Partner_di" bpmnElement="End_Partner"><dc:Bounds x="410" y="100" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_Partner_1_di" bpmnElement="Flow_Partner_1"><di:waypoint x="156" y="118"/><di:waypoint x="220" y="118"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_Partner_2_di" bpmnElement="Flow_Partner_2"><di:waypoint x="340" y="118"/><di:waypoint x="410" y="118"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</definitions>$bpmn$,NULL,'demo-seed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_processes (id,"createdBy","projectId","resourceId",usage,"sourceResourceId") VALUES
 ('40000000-0000-4000-8000-000000000001','demo-seed','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','common',NULL),
 ('40000000-0000-4000-8000-000000000002','demo-seed','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','common',NULL),
 ('40000000-0000-4000-8000-000000000003','demo-seed','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','project-specific',NULL),
 ('40000000-0000-4000-8000-000000000004','demo-seed','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000004','variant','20000000-0000-4000-8000-000000000002')
ON CONFLICT ("projectId","resourceId") DO NOTHING;

INSERT INTO project_raci_actors (id,"createdBy","projectId",name,"normalizedName",active,origin) VALUES
 ('50000000-0000-4000-8000-000000000001','demo-seed','10000000-0000-4000-8000-000000000001','Responsable métier','responsable métier',true,'manual'),
 ('50000000-0000-4000-8000-000000000002','demo-seed','10000000-0000-4000-8000-000000000001','Équipe opérations','équipe opérations',true,'manual'),
 ('50000000-0000-4000-8000-000000000003','demo-seed','10000000-0000-4000-8000-000000000001','Direction de projet','direction de projet',true,'manual'),
 ('50000000-0000-4000-8000-000000000004','demo-seed','10000000-0000-4000-8000-000000000001','Conformité','conformité',true,'manual'),
 ('50000000-0000-4000-8000-000000000005','demo-seed','10000000-0000-4000-8000-000000000002','Chef de projet partenaire','chef de projet partenaire',true,'manual'),
 ('50000000-0000-4000-8000-000000000006','demo-seed','10000000-0000-4000-8000-000000000002','Équipe support','équipe support',true,'manual')
ON CONFLICT ("projectId","normalizedName") DO NOTHING;

INSERT INTO project_raci_entries (id,"createdBy","projectId","resourceId","taskId","taskName","actorName",role) VALUES
 ('60000000-0000-4000-8000-000000000001','demo-seed','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','Task_ValidateRequest','Valider la demande','Responsable métier','R'),
 ('60000000-0000-4000-8000-000000000002','demo-seed','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','Task_ValidateRequest','Valider la demande','Direction de projet','A'),
 ('60000000-0000-4000-8000-000000000003','demo-seed','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','Task_ValidateRequest','Valider la demande','Équipe opérations','C'),
 ('60000000-0000-4000-8000-000000000004','demo-seed','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','Task_ValidateRequest','Valider la demande','Conformité','I'),
 ('60000000-0000-4000-8000-000000000005','demo-seed','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000004','Task_ReviewRequest','Revoir la demande','Chef de projet partenaire','R'),
 ('60000000-0000-4000-8000-000000000006','demo-seed','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000004','Task_ReviewRequest','Revoir la demande','Équipe support','A')
ON CONFLICT (id) DO NOTHING;

-- KHI-FLOWS reference dataset: independent fictional IT services company.
-- Explicitly run only against the intended database. Never included in the default demo seed.
-- Usage: psql ... --set=demo_user=... --file=seed.sql
BEGIN;


INSERT INTO projects (id,"createdBy",name,description) VALUES ('8a000000-0000-4000-8000-000000000001','reference-seed','Référence métier — ESN NovaSys','Projet de référence autonome : organisation fictive de services numériques, processus transverses, RACI et informations documentées.') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;

INSERT INTO project_members (id,"createdBy","projectId","userId",role,"canSubmitRemarks") VALUES ('8a000001-0000-4000-8000-000000000001','reference-seed','8a000000-0000-4000-8000-000000000001', :'demo_user','admin',TRUE) ON CONFLICT ("projectId","userId") DO UPDATE SET "canSubmitRemarks"=TRUE;

INSERT INTO resources (id,"createdBy",name,description,depth,"parentId","authToken",type) VALUES
('8b000000-0000-4000-8000-000000000001','reference-seed','Référence métier — ESN NovaSys','Référentiel complet de processus et données fictives.',0,NULL,NULL,'folder'),
('8b000000-0000-4000-8000-000000000002','reference-seed','Gouvernance et pilotage','Famille de processus : Gouvernance et pilotage.',1,'8b000000-0000-4000-8000-000000000001',NULL,'folder'),
('8b000000-0000-4000-8000-000000000003','reference-seed','Ressources humaines','Famille de processus : Ressources humaines.',1,'8b000000-0000-4000-8000-000000000001',NULL,'folder'),
('8b000000-0000-4000-8000-000000000004','reference-seed','Finance et administration','Famille de processus : Finance et administration.',1,'8b000000-0000-4000-8000-000000000001',NULL,'folder'),
('8b000000-0000-4000-8000-000000000005','reference-seed','Systèmes d''information internes','Famille de processus : Systèmes d''information internes.',1,'8b000000-0000-4000-8000-000000000001',NULL,'folder'),
('8b000000-0000-4000-8000-000000000006','reference-seed','Conception et réalisation logicielle','Famille de processus : Conception et réalisation logicielle.',1,'8b000000-0000-4000-8000-000000000001',NULL,'folder'),
('8b000000-0000-4000-8000-000000000007','reference-seed','Maintenance des logiciels livrés','Famille de processus : Maintenance des logiciels livrés.',1,'8b000000-0000-4000-8000-000000000001',NULL,'folder'),
('8b000001-0000-4000-8000-000000000001','reference-seed','Piloter l''entreprise et les capacités','Budget, portefeuille et plan de capacité',2,'8b000000-0000-4000-8000-000000000002',NULL,'process'),
('8b000001-0000-4000-8000-000000000002','reference-seed','Gérer une opportunité et contractualiser','Qualification, offre, commande et contrat client',2,'8b000000-0000-4000-8000-000000000002',NULL,'process'),
('8b000001-0000-4000-8000-000000000003','reference-seed','Piloter un projet client','Lancement, planification, suivi, risques et clôture',2,'8b000000-0000-4000-8000-000000000002',NULL,'process'),
('8b000001-0000-4000-8000-000000000004','reference-seed','Gérer les commandes clients et la facturation','Réception commande, jalons, validation du service fait et déclenchement facture',2,'8b000000-0000-4000-8000-000000000002',NULL,'process'),
('8b000001-0000-4000-8000-000000000005','reference-seed','Recruter un collaborateur','Besoin, validation, sélection et proposition',2,'8b000000-0000-4000-8000-000000000003',NULL,'process'),
('8b000001-0000-4000-8000-000000000006','reference-seed','Établir et signer le contrat de travail','Préparer, vérifier, signer et archiver le contrat',2,'8b000000-0000-4000-8000-000000000003',NULL,'process'),
('8b000001-0000-4000-8000-000000000007','reference-seed','Réaliser l''intégration d''un collaborateur','Préparer l''arrivée, accès, matériel, accueil et période d''essai',2,'8b000000-0000-4000-8000-000000000003',NULL,'process'),
('8b000001-0000-4000-8000-000000000008','reference-seed','Commander et attribuer un équipement','Demande, achat, inventaire, remise et restitution',2,'8b000000-0000-4000-8000-000000000003',NULL,'process'),
('8b000001-0000-4000-8000-000000000009','reference-seed','Gérer les affectations aux projets','Compétences, disponibilité, affectation et fin de mission',2,'8b000000-0000-4000-8000-000000000003',NULL,'process'),
('8b000001-0000-4000-8000-000000000010','reference-seed','Gérer les absences et congés','Demande, validation hiérarchique et transmission paie',2,'8b000000-0000-4000-8000-000000000003',NULL,'process'),
('8b000001-0000-4000-8000-000000000011','reference-seed','Réaliser les entretiens et évaluations','Préparation, entretien, objectifs et plan d''action',2,'8b000000-0000-4000-8000-000000000003',NULL,'process'),
('8b000001-0000-4000-8000-000000000012','reference-seed','Gérer les formations et compétences','Recueillir les besoins, planifier et évaluer',2,'8b000000-0000-4000-8000-000000000003',NULL,'process'),
('8b000001-0000-4000-8000-000000000013','reference-seed','Traiter les notes de frais','Dépôt, contrôle justificatifs, validation et remboursement',2,'8b000000-0000-4000-8000-000000000004',NULL,'process'),
('8b000001-0000-4000-8000-000000000014','reference-seed','Préparer et exécuter la paie','Collecter variables, contrôler, valider et produire bulletins',2,'8b000000-0000-4000-8000-000000000004',NULL,'process'),
('8b000001-0000-4000-8000-000000000015','reference-seed','Acheter un bien ou un service','Expression du besoin, consultation, commande et réception',2,'8b000000-0000-4000-8000-000000000004',NULL,'process'),
('8b000001-0000-4000-8000-000000000016','reference-seed','Suivre le temps et la rentabilité projet','Saisie temps, contrôle, analyse budget et marge',2,'8b000000-0000-4000-8000-000000000004',NULL,'process'),
('8b000001-0000-4000-8000-000000000017','reference-seed','Traiter un ticket de support interne','Enregistrer, qualifier, prioriser, résoudre ou escalader, valider et clôturer',2,'8b000000-0000-4000-8000-000000000005',NULL,'process'),
('8b000001-0000-4000-8000-000000000018','reference-seed','Gérer le parc et le cycle de vie matériel','Inventorier, affecter, maintenir, restituer et réformer',2,'8b000000-0000-4000-8000-000000000005',NULL,'process'),
('8b000001-0000-4000-8000-000000000019','reference-seed','Gérer les accès et habilitations','Demander, approuver, provisionner, revoir et révoquer les accès',2,'8b000000-0000-4000-8000-000000000005',NULL,'process'),
('8b000001-0000-4000-8000-000000000020','reference-seed','Gérer les sauvegardes et restaurations','Planifier, surveiller, tester et restaurer',2,'8b000000-0000-4000-8000-000000000005',NULL,'process'),
('8b000001-0000-4000-8000-000000000021','reference-seed','Recueillir et valider les exigences client','Ateliers, exigences, priorisation et validation',2,'8b000000-0000-4000-8000-000000000006',NULL,'process'),
('8b000001-0000-4000-8000-000000000022','reference-seed','Concevoir et développer un logiciel','Conception, développement, revue de code et intégration',2,'8b000000-0000-4000-8000-000000000006',NULL,'process'),
('8b000001-0000-4000-8000-000000000023','reference-seed','Réaliser les tests internes','Stratégie, tests, anomalies et décision de livraison',2,'8b000000-0000-4000-8000-000000000006',NULL,'process'),
('8b000001-0000-4000-8000-000000000024','reference-seed','Organiser la recette et l''acceptation client','Livrer en recette, exécuter UAT, traiter réserves et obtenir PV',2,'8b000000-0000-4000-8000-000000000006',NULL,'process'),
('8b000001-0000-4000-8000-000000000025','reference-seed','Déployer et livrer une version','Préparer release, approuver changement, déployer et vérifier',2,'8b000000-0000-4000-8000-000000000006',NULL,'process'),
('8b000001-0000-4000-8000-000000000026','reference-seed','Gérer le service et la maintenance du logiciel','Organiser la prise en charge et piloter incidents, correctifs, évolutions, versions et revues',2,'8b000000-0000-4000-8000-000000000007',NULL,'process'),
('8b000001-0000-4000-8000-000000000027','reference-seed','Prendre en charge un logiciel livré','Transfert projet-maintenance, inventaire versions, SLA et supervision',2,'8b000000-0000-4000-8000-000000000007',NULL,'process'),
('8b000001-0000-4000-8000-000000000028','reference-seed','Traiter les incidents et demandes clients','Enregistrer, qualifier, prioriser, diagnostiquer, escalader et confirmer la résolution',2,'8b000000-0000-4000-8000-000000000007',NULL,'process'),
('8b000001-0000-4000-8000-000000000029','reference-seed','Réaliser une maintenance corrective','Reproduire, analyser, corriger, tester et livrer le correctif',2,'8b000000-0000-4000-8000-000000000007',NULL,'process'),
('8b000001-0000-4000-8000-000000000030','reference-seed','Gérer une demande d''évolution','Analyser impact, chiffrer, faire approuver et intégrer au backlog',2,'8b000000-0000-4000-8000-000000000007',NULL,'process'),
('8b000001-0000-4000-8000-000000000031','reference-seed','Gérer une version et une mise en production','Préparer, approuver, déployer, contrôler et revenir arrière si besoin',2,'8b000000-0000-4000-8000-000000000007',NULL,'process'),
('8b000001-0000-4000-8000-000000000032','reference-seed','Réaliser la revue périodique de service','Mesurer SLA, incidents, disponibilité, satisfaction et actions préventives',2,'8b000000-0000-4000-8000-000000000007',NULL,'process'),
('8b000001-0000-4000-8000-000000000033','reference-seed','Clôturer la maintenance et organiser la réversibilité','Informer, transférer données et connaissances, révoquer accès et clôturer',2,'8b000000-0000-4000-8000-000000000007',NULL,'process')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, depth=EXCLUDED.depth, "parentId"=EXCLUDED."parentId", type=EXCLUDED.type;

UPDATE resources
SET "processMetadata" = COALESCE("processMetadata", '{}'::jsonb) || jsonb_build_object(
  'nature', 'specific',
  'family', CASE "parentId"
    WHEN '8b000000-0000-4000-8000-000000000002' THEN 'GOV'
    WHEN '8b000000-0000-4000-8000-000000000003' THEN 'HR'
    WHEN '8b000000-0000-4000-8000-000000000004' THEN 'FIN'
    WHEN '8b000000-0000-4000-8000-000000000005' THEN 'IT'
    WHEN '8b000000-0000-4000-8000-000000000006' THEN 'DEL'
    WHEN '8b000000-0000-4000-8000-000000000007' THEN 'MNT'
  END
)
WHERE type = 'process'
  AND "parentId" IN (
    '8b000000-0000-4000-8000-000000000002',
    '8b000000-0000-4000-8000-000000000003',
    '8b000000-0000-4000-8000-000000000004',
    '8b000000-0000-4000-8000-000000000005',
    '8b000000-0000-4000-8000-000000000006',
    '8b000000-0000-4000-8000-000000000007'
  );

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000001','reference-seed','8b000001-0000-4000-8000-000000000001','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_GOV01" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_GOV01" name="Piloter l''entreprise et les capacités" isExecutable="false">
  <bpmn:startEvent id="Start_GOV01" name="Début"><bpmn:outgoing>Flow_GOV01_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_GOV01_1" name="[Direction générale] Qualifier et planifier le besoin"><bpmn:incoming>Flow_GOV01_1</bpmn:incoming><bpmn:outgoing>Flow_GOV01_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_GOV01_2" name="[Direction générale] Réaliser et contrôler les activités"><bpmn:incoming>Flow_GOV01_2</bpmn:incoming><bpmn:outgoing>Flow_GOV01_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_GOV01_3" name="[Direction générale] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_GOV01_3</bpmn:incoming><bpmn:outgoing>Flow_GOV01_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_GOV01" name="Fin"><bpmn:incoming>Flow_GOV01_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_GOV01_1" sourceRef="Start_GOV01" targetRef="Task_GOV01_1"/>
  <bpmn:sequenceFlow id="Flow_GOV01_2" sourceRef="Task_GOV01_1" targetRef="Task_GOV01_2"/>
  <bpmn:sequenceFlow id="Flow_GOV01_3" sourceRef="Task_GOV01_2" targetRef="Task_GOV01_3"/>
  <bpmn:sequenceFlow id="Flow_GOV01_4" sourceRef="Task_GOV01_3" targetRef="End_GOV01"/>
  <bpmn:dataObject id="Data_GOV01_1" name="Budget annuel"/><bpmn:dataObjectReference id="DataRef_GOV01_1" dataObjectRef="Data_GOV01_1" name="Budget annuel"/>
  <bpmn:dataObject id="Data_GOV01_2" name="Tableau de bord de capacité"/><bpmn:dataObjectReference id="DataRef_GOV01_2" dataObjectRef="Data_GOV01_2" name="Tableau de bord de capacité"/>
  <bpmn:association id="Assoc_GOV01_1" sourceRef="Task_GOV01_1" targetRef="DataRef_GOV01_1" associationDirection="One"/>
  <bpmn:association id="Assoc_GOV01_2" sourceRef="Task_GOV01_2" targetRef="DataRef_GOV01_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_GOV01_ERP" dataStoreRef="Store_ERP" name="ERP et comptabilité"/><bpmn:association id="Assoc_GOV01_ERP" sourceRef="Task_GOV01_3" targetRef="DataStoreRef_GOV01_ERP" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_GOV01_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_GOV01_DOCS" sourceRef="Task_GOV01_3" targetRef="DataStoreRef_GOV01_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Budget, portefeuille et plan de capacité</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_GOV01"><bpmndi:BPMNPlane id="Plane_GOV01" bpmnElement="Process_GOV01">
  <bpmndi:BPMNShape id="Start_GOV01_di" bpmnElement="Start_GOV01"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV01_1_di" bpmnElement="Task_GOV01_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV01_2_di" bpmnElement="Task_GOV01_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV01_3_di" bpmnElement="Task_GOV01_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_GOV01_di" bpmnElement="End_GOV01"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_GOV01_1_di" bpmnElement="Flow_GOV01_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV01_2_di" bpmnElement="Flow_GOV01_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV01_3_di" bpmnElement="Flow_GOV01_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV01_4_di" bpmnElement="Flow_GOV01_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000002','reference-seed','8b000001-0000-4000-8000-000000000002','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_GOV02" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_GOV02" name="Gérer une opportunité et contractualiser" isExecutable="false">
  <bpmn:startEvent id="Start_GOV02" name="Début"><bpmn:outgoing>Flow_GOV02_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_GOV02_1" name="[Direction commerciale] Qualifier et planifier le besoin"><bpmn:incoming>Flow_GOV02_1</bpmn:incoming><bpmn:outgoing>Flow_GOV02_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_GOV02_2" name="[Direction commerciale] Réaliser et contrôler les activités"><bpmn:incoming>Flow_GOV02_2</bpmn:incoming><bpmn:outgoing>Flow_GOV02_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_GOV02_3" name="[Direction commerciale] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_GOV02_3</bpmn:incoming><bpmn:outgoing>Flow_GOV02_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_GOV02" name="Fin"><bpmn:incoming>Flow_GOV02_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_GOV02_1" sourceRef="Start_GOV02" targetRef="Task_GOV02_1"/>
  <bpmn:sequenceFlow id="Flow_GOV02_2" sourceRef="Task_GOV02_1" targetRef="Task_GOV02_2"/>
  <bpmn:sequenceFlow id="Flow_GOV02_3" sourceRef="Task_GOV02_2" targetRef="Task_GOV02_3"/>
  <bpmn:sequenceFlow id="Flow_GOV02_4" sourceRef="Task_GOV02_3" targetRef="End_GOV02"/>
  <bpmn:dataObject id="Data_GOV02_1" name="Fiche opportunité"/><bpmn:dataObjectReference id="DataRef_GOV02_1" dataObjectRef="Data_GOV02_1" name="Fiche opportunité"/>
  <bpmn:dataObject id="Data_GOV02_2" name="Offre commerciale"/><bpmn:dataObjectReference id="DataRef_GOV02_2" dataObjectRef="Data_GOV02_2" name="Offre commerciale"/>
  <bpmn:dataObject id="Data_GOV02_3" name="Contrat client"/><bpmn:dataObjectReference id="DataRef_GOV02_3" dataObjectRef="Data_GOV02_3" name="Contrat client"/>
  <bpmn:association id="Assoc_GOV02_1" sourceRef="Task_GOV02_1" targetRef="DataRef_GOV02_1" associationDirection="One"/>
  <bpmn:association id="Assoc_GOV02_2" sourceRef="Task_GOV02_2" targetRef="DataRef_GOV02_2" associationDirection="One"/>
  <bpmn:association id="Assoc_GOV02_3" sourceRef="Task_GOV02_3" targetRef="DataRef_GOV02_3" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_GOV02_ERP" dataStoreRef="Store_ERP" name="ERP et comptabilité"/><bpmn:association id="Assoc_GOV02_ERP" sourceRef="Task_GOV02_3" targetRef="DataStoreRef_GOV02_ERP" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_GOV02_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_GOV02_DOCS" sourceRef="Task_GOV02_3" targetRef="DataStoreRef_GOV02_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Qualification, offre, commande et contrat client</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_GOV02"><bpmndi:BPMNPlane id="Plane_GOV02" bpmnElement="Process_GOV02">
  <bpmndi:BPMNShape id="Start_GOV02_di" bpmnElement="Start_GOV02"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV02_1_di" bpmnElement="Task_GOV02_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV02_2_di" bpmnElement="Task_GOV02_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV02_3_di" bpmnElement="Task_GOV02_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_GOV02_di" bpmnElement="End_GOV02"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_GOV02_1_di" bpmnElement="Flow_GOV02_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV02_2_di" bpmnElement="Flow_GOV02_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV02_3_di" bpmnElement="Flow_GOV02_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV02_4_di" bpmnElement="Flow_GOV02_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000003','reference-seed','8b000001-0000-4000-8000-000000000003','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_GOV03" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_GOV03" name="Piloter un projet client" isExecutable="false">
  <bpmn:startEvent id="Start_GOV03" name="Début"><bpmn:outgoing>Flow_GOV03_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_GOV03_1" name="[Chef de projet] Qualifier et planifier le besoin"><bpmn:incoming>Flow_GOV03_1</bpmn:incoming><bpmn:outgoing>Flow_GOV03_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_GOV03_2" name="[Chef de projet] Réaliser et contrôler les activités"><bpmn:incoming>Flow_GOV03_2</bpmn:incoming><bpmn:outgoing>Flow_GOV03_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_GOV03_3" name="[Chef de projet] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_GOV03_3</bpmn:incoming><bpmn:outgoing>Flow_GOV03_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_GOV03" name="Fin"><bpmn:incoming>Flow_GOV03_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_GOV03_1" sourceRef="Start_GOV03" targetRef="Task_GOV03_1"/>
  <bpmn:sequenceFlow id="Flow_GOV03_2" sourceRef="Task_GOV03_1" targetRef="Task_GOV03_2"/>
  <bpmn:sequenceFlow id="Flow_GOV03_3" sourceRef="Task_GOV03_2" targetRef="Task_GOV03_3"/>
  <bpmn:sequenceFlow id="Flow_GOV03_4" sourceRef="Task_GOV03_3" targetRef="End_GOV03"/>
  <bpmn:dataObject id="Data_GOV03_1" name="Plan projet"/><bpmn:dataObjectReference id="DataRef_GOV03_1" dataObjectRef="Data_GOV03_1" name="Plan projet"/>
  <bpmn:dataObject id="Data_GOV03_2" name="Registre des risques"/><bpmn:dataObjectReference id="DataRef_GOV03_2" dataObjectRef="Data_GOV03_2" name="Registre des risques"/>
  <bpmn:dataObject id="Data_GOV03_3" name="Compte rendu projet"/><bpmn:dataObjectReference id="DataRef_GOV03_3" dataObjectRef="Data_GOV03_3" name="Compte rendu projet"/>
  <bpmn:association id="Assoc_GOV03_1" sourceRef="Task_GOV03_1" targetRef="DataRef_GOV03_1" associationDirection="One"/>
  <bpmn:association id="Assoc_GOV03_2" sourceRef="Task_GOV03_2" targetRef="DataRef_GOV03_2" associationDirection="One"/>
  <bpmn:association id="Assoc_GOV03_3" sourceRef="Task_GOV03_3" targetRef="DataRef_GOV03_3" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_GOV03_ERP" dataStoreRef="Store_ERP" name="ERP et comptabilité"/><bpmn:association id="Assoc_GOV03_ERP" sourceRef="Task_GOV03_3" targetRef="DataStoreRef_GOV03_ERP" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_GOV03_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_GOV03_DOCS" sourceRef="Task_GOV03_3" targetRef="DataStoreRef_GOV03_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Lancement, planification, suivi, risques et clôture</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_GOV03"><bpmndi:BPMNPlane id="Plane_GOV03" bpmnElement="Process_GOV03">
  <bpmndi:BPMNShape id="Start_GOV03_di" bpmnElement="Start_GOV03"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV03_1_di" bpmnElement="Task_GOV03_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV03_2_di" bpmnElement="Task_GOV03_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV03_3_di" bpmnElement="Task_GOV03_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_GOV03_di" bpmnElement="End_GOV03"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_GOV03_1_di" bpmnElement="Flow_GOV03_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV03_2_di" bpmnElement="Flow_GOV03_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV03_3_di" bpmnElement="Flow_GOV03_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV03_4_di" bpmnElement="Flow_GOV03_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000004','reference-seed','8b000001-0000-4000-8000-000000000004','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_GOV04" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_GOV04" name="Gérer les commandes clients et la facturation" isExecutable="false">
  <bpmn:startEvent id="Start_GOV04" name="Début"><bpmn:outgoing>Flow_GOV04_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_GOV04_1" name="[Responsable financier] Qualifier et planifier le besoin"><bpmn:incoming>Flow_GOV04_1</bpmn:incoming><bpmn:outgoing>Flow_GOV04_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_GOV04_2" name="[Responsable financier] Réaliser et contrôler les activités"><bpmn:incoming>Flow_GOV04_2</bpmn:incoming><bpmn:outgoing>Flow_GOV04_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_GOV04_3" name="[Responsable financier] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_GOV04_3</bpmn:incoming><bpmn:outgoing>Flow_GOV04_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_GOV04" name="Fin"><bpmn:incoming>Flow_GOV04_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_GOV04_1" sourceRef="Start_GOV04" targetRef="Task_GOV04_1"/>
  <bpmn:sequenceFlow id="Flow_GOV04_2" sourceRef="Task_GOV04_1" targetRef="Task_GOV04_2"/>
  <bpmn:sequenceFlow id="Flow_GOV04_3" sourceRef="Task_GOV04_2" targetRef="Task_GOV04_3"/>
  <bpmn:sequenceFlow id="Flow_GOV04_4" sourceRef="Task_GOV04_3" targetRef="End_GOV04"/>
  <bpmn:dataObject id="Data_GOV04_1" name="Bon de commande client"/><bpmn:dataObjectReference id="DataRef_GOV04_1" dataObjectRef="Data_GOV04_1" name="Bon de commande client"/>
  <bpmn:dataObject id="Data_GOV04_2" name="PV de livraison"/><bpmn:dataObjectReference id="DataRef_GOV04_2" dataObjectRef="Data_GOV04_2" name="PV de livraison"/>
  <bpmn:dataObject id="Data_GOV04_3" name="Dossier de facturation"/><bpmn:dataObjectReference id="DataRef_GOV04_3" dataObjectRef="Data_GOV04_3" name="Dossier de facturation"/>
  <bpmn:association id="Assoc_GOV04_1" sourceRef="Task_GOV04_1" targetRef="DataRef_GOV04_1" associationDirection="One"/>
  <bpmn:association id="Assoc_GOV04_2" sourceRef="Task_GOV04_2" targetRef="DataRef_GOV04_2" associationDirection="One"/>
  <bpmn:association id="Assoc_GOV04_3" sourceRef="Task_GOV04_3" targetRef="DataRef_GOV04_3" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_GOV04_ERP" dataStoreRef="Store_ERP" name="ERP et comptabilité"/><bpmn:association id="Assoc_GOV04_ERP" sourceRef="Task_GOV04_3" targetRef="DataStoreRef_GOV04_ERP" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_GOV04_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_GOV04_DOCS" sourceRef="Task_GOV04_3" targetRef="DataStoreRef_GOV04_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Réception commande, jalons, validation du service fait et déclenchement facture</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_GOV04"><bpmndi:BPMNPlane id="Plane_GOV04" bpmnElement="Process_GOV04">
  <bpmndi:BPMNShape id="Start_GOV04_di" bpmnElement="Start_GOV04"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV04_1_di" bpmnElement="Task_GOV04_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV04_2_di" bpmnElement="Task_GOV04_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_GOV04_3_di" bpmnElement="Task_GOV04_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_GOV04_di" bpmnElement="End_GOV04"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_GOV04_1_di" bpmnElement="Flow_GOV04_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV04_2_di" bpmnElement="Flow_GOV04_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV04_3_di" bpmnElement="Flow_GOV04_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_GOV04_4_di" bpmnElement="Flow_GOV04_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000005','reference-seed','8b000001-0000-4000-8000-000000000005','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_HR01" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_HR01" name="Recruter un collaborateur" isExecutable="false">
  <bpmn:startEvent id="Start_HR01" name="Début"><bpmn:outgoing>Flow_HR01_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_HR01_1" name="[Responsable RH] Qualifier et planifier le besoin"><bpmn:incoming>Flow_HR01_1</bpmn:incoming><bpmn:outgoing>Flow_HR01_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR01_2" name="[Responsable RH] Réaliser et contrôler les activités"><bpmn:incoming>Flow_HR01_2</bpmn:incoming><bpmn:outgoing>Flow_HR01_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR01_3" name="[Responsable RH] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_HR01_3</bpmn:incoming><bpmn:outgoing>Flow_HR01_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_HR01" name="Fin"><bpmn:incoming>Flow_HR01_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_HR01_1" sourceRef="Start_HR01" targetRef="Task_HR01_1"/>
  <bpmn:sequenceFlow id="Flow_HR01_2" sourceRef="Task_HR01_1" targetRef="Task_HR01_2"/>
  <bpmn:sequenceFlow id="Flow_HR01_3" sourceRef="Task_HR01_2" targetRef="Task_HR01_3"/>
  <bpmn:sequenceFlow id="Flow_HR01_4" sourceRef="Task_HR01_3" targetRef="End_HR01"/>
  <bpmn:dataObject id="Data_HR01_1" name="Demande de recrutement"/><bpmn:dataObjectReference id="DataRef_HR01_1" dataObjectRef="Data_HR01_1" name="Demande de recrutement"/>
  <bpmn:dataObject id="Data_HR01_2" name="Fiche de poste"/><bpmn:dataObjectReference id="DataRef_HR01_2" dataObjectRef="Data_HR01_2" name="Fiche de poste"/>
  <bpmn:association id="Assoc_HR01_1" sourceRef="Task_HR01_1" targetRef="DataRef_HR01_1" associationDirection="One"/>
  <bpmn:association id="Assoc_HR01_2" sourceRef="Task_HR01_2" targetRef="DataRef_HR01_2" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Besoin, validation, sélection et proposition</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_HR01"><bpmndi:BPMNPlane id="Plane_HR01" bpmnElement="Process_HR01">
  <bpmndi:BPMNShape id="Start_HR01_di" bpmnElement="Start_HR01"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR01_1_di" bpmnElement="Task_HR01_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR01_2_di" bpmnElement="Task_HR01_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR01_3_di" bpmnElement="Task_HR01_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_HR01_di" bpmnElement="End_HR01"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_HR01_1_di" bpmnElement="Flow_HR01_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR01_2_di" bpmnElement="Flow_HR01_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR01_3_di" bpmnElement="Flow_HR01_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR01_4_di" bpmnElement="Flow_HR01_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000006','reference-seed','8b000001-0000-4000-8000-000000000006','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_HR02" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_HR02" name="Établir et signer le contrat de travail" isExecutable="false">
  <bpmn:startEvent id="Start_HR02" name="Début"><bpmn:outgoing>Flow_HR02_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_HR02_1" name="[Responsable RH] Qualifier et planifier le besoin"><bpmn:incoming>Flow_HR02_1</bpmn:incoming><bpmn:outgoing>Flow_HR02_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR02_2" name="[Responsable RH] Réaliser et contrôler les activités"><bpmn:incoming>Flow_HR02_2</bpmn:incoming><bpmn:outgoing>Flow_HR02_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR02_3" name="[Responsable RH] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_HR02_3</bpmn:incoming><bpmn:outgoing>Flow_HR02_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_HR02" name="Fin"><bpmn:incoming>Flow_HR02_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_HR02_1" sourceRef="Start_HR02" targetRef="Task_HR02_1"/>
  <bpmn:sequenceFlow id="Flow_HR02_2" sourceRef="Task_HR02_1" targetRef="Task_HR02_2"/>
  <bpmn:sequenceFlow id="Flow_HR02_3" sourceRef="Task_HR02_2" targetRef="Task_HR02_3"/>
  <bpmn:sequenceFlow id="Flow_HR02_4" sourceRef="Task_HR02_3" targetRef="End_HR02"/>
  <bpmn:dataObject id="Data_HR02_1" name="Contrat de travail"/><bpmn:dataObjectReference id="DataRef_HR02_1" dataObjectRef="Data_HR02_1" name="Contrat de travail"/>
  <bpmn:dataObject id="Data_HR02_2" name="Preuve de signature"/><bpmn:dataObjectReference id="DataRef_HR02_2" dataObjectRef="Data_HR02_2" name="Preuve de signature"/>
  <bpmn:association id="Assoc_HR02_1" sourceRef="Task_HR02_1" targetRef="DataRef_HR02_1" associationDirection="One"/>
  <bpmn:association id="Assoc_HR02_2" sourceRef="Task_HR02_2" targetRef="DataRef_HR02_2" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Préparer, vérifier, signer et archiver le contrat</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_HR02"><bpmndi:BPMNPlane id="Plane_HR02" bpmnElement="Process_HR02">
  <bpmndi:BPMNShape id="Start_HR02_di" bpmnElement="Start_HR02"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR02_1_di" bpmnElement="Task_HR02_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR02_2_di" bpmnElement="Task_HR02_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR02_3_di" bpmnElement="Task_HR02_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_HR02_di" bpmnElement="End_HR02"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_HR02_1_di" bpmnElement="Flow_HR02_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR02_2_di" bpmnElement="Flow_HR02_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR02_3_di" bpmnElement="Flow_HR02_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR02_4_di" bpmnElement="Flow_HR02_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000007','reference-seed','8b000001-0000-4000-8000-000000000007','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_HR03" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_HR03" name="Réaliser l''intégration d''un collaborateur" isExecutable="false">
  <bpmn:startEvent id="Start_HR03" name="Début"><bpmn:outgoing>Flow_HR03_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_HR03_1" name="[Responsable RH] Qualifier et planifier le besoin"><bpmn:incoming>Flow_HR03_1</bpmn:incoming><bpmn:outgoing>Flow_HR03_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR03_2" name="[Responsable RH] Réaliser et contrôler les activités"><bpmn:incoming>Flow_HR03_2</bpmn:incoming><bpmn:outgoing>Flow_HR03_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR03_3" name="[Responsable RH] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_HR03_3</bpmn:incoming><bpmn:outgoing>Flow_HR03_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_HR03" name="Fin"><bpmn:incoming>Flow_HR03_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_HR03_1" sourceRef="Start_HR03" targetRef="Task_HR03_1"/>
  <bpmn:sequenceFlow id="Flow_HR03_2" sourceRef="Task_HR03_1" targetRef="Task_HR03_2"/>
  <bpmn:sequenceFlow id="Flow_HR03_3" sourceRef="Task_HR03_2" targetRef="Task_HR03_3"/>
  <bpmn:sequenceFlow id="Flow_HR03_4" sourceRef="Task_HR03_3" targetRef="End_HR03"/>
  <bpmn:dataObject id="Data_HR03_1" name="Parcours d''intégration"/><bpmn:dataObjectReference id="DataRef_HR03_1" dataObjectRef="Data_HR03_1" name="Parcours d''intégration"/>
  <bpmn:dataObject id="Data_HR03_2" name="Charte informatique signée"/><bpmn:dataObjectReference id="DataRef_HR03_2" dataObjectRef="Data_HR03_2" name="Charte informatique signée"/>
  <bpmn:association id="Assoc_HR03_1" sourceRef="Task_HR03_1" targetRef="DataRef_HR03_1" associationDirection="One"/>
  <bpmn:association id="Assoc_HR03_2" sourceRef="Task_HR03_2" targetRef="DataRef_HR03_2" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Préparer l''arrivée, accès, matériel, accueil et période d''essai</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_HR03"><bpmndi:BPMNPlane id="Plane_HR03" bpmnElement="Process_HR03">
  <bpmndi:BPMNShape id="Start_HR03_di" bpmnElement="Start_HR03"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR03_1_di" bpmnElement="Task_HR03_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR03_2_di" bpmnElement="Task_HR03_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR03_3_di" bpmnElement="Task_HR03_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_HR03_di" bpmnElement="End_HR03"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_HR03_1_di" bpmnElement="Flow_HR03_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR03_2_di" bpmnElement="Flow_HR03_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR03_3_di" bpmnElement="Flow_HR03_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR03_4_di" bpmnElement="Flow_HR03_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000008','reference-seed','8b000001-0000-4000-8000-000000000008','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_HR04" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_HR04" name="Commander et attribuer un équipement" isExecutable="false">
  <bpmn:startEvent id="Start_HR04" name="Début"><bpmn:outgoing>Flow_HR04_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_HR04_1" name="[Responsable moyens généraux] Qualifier et planifier le besoin"><bpmn:incoming>Flow_HR04_1</bpmn:incoming><bpmn:outgoing>Flow_HR04_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR04_2" name="[Responsable moyens généraux] Réaliser et contrôler les activités"><bpmn:incoming>Flow_HR04_2</bpmn:incoming><bpmn:outgoing>Flow_HR04_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR04_3" name="[Responsable moyens généraux] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_HR04_3</bpmn:incoming><bpmn:outgoing>Flow_HR04_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_HR04" name="Fin"><bpmn:incoming>Flow_HR04_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_HR04_1" sourceRef="Start_HR04" targetRef="Task_HR04_1"/>
  <bpmn:sequenceFlow id="Flow_HR04_2" sourceRef="Task_HR04_1" targetRef="Task_HR04_2"/>
  <bpmn:sequenceFlow id="Flow_HR04_3" sourceRef="Task_HR04_2" targetRef="Task_HR04_3"/>
  <bpmn:sequenceFlow id="Flow_HR04_4" sourceRef="Task_HR04_3" targetRef="End_HR04"/>
  <bpmn:dataObject id="Data_HR04_1" name="Demande d''achat"/><bpmn:dataObjectReference id="DataRef_HR04_1" dataObjectRef="Data_HR04_1" name="Demande d''achat"/>
  <bpmn:dataObject id="Data_HR04_2" name="Fiche inventaire"/><bpmn:dataObjectReference id="DataRef_HR04_2" dataObjectRef="Data_HR04_2" name="Fiche inventaire"/>
  <bpmn:dataObject id="Data_HR04_3" name="PV de remise et charte"/><bpmn:dataObjectReference id="DataRef_HR04_3" dataObjectRef="Data_HR04_3" name="PV de remise et charte"/>
  <bpmn:association id="Assoc_HR04_1" sourceRef="Task_HR04_1" targetRef="DataRef_HR04_1" associationDirection="One"/>
  <bpmn:association id="Assoc_HR04_2" sourceRef="Task_HR04_2" targetRef="DataRef_HR04_2" associationDirection="One"/>
  <bpmn:association id="Assoc_HR04_3" sourceRef="Task_HR04_3" targetRef="DataRef_HR04_3" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Demande, achat, inventaire, remise et restitution</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_HR04"><bpmndi:BPMNPlane id="Plane_HR04" bpmnElement="Process_HR04">
  <bpmndi:BPMNShape id="Start_HR04_di" bpmnElement="Start_HR04"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR04_1_di" bpmnElement="Task_HR04_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR04_2_di" bpmnElement="Task_HR04_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR04_3_di" bpmnElement="Task_HR04_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_HR04_di" bpmnElement="End_HR04"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_HR04_1_di" bpmnElement="Flow_HR04_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR04_2_di" bpmnElement="Flow_HR04_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR04_3_di" bpmnElement="Flow_HR04_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR04_4_di" bpmnElement="Flow_HR04_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000009','reference-seed','8b000001-0000-4000-8000-000000000009','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_HR05" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_HR05" name="Gérer les affectations aux projets" isExecutable="false">
  <bpmn:startEvent id="Start_HR05" name="Début"><bpmn:outgoing>Flow_HR05_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_HR05_1" name="[Direction des opérations] Qualifier et planifier le besoin"><bpmn:incoming>Flow_HR05_1</bpmn:incoming><bpmn:outgoing>Flow_HR05_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR05_2" name="[Direction des opérations] Réaliser et contrôler les activités"><bpmn:incoming>Flow_HR05_2</bpmn:incoming><bpmn:outgoing>Flow_HR05_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR05_3" name="[Direction des opérations] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_HR05_3</bpmn:incoming><bpmn:outgoing>Flow_HR05_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_HR05" name="Fin"><bpmn:incoming>Flow_HR05_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_HR05_1" sourceRef="Start_HR05" targetRef="Task_HR05_1"/>
  <bpmn:sequenceFlow id="Flow_HR05_2" sourceRef="Task_HR05_1" targetRef="Task_HR05_2"/>
  <bpmn:sequenceFlow id="Flow_HR05_3" sourceRef="Task_HR05_2" targetRef="Task_HR05_3"/>
  <bpmn:sequenceFlow id="Flow_HR05_4" sourceRef="Task_HR05_3" targetRef="End_HR05"/>
  <bpmn:dataObject id="Data_HR05_1" name="Matrice de compétences"/><bpmn:dataObjectReference id="DataRef_HR05_1" dataObjectRef="Data_HR05_1" name="Matrice de compétences"/>
  <bpmn:dataObject id="Data_HR05_2" name="Affectation projet"/><bpmn:dataObjectReference id="DataRef_HR05_2" dataObjectRef="Data_HR05_2" name="Affectation projet"/>
  <bpmn:association id="Assoc_HR05_1" sourceRef="Task_HR05_1" targetRef="DataRef_HR05_1" associationDirection="One"/>
  <bpmn:association id="Assoc_HR05_2" sourceRef="Task_HR05_2" targetRef="DataRef_HR05_2" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Compétences, disponibilité, affectation et fin de mission</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_HR05"><bpmndi:BPMNPlane id="Plane_HR05" bpmnElement="Process_HR05">
  <bpmndi:BPMNShape id="Start_HR05_di" bpmnElement="Start_HR05"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR05_1_di" bpmnElement="Task_HR05_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR05_2_di" bpmnElement="Task_HR05_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR05_3_di" bpmnElement="Task_HR05_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_HR05_di" bpmnElement="End_HR05"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_HR05_1_di" bpmnElement="Flow_HR05_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR05_2_di" bpmnElement="Flow_HR05_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR05_3_di" bpmnElement="Flow_HR05_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR05_4_di" bpmnElement="Flow_HR05_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000010','reference-seed','8b000001-0000-4000-8000-000000000010','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_HR06" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_HR06" name="Gérer les absences et congés" isExecutable="false">
  <bpmn:startEvent id="Start_HR06" name="Début"><bpmn:outgoing>Flow_HR06_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_HR06_1" name="[Responsable RH] Qualifier et planifier le besoin"><bpmn:incoming>Flow_HR06_1</bpmn:incoming><bpmn:outgoing>Flow_HR06_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR06_2" name="[Responsable RH] Réaliser et contrôler les activités"><bpmn:incoming>Flow_HR06_2</bpmn:incoming><bpmn:outgoing>Flow_HR06_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR06_3" name="[Responsable RH] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_HR06_3</bpmn:incoming><bpmn:outgoing>Flow_HR06_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_HR06" name="Fin"><bpmn:incoming>Flow_HR06_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_HR06_1" sourceRef="Start_HR06" targetRef="Task_HR06_1"/>
  <bpmn:sequenceFlow id="Flow_HR06_2" sourceRef="Task_HR06_1" targetRef="Task_HR06_2"/>
  <bpmn:sequenceFlow id="Flow_HR06_3" sourceRef="Task_HR06_2" targetRef="Task_HR06_3"/>
  <bpmn:sequenceFlow id="Flow_HR06_4" sourceRef="Task_HR06_3" targetRef="End_HR06"/>
  <bpmn:dataObject id="Data_HR06_1" name="Demande de congé"/><bpmn:dataObjectReference id="DataRef_HR06_1" dataObjectRef="Data_HR06_1" name="Demande de congé"/>
  <bpmn:dataObject id="Data_HR06_2" name="Calendrier des absences"/><bpmn:dataObjectReference id="DataRef_HR06_2" dataObjectRef="Data_HR06_2" name="Calendrier des absences"/>
  <bpmn:association id="Assoc_HR06_1" sourceRef="Task_HR06_1" targetRef="DataRef_HR06_1" associationDirection="One"/>
  <bpmn:association id="Assoc_HR06_2" sourceRef="Task_HR06_2" targetRef="DataRef_HR06_2" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Demande, validation hiérarchique et transmission paie</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_HR06"><bpmndi:BPMNPlane id="Plane_HR06" bpmnElement="Process_HR06">
  <bpmndi:BPMNShape id="Start_HR06_di" bpmnElement="Start_HR06"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR06_1_di" bpmnElement="Task_HR06_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR06_2_di" bpmnElement="Task_HR06_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR06_3_di" bpmnElement="Task_HR06_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_HR06_di" bpmnElement="End_HR06"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_HR06_1_di" bpmnElement="Flow_HR06_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR06_2_di" bpmnElement="Flow_HR06_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR06_3_di" bpmnElement="Flow_HR06_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR06_4_di" bpmnElement="Flow_HR06_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000011','reference-seed','8b000001-0000-4000-8000-000000000011','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_HR07" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_HR07" name="Réaliser les entretiens et évaluations" isExecutable="false">
  <bpmn:startEvent id="Start_HR07" name="Début"><bpmn:outgoing>Flow_HR07_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_HR07_1" name="[Manager] Qualifier et planifier le besoin"><bpmn:incoming>Flow_HR07_1</bpmn:incoming><bpmn:outgoing>Flow_HR07_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR07_2" name="[Manager] Réaliser et contrôler les activités"><bpmn:incoming>Flow_HR07_2</bpmn:incoming><bpmn:outgoing>Flow_HR07_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR07_3" name="[Manager] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_HR07_3</bpmn:incoming><bpmn:outgoing>Flow_HR07_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_HR07" name="Fin"><bpmn:incoming>Flow_HR07_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_HR07_1" sourceRef="Start_HR07" targetRef="Task_HR07_1"/>
  <bpmn:sequenceFlow id="Flow_HR07_2" sourceRef="Task_HR07_1" targetRef="Task_HR07_2"/>
  <bpmn:sequenceFlow id="Flow_HR07_3" sourceRef="Task_HR07_2" targetRef="Task_HR07_3"/>
  <bpmn:sequenceFlow id="Flow_HR07_4" sourceRef="Task_HR07_3" targetRef="End_HR07"/>
  <bpmn:dataObject id="Data_HR07_1" name="Compte rendu entretien"/><bpmn:dataObjectReference id="DataRef_HR07_1" dataObjectRef="Data_HR07_1" name="Compte rendu entretien"/>
  <bpmn:dataObject id="Data_HR07_2" name="Objectifs annuels"/><bpmn:dataObjectReference id="DataRef_HR07_2" dataObjectRef="Data_HR07_2" name="Objectifs annuels"/>
  <bpmn:association id="Assoc_HR07_1" sourceRef="Task_HR07_1" targetRef="DataRef_HR07_1" associationDirection="One"/>
  <bpmn:association id="Assoc_HR07_2" sourceRef="Task_HR07_2" targetRef="DataRef_HR07_2" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Préparation, entretien, objectifs et plan d''action</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_HR07"><bpmndi:BPMNPlane id="Plane_HR07" bpmnElement="Process_HR07">
  <bpmndi:BPMNShape id="Start_HR07_di" bpmnElement="Start_HR07"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR07_1_di" bpmnElement="Task_HR07_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR07_2_di" bpmnElement="Task_HR07_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR07_3_di" bpmnElement="Task_HR07_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_HR07_di" bpmnElement="End_HR07"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_HR07_1_di" bpmnElement="Flow_HR07_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR07_2_di" bpmnElement="Flow_HR07_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR07_3_di" bpmnElement="Flow_HR07_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR07_4_di" bpmnElement="Flow_HR07_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000012','reference-seed','8b000001-0000-4000-8000-000000000012','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_HR08" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_HR08" name="Gérer les formations et compétences" isExecutable="false">
  <bpmn:startEvent id="Start_HR08" name="Début"><bpmn:outgoing>Flow_HR08_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_HR08_1" name="[Responsable RH] Qualifier et planifier le besoin"><bpmn:incoming>Flow_HR08_1</bpmn:incoming><bpmn:outgoing>Flow_HR08_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR08_2" name="[Responsable RH] Réaliser et contrôler les activités"><bpmn:incoming>Flow_HR08_2</bpmn:incoming><bpmn:outgoing>Flow_HR08_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_HR08_3" name="[Responsable RH] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_HR08_3</bpmn:incoming><bpmn:outgoing>Flow_HR08_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_HR08" name="Fin"><bpmn:incoming>Flow_HR08_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_HR08_1" sourceRef="Start_HR08" targetRef="Task_HR08_1"/>
  <bpmn:sequenceFlow id="Flow_HR08_2" sourceRef="Task_HR08_1" targetRef="Task_HR08_2"/>
  <bpmn:sequenceFlow id="Flow_HR08_3" sourceRef="Task_HR08_2" targetRef="Task_HR08_3"/>
  <bpmn:sequenceFlow id="Flow_HR08_4" sourceRef="Task_HR08_3" targetRef="End_HR08"/>
  <bpmn:dataObject id="Data_HR08_1" name="Plan de formation"/><bpmn:dataObjectReference id="DataRef_HR08_1" dataObjectRef="Data_HR08_1" name="Plan de formation"/>
  <bpmn:dataObject id="Data_HR08_2" name="Attestation de formation"/><bpmn:dataObjectReference id="DataRef_HR08_2" dataObjectRef="Data_HR08_2" name="Attestation de formation"/>
  <bpmn:association id="Assoc_HR08_1" sourceRef="Task_HR08_1" targetRef="DataRef_HR08_1" associationDirection="One"/>
  <bpmn:association id="Assoc_HR08_2" sourceRef="Task_HR08_2" targetRef="DataRef_HR08_2" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Recueillir les besoins, planifier et évaluer</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_HR08"><bpmndi:BPMNPlane id="Plane_HR08" bpmnElement="Process_HR08">
  <bpmndi:BPMNShape id="Start_HR08_di" bpmnElement="Start_HR08"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR08_1_di" bpmnElement="Task_HR08_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR08_2_di" bpmnElement="Task_HR08_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_HR08_3_di" bpmnElement="Task_HR08_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_HR08_di" bpmnElement="End_HR08"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_HR08_1_di" bpmnElement="Flow_HR08_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR08_2_di" bpmnElement="Flow_HR08_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR08_3_di" bpmnElement="Flow_HR08_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_HR08_4_di" bpmnElement="Flow_HR08_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000013','reference-seed','8b000001-0000-4000-8000-000000000013','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_FIN01" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_FIN01" name="Traiter les notes de frais" isExecutable="false">
  <bpmn:startEvent id="Start_FIN01" name="Début"><bpmn:outgoing>Flow_FIN01_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_FIN01_1" name="[Responsable financier] Qualifier et planifier le besoin"><bpmn:incoming>Flow_FIN01_1</bpmn:incoming><bpmn:outgoing>Flow_FIN01_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_FIN01_2" name="[Responsable financier] Réaliser et contrôler les activités"><bpmn:incoming>Flow_FIN01_2</bpmn:incoming><bpmn:outgoing>Flow_FIN01_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_FIN01_3" name="[Responsable financier] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_FIN01_3</bpmn:incoming><bpmn:outgoing>Flow_FIN01_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_FIN01" name="Fin"><bpmn:incoming>Flow_FIN01_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_FIN01_1" sourceRef="Start_FIN01" targetRef="Task_FIN01_1"/>
  <bpmn:sequenceFlow id="Flow_FIN01_2" sourceRef="Task_FIN01_1" targetRef="Task_FIN01_2"/>
  <bpmn:sequenceFlow id="Flow_FIN01_3" sourceRef="Task_FIN01_2" targetRef="Task_FIN01_3"/>
  <bpmn:sequenceFlow id="Flow_FIN01_4" sourceRef="Task_FIN01_3" targetRef="End_FIN01"/>
  <bpmn:dataObject id="Data_FIN01_1" name="Note de frais"/><bpmn:dataObjectReference id="DataRef_FIN01_1" dataObjectRef="Data_FIN01_1" name="Note de frais"/>
  <bpmn:dataObject id="Data_FIN01_2" name="Justificatifs"/><bpmn:dataObjectReference id="DataRef_FIN01_2" dataObjectRef="Data_FIN01_2" name="Justificatifs"/>
  <bpmn:association id="Assoc_FIN01_1" sourceRef="Task_FIN01_1" targetRef="DataRef_FIN01_1" associationDirection="One"/>
  <bpmn:association id="Assoc_FIN01_2" sourceRef="Task_FIN01_2" targetRef="DataRef_FIN01_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_FIN01_ERP" dataStoreRef="Store_ERP" name="ERP et comptabilité"/><bpmn:association id="Assoc_FIN01_ERP" sourceRef="Task_FIN01_3" targetRef="DataStoreRef_FIN01_ERP" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_FIN01_SIRH" dataStoreRef="Store_SIRH" name="SIRH et paie"/><bpmn:association id="Assoc_FIN01_SIRH" sourceRef="Task_FIN01_3" targetRef="DataStoreRef_FIN01_SIRH" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_FIN01_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_FIN01_DOCS" sourceRef="Task_FIN01_3" targetRef="DataStoreRef_FIN01_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Dépôt, contrôle justificatifs, validation et remboursement</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_FIN01"><bpmndi:BPMNPlane id="Plane_FIN01" bpmnElement="Process_FIN01">
  <bpmndi:BPMNShape id="Start_FIN01_di" bpmnElement="Start_FIN01"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN01_1_di" bpmnElement="Task_FIN01_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN01_2_di" bpmnElement="Task_FIN01_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN01_3_di" bpmnElement="Task_FIN01_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_FIN01_di" bpmnElement="End_FIN01"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_FIN01_1_di" bpmnElement="Flow_FIN01_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN01_2_di" bpmnElement="Flow_FIN01_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN01_3_di" bpmnElement="Flow_FIN01_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN01_4_di" bpmnElement="Flow_FIN01_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000014','reference-seed','8b000001-0000-4000-8000-000000000014','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_FIN02" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_FIN02" name="Préparer et exécuter la paie" isExecutable="false">
  <bpmn:startEvent id="Start_FIN02" name="Début"><bpmn:outgoing>Flow_FIN02_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_FIN02_1" name="[Gestionnaire paie] Qualifier et planifier le besoin"><bpmn:incoming>Flow_FIN02_1</bpmn:incoming><bpmn:outgoing>Flow_FIN02_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_FIN02_2" name="[Gestionnaire paie] Réaliser et contrôler les activités"><bpmn:incoming>Flow_FIN02_2</bpmn:incoming><bpmn:outgoing>Flow_FIN02_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_FIN02_3" name="[Gestionnaire paie] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_FIN02_3</bpmn:incoming><bpmn:outgoing>Flow_FIN02_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_FIN02" name="Fin"><bpmn:incoming>Flow_FIN02_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_FIN02_1" sourceRef="Start_FIN02" targetRef="Task_FIN02_1"/>
  <bpmn:sequenceFlow id="Flow_FIN02_2" sourceRef="Task_FIN02_1" targetRef="Task_FIN02_2"/>
  <bpmn:sequenceFlow id="Flow_FIN02_3" sourceRef="Task_FIN02_2" targetRef="Task_FIN02_3"/>
  <bpmn:sequenceFlow id="Flow_FIN02_4" sourceRef="Task_FIN02_3" targetRef="End_FIN02"/>
  <bpmn:dataObject id="Data_FIN02_1" name="Variables de paie"/><bpmn:dataObjectReference id="DataRef_FIN02_1" dataObjectRef="Data_FIN02_1" name="Variables de paie"/>
  <bpmn:dataObject id="Data_FIN02_2" name="Bulletin de paie"/><bpmn:dataObjectReference id="DataRef_FIN02_2" dataObjectRef="Data_FIN02_2" name="Bulletin de paie"/>
  <bpmn:association id="Assoc_FIN02_1" sourceRef="Task_FIN02_1" targetRef="DataRef_FIN02_1" associationDirection="One"/>
  <bpmn:association id="Assoc_FIN02_2" sourceRef="Task_FIN02_2" targetRef="DataRef_FIN02_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_FIN02_ERP" dataStoreRef="Store_ERP" name="ERP et comptabilité"/><bpmn:association id="Assoc_FIN02_ERP" sourceRef="Task_FIN02_3" targetRef="DataStoreRef_FIN02_ERP" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_FIN02_SIRH" dataStoreRef="Store_SIRH" name="SIRH et paie"/><bpmn:association id="Assoc_FIN02_SIRH" sourceRef="Task_FIN02_3" targetRef="DataStoreRef_FIN02_SIRH" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_FIN02_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_FIN02_DOCS" sourceRef="Task_FIN02_3" targetRef="DataStoreRef_FIN02_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Collecter variables, contrôler, valider et produire bulletins</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_FIN02"><bpmndi:BPMNPlane id="Plane_FIN02" bpmnElement="Process_FIN02">
  <bpmndi:BPMNShape id="Start_FIN02_di" bpmnElement="Start_FIN02"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN02_1_di" bpmnElement="Task_FIN02_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN02_2_di" bpmnElement="Task_FIN02_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN02_3_di" bpmnElement="Task_FIN02_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_FIN02_di" bpmnElement="End_FIN02"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_FIN02_1_di" bpmnElement="Flow_FIN02_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN02_2_di" bpmnElement="Flow_FIN02_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN02_3_di" bpmnElement="Flow_FIN02_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN02_4_di" bpmnElement="Flow_FIN02_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000015','reference-seed','8b000001-0000-4000-8000-000000000015','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_FIN03" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_FIN03" name="Acheter un bien ou un service" isExecutable="false">
  <bpmn:startEvent id="Start_FIN03" name="Début"><bpmn:outgoing>Flow_FIN03_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_FIN03_1" name="[Acheteur] Qualifier et planifier le besoin"><bpmn:incoming>Flow_FIN03_1</bpmn:incoming><bpmn:outgoing>Flow_FIN03_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_FIN03_2" name="[Acheteur] Réaliser et contrôler les activités"><bpmn:incoming>Flow_FIN03_2</bpmn:incoming><bpmn:outgoing>Flow_FIN03_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_FIN03_3" name="[Acheteur] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_FIN03_3</bpmn:incoming><bpmn:outgoing>Flow_FIN03_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_FIN03" name="Fin"><bpmn:incoming>Flow_FIN03_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_FIN03_1" sourceRef="Start_FIN03" targetRef="Task_FIN03_1"/>
  <bpmn:sequenceFlow id="Flow_FIN03_2" sourceRef="Task_FIN03_1" targetRef="Task_FIN03_2"/>
  <bpmn:sequenceFlow id="Flow_FIN03_3" sourceRef="Task_FIN03_2" targetRef="Task_FIN03_3"/>
  <bpmn:sequenceFlow id="Flow_FIN03_4" sourceRef="Task_FIN03_3" targetRef="End_FIN03"/>
  <bpmn:dataObject id="Data_FIN03_1" name="Demande d''achat"/><bpmn:dataObjectReference id="DataRef_FIN03_1" dataObjectRef="Data_FIN03_1" name="Demande d''achat"/>
  <bpmn:dataObject id="Data_FIN03_2" name="Bon de commande fournisseur"/><bpmn:dataObjectReference id="DataRef_FIN03_2" dataObjectRef="Data_FIN03_2" name="Bon de commande fournisseur"/>
  <bpmn:dataObject id="Data_FIN03_3" name="PV réception"/><bpmn:dataObjectReference id="DataRef_FIN03_3" dataObjectRef="Data_FIN03_3" name="PV réception"/>
  <bpmn:association id="Assoc_FIN03_1" sourceRef="Task_FIN03_1" targetRef="DataRef_FIN03_1" associationDirection="One"/>
  <bpmn:association id="Assoc_FIN03_2" sourceRef="Task_FIN03_2" targetRef="DataRef_FIN03_2" associationDirection="One"/>
  <bpmn:association id="Assoc_FIN03_3" sourceRef="Task_FIN03_3" targetRef="DataRef_FIN03_3" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_FIN03_ERP" dataStoreRef="Store_ERP" name="ERP et comptabilité"/><bpmn:association id="Assoc_FIN03_ERP" sourceRef="Task_FIN03_3" targetRef="DataStoreRef_FIN03_ERP" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_FIN03_SIRH" dataStoreRef="Store_SIRH" name="SIRH et paie"/><bpmn:association id="Assoc_FIN03_SIRH" sourceRef="Task_FIN03_3" targetRef="DataStoreRef_FIN03_SIRH" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_FIN03_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_FIN03_DOCS" sourceRef="Task_FIN03_3" targetRef="DataStoreRef_FIN03_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Expression du besoin, consultation, commande et réception</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_FIN03"><bpmndi:BPMNPlane id="Plane_FIN03" bpmnElement="Process_FIN03">
  <bpmndi:BPMNShape id="Start_FIN03_di" bpmnElement="Start_FIN03"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN03_1_di" bpmnElement="Task_FIN03_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN03_2_di" bpmnElement="Task_FIN03_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN03_3_di" bpmnElement="Task_FIN03_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_FIN03_di" bpmnElement="End_FIN03"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_FIN03_1_di" bpmnElement="Flow_FIN03_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN03_2_di" bpmnElement="Flow_FIN03_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN03_3_di" bpmnElement="Flow_FIN03_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN03_4_di" bpmnElement="Flow_FIN03_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000016','reference-seed','8b000001-0000-4000-8000-000000000016','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_FIN04" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_FIN04" name="Suivre le temps et la rentabilité projet" isExecutable="false">
  <bpmn:startEvent id="Start_FIN04" name="Début"><bpmn:outgoing>Flow_FIN04_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_FIN04_1" name="[Contrôle de gestion] Qualifier et planifier le besoin"><bpmn:incoming>Flow_FIN04_1</bpmn:incoming><bpmn:outgoing>Flow_FIN04_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_FIN04_2" name="[Contrôle de gestion] Réaliser et contrôler les activités"><bpmn:incoming>Flow_FIN04_2</bpmn:incoming><bpmn:outgoing>Flow_FIN04_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_FIN04_3" name="[Contrôle de gestion] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_FIN04_3</bpmn:incoming><bpmn:outgoing>Flow_FIN04_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_FIN04" name="Fin"><bpmn:incoming>Flow_FIN04_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_FIN04_1" sourceRef="Start_FIN04" targetRef="Task_FIN04_1"/>
  <bpmn:sequenceFlow id="Flow_FIN04_2" sourceRef="Task_FIN04_1" targetRef="Task_FIN04_2"/>
  <bpmn:sequenceFlow id="Flow_FIN04_3" sourceRef="Task_FIN04_2" targetRef="Task_FIN04_3"/>
  <bpmn:sequenceFlow id="Flow_FIN04_4" sourceRef="Task_FIN04_3" targetRef="End_FIN04"/>
  <bpmn:dataObject id="Data_FIN04_1" name="Feuille de temps"/><bpmn:dataObjectReference id="DataRef_FIN04_1" dataObjectRef="Data_FIN04_1" name="Feuille de temps"/>
  <bpmn:dataObject id="Data_FIN04_2" name="Tableau de rentabilité"/><bpmn:dataObjectReference id="DataRef_FIN04_2" dataObjectRef="Data_FIN04_2" name="Tableau de rentabilité"/>
  <bpmn:association id="Assoc_FIN04_1" sourceRef="Task_FIN04_1" targetRef="DataRef_FIN04_1" associationDirection="One"/>
  <bpmn:association id="Assoc_FIN04_2" sourceRef="Task_FIN04_2" targetRef="DataRef_FIN04_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_FIN04_ERP" dataStoreRef="Store_ERP" name="ERP et comptabilité"/><bpmn:association id="Assoc_FIN04_ERP" sourceRef="Task_FIN04_3" targetRef="DataStoreRef_FIN04_ERP" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_FIN04_SIRH" dataStoreRef="Store_SIRH" name="SIRH et paie"/><bpmn:association id="Assoc_FIN04_SIRH" sourceRef="Task_FIN04_3" targetRef="DataStoreRef_FIN04_SIRH" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_FIN04_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_FIN04_DOCS" sourceRef="Task_FIN04_3" targetRef="DataStoreRef_FIN04_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Saisie temps, contrôle, analyse budget et marge</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_FIN04"><bpmndi:BPMNPlane id="Plane_FIN04" bpmnElement="Process_FIN04">
  <bpmndi:BPMNShape id="Start_FIN04_di" bpmnElement="Start_FIN04"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN04_1_di" bpmnElement="Task_FIN04_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN04_2_di" bpmnElement="Task_FIN04_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_FIN04_3_di" bpmnElement="Task_FIN04_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_FIN04_di" bpmnElement="End_FIN04"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_FIN04_1_di" bpmnElement="Flow_FIN04_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN04_2_di" bpmnElement="Flow_FIN04_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN04_3_di" bpmnElement="Flow_FIN04_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_FIN04_4_di" bpmnElement="Flow_FIN04_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000017','reference-seed','8b000001-0000-4000-8000-000000000017','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_IT01" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_IT01" name="Traiter un ticket de support interne" isExecutable="false">
  <bpmn:startEvent id="Start_IT01" name="Début"><bpmn:outgoing>Flow_IT01_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_IT01_1" name="[Responsable support] Qualifier et planifier le besoin"><bpmn:incoming>Flow_IT01_1</bpmn:incoming><bpmn:outgoing>Flow_IT01_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_IT01_2" name="[Responsable support] Réaliser et contrôler les activités"><bpmn:incoming>Flow_IT01_2</bpmn:incoming><bpmn:outgoing>Flow_IT01_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_IT01_3" name="[Responsable support] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_IT01_3</bpmn:incoming><bpmn:outgoing>Flow_IT01_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_IT01" name="Fin"><bpmn:incoming>Flow_IT01_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_IT01_1" sourceRef="Start_IT01" targetRef="Task_IT01_1"/>
  <bpmn:sequenceFlow id="Flow_IT01_2" sourceRef="Task_IT01_1" targetRef="Task_IT01_2"/>
  <bpmn:sequenceFlow id="Flow_IT01_3" sourceRef="Task_IT01_2" targetRef="Task_IT01_3"/>
  <bpmn:sequenceFlow id="Flow_IT01_4" sourceRef="Task_IT01_3" targetRef="End_IT01"/>
  <bpmn:dataObject id="Data_IT01_1" name="Ticket ITSM"/><bpmn:dataObjectReference id="DataRef_IT01_1" dataObjectRef="Data_IT01_1" name="Ticket ITSM"/>
  <bpmn:dataObject id="Data_IT01_2" name="Base de connaissances"/><bpmn:dataObjectReference id="DataRef_IT01_2" dataObjectRef="Data_IT01_2" name="Base de connaissances"/>
  <bpmn:association id="Assoc_IT01_1" sourceRef="Task_IT01_1" targetRef="DataRef_IT01_1" associationDirection="One"/>
  <bpmn:association id="Assoc_IT01_2" sourceRef="Task_IT01_2" targetRef="DataRef_IT01_2" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Enregistrer, qualifier, prioriser, résoudre ou escalader, valider et clôturer</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_IT01"><bpmndi:BPMNPlane id="Plane_IT01" bpmnElement="Process_IT01">
  <bpmndi:BPMNShape id="Start_IT01_di" bpmnElement="Start_IT01"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT01_1_di" bpmnElement="Task_IT01_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT01_2_di" bpmnElement="Task_IT01_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT01_3_di" bpmnElement="Task_IT01_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_IT01_di" bpmnElement="End_IT01"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_IT01_1_di" bpmnElement="Flow_IT01_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT01_2_di" bpmnElement="Flow_IT01_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT01_3_di" bpmnElement="Flow_IT01_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT01_4_di" bpmnElement="Flow_IT01_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000018','reference-seed','8b000001-0000-4000-8000-000000000018','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_IT02" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_IT02" name="Gérer le parc et le cycle de vie matériel" isExecutable="false">
  <bpmn:startEvent id="Start_IT02" name="Début"><bpmn:outgoing>Flow_IT02_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_IT02_1" name="[Responsable IT] Qualifier et planifier le besoin"><bpmn:incoming>Flow_IT02_1</bpmn:incoming><bpmn:outgoing>Flow_IT02_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_IT02_2" name="[Responsable IT] Réaliser et contrôler les activités"><bpmn:incoming>Flow_IT02_2</bpmn:incoming><bpmn:outgoing>Flow_IT02_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_IT02_3" name="[Responsable IT] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_IT02_3</bpmn:incoming><bpmn:outgoing>Flow_IT02_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_IT02" name="Fin"><bpmn:incoming>Flow_IT02_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_IT02_1" sourceRef="Start_IT02" targetRef="Task_IT02_1"/>
  <bpmn:sequenceFlow id="Flow_IT02_2" sourceRef="Task_IT02_1" targetRef="Task_IT02_2"/>
  <bpmn:sequenceFlow id="Flow_IT02_3" sourceRef="Task_IT02_2" targetRef="Task_IT02_3"/>
  <bpmn:sequenceFlow id="Flow_IT02_4" sourceRef="Task_IT02_3" targetRef="End_IT02"/>
  <bpmn:dataObject id="Data_IT02_1" name="CMDB"/><bpmn:dataObjectReference id="DataRef_IT02_1" dataObjectRef="Data_IT02_1" name="CMDB"/>
  <bpmn:dataObject id="Data_IT02_2" name="Registre des équipements"/><bpmn:dataObjectReference id="DataRef_IT02_2" dataObjectRef="Data_IT02_2" name="Registre des équipements"/>
  <bpmn:association id="Assoc_IT02_1" sourceRef="Task_IT02_1" targetRef="DataRef_IT02_1" associationDirection="One"/>
  <bpmn:association id="Assoc_IT02_2" sourceRef="Task_IT02_2" targetRef="DataRef_IT02_2" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Inventorier, affecter, maintenir, restituer et réformer</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_IT02"><bpmndi:BPMNPlane id="Plane_IT02" bpmnElement="Process_IT02">
  <bpmndi:BPMNShape id="Start_IT02_di" bpmnElement="Start_IT02"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT02_1_di" bpmnElement="Task_IT02_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT02_2_di" bpmnElement="Task_IT02_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT02_3_di" bpmnElement="Task_IT02_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_IT02_di" bpmnElement="End_IT02"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_IT02_1_di" bpmnElement="Flow_IT02_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT02_2_di" bpmnElement="Flow_IT02_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT02_3_di" bpmnElement="Flow_IT02_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT02_4_di" bpmnElement="Flow_IT02_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000019','reference-seed','8b000001-0000-4000-8000-000000000019','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_IT03" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_IT03" name="Gérer les accès et habilitations" isExecutable="false">
  <bpmn:startEvent id="Start_IT03" name="Début"><bpmn:outgoing>Flow_IT03_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_IT03_1" name="[Responsable sécurité] Qualifier et planifier le besoin"><bpmn:incoming>Flow_IT03_1</bpmn:incoming><bpmn:outgoing>Flow_IT03_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_IT03_2" name="[Responsable sécurité] Réaliser et contrôler les activités"><bpmn:incoming>Flow_IT03_2</bpmn:incoming><bpmn:outgoing>Flow_IT03_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_IT03_3" name="[Responsable sécurité] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_IT03_3</bpmn:incoming><bpmn:outgoing>Flow_IT03_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_IT03" name="Fin"><bpmn:incoming>Flow_IT03_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_IT03_1" sourceRef="Start_IT03" targetRef="Task_IT03_1"/>
  <bpmn:sequenceFlow id="Flow_IT03_2" sourceRef="Task_IT03_1" targetRef="Task_IT03_2"/>
  <bpmn:sequenceFlow id="Flow_IT03_3" sourceRef="Task_IT03_2" targetRef="Task_IT03_3"/>
  <bpmn:sequenceFlow id="Flow_IT03_4" sourceRef="Task_IT03_3" targetRef="End_IT03"/>
  <bpmn:dataObject id="Data_IT03_1" name="Demande d''accès"/><bpmn:dataObjectReference id="DataRef_IT03_1" dataObjectRef="Data_IT03_1" name="Demande d''accès"/>
  <bpmn:dataObject id="Data_IT03_2" name="Matrice des habilitations"/><bpmn:dataObjectReference id="DataRef_IT03_2" dataObjectRef="Data_IT03_2" name="Matrice des habilitations"/>
  <bpmn:association id="Assoc_IT03_1" sourceRef="Task_IT03_1" targetRef="DataRef_IT03_1" associationDirection="One"/>
  <bpmn:association id="Assoc_IT03_2" sourceRef="Task_IT03_2" targetRef="DataRef_IT03_2" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Demander, approuver, provisionner, revoir et révoquer les accès</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_IT03"><bpmndi:BPMNPlane id="Plane_IT03" bpmnElement="Process_IT03">
  <bpmndi:BPMNShape id="Start_IT03_di" bpmnElement="Start_IT03"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT03_1_di" bpmnElement="Task_IT03_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT03_2_di" bpmnElement="Task_IT03_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT03_3_di" bpmnElement="Task_IT03_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_IT03_di" bpmnElement="End_IT03"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_IT03_1_di" bpmnElement="Flow_IT03_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT03_2_di" bpmnElement="Flow_IT03_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT03_3_di" bpmnElement="Flow_IT03_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT03_4_di" bpmnElement="Flow_IT03_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000020','reference-seed','8b000001-0000-4000-8000-000000000020','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_IT04" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_IT04" name="Gérer les sauvegardes et restaurations" isExecutable="false">
  <bpmn:startEvent id="Start_IT04" name="Début"><bpmn:outgoing>Flow_IT04_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_IT04_1" name="[Administrateur systèmes] Qualifier et planifier le besoin"><bpmn:incoming>Flow_IT04_1</bpmn:incoming><bpmn:outgoing>Flow_IT04_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_IT04_2" name="[Administrateur systèmes] Réaliser et contrôler les activités"><bpmn:incoming>Flow_IT04_2</bpmn:incoming><bpmn:outgoing>Flow_IT04_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_IT04_3" name="[Administrateur systèmes] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_IT04_3</bpmn:incoming><bpmn:outgoing>Flow_IT04_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_IT04" name="Fin"><bpmn:incoming>Flow_IT04_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_IT04_1" sourceRef="Start_IT04" targetRef="Task_IT04_1"/>
  <bpmn:sequenceFlow id="Flow_IT04_2" sourceRef="Task_IT04_1" targetRef="Task_IT04_2"/>
  <bpmn:sequenceFlow id="Flow_IT04_3" sourceRef="Task_IT04_2" targetRef="Task_IT04_3"/>
  <bpmn:sequenceFlow id="Flow_IT04_4" sourceRef="Task_IT04_3" targetRef="End_IT04"/>
  <bpmn:dataObject id="Data_IT04_1" name="Politique de sauvegarde"/><bpmn:dataObjectReference id="DataRef_IT04_1" dataObjectRef="Data_IT04_1" name="Politique de sauvegarde"/>
  <bpmn:dataObject id="Data_IT04_2" name="Rapport de restauration"/><bpmn:dataObjectReference id="DataRef_IT04_2" dataObjectRef="Data_IT04_2" name="Rapport de restauration"/>
  <bpmn:association id="Assoc_IT04_1" sourceRef="Task_IT04_1" targetRef="DataRef_IT04_1" associationDirection="One"/>
  <bpmn:association id="Assoc_IT04_2" sourceRef="Task_IT04_2" targetRef="DataRef_IT04_2" associationDirection="One"/>
  
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Planifier, surveiller, tester et restaurer</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_IT04"><bpmndi:BPMNPlane id="Plane_IT04" bpmnElement="Process_IT04">
  <bpmndi:BPMNShape id="Start_IT04_di" bpmnElement="Start_IT04"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT04_1_di" bpmnElement="Task_IT04_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT04_2_di" bpmnElement="Task_IT04_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_IT04_3_di" bpmnElement="Task_IT04_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_IT04_di" bpmnElement="End_IT04"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_IT04_1_di" bpmnElement="Flow_IT04_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT04_2_di" bpmnElement="Flow_IT04_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT04_3_di" bpmnElement="Flow_IT04_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_IT04_4_di" bpmnElement="Flow_IT04_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000021','reference-seed','8b000001-0000-4000-8000-000000000021','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_DEL01" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_DEL01" name="Recueillir et valider les exigences client" isExecutable="false">
  <bpmn:startEvent id="Start_DEL01" name="Début"><bpmn:outgoing>Flow_DEL01_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_DEL01_1" name="[Business analyst] Qualifier et planifier le besoin"><bpmn:incoming>Flow_DEL01_1</bpmn:incoming><bpmn:outgoing>Flow_DEL01_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_DEL01_2" name="[Business analyst] Réaliser et contrôler les activités"><bpmn:incoming>Flow_DEL01_2</bpmn:incoming><bpmn:outgoing>Flow_DEL01_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_DEL01_3" name="[Business analyst] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_DEL01_3</bpmn:incoming><bpmn:outgoing>Flow_DEL01_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_DEL01" name="Fin"><bpmn:incoming>Flow_DEL01_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_DEL01_1" sourceRef="Start_DEL01" targetRef="Task_DEL01_1"/>
  <bpmn:sequenceFlow id="Flow_DEL01_2" sourceRef="Task_DEL01_1" targetRef="Task_DEL01_2"/>
  <bpmn:sequenceFlow id="Flow_DEL01_3" sourceRef="Task_DEL01_2" targetRef="Task_DEL01_3"/>
  <bpmn:sequenceFlow id="Flow_DEL01_4" sourceRef="Task_DEL01_3" targetRef="End_DEL01"/>
  <bpmn:dataObject id="Data_DEL01_1" name="Spécifications"/><bpmn:dataObjectReference id="DataRef_DEL01_1" dataObjectRef="Data_DEL01_1" name="Spécifications"/>
  <bpmn:dataObject id="Data_DEL01_2" name="Backlog produit"/><bpmn:dataObjectReference id="DataRef_DEL01_2" dataObjectRef="Data_DEL01_2" name="Backlog produit"/>
  <bpmn:association id="Assoc_DEL01_1" sourceRef="Task_DEL01_1" targetRef="DataRef_DEL01_1" associationDirection="One"/>
  <bpmn:association id="Assoc_DEL01_2" sourceRef="Task_DEL01_2" targetRef="DataRef_DEL01_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_DEL01_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_DEL01_GIT" sourceRef="Task_DEL01_3" targetRef="DataStoreRef_DEL01_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_DEL01_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_DEL01_CICD" sourceRef="Task_DEL01_3" targetRef="DataStoreRef_DEL01_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_DEL01_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_DEL01_DOCS" sourceRef="Task_DEL01_3" targetRef="DataStoreRef_DEL01_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Ateliers, exigences, priorisation et validation</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_DEL01"><bpmndi:BPMNPlane id="Plane_DEL01" bpmnElement="Process_DEL01">
  <bpmndi:BPMNShape id="Start_DEL01_di" bpmnElement="Start_DEL01"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL01_1_di" bpmnElement="Task_DEL01_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL01_2_di" bpmnElement="Task_DEL01_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL01_3_di" bpmnElement="Task_DEL01_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_DEL01_di" bpmnElement="End_DEL01"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_DEL01_1_di" bpmnElement="Flow_DEL01_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL01_2_di" bpmnElement="Flow_DEL01_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL01_3_di" bpmnElement="Flow_DEL01_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL01_4_di" bpmnElement="Flow_DEL01_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000022','reference-seed','8b000001-0000-4000-8000-000000000022','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_DEL02" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_DEL02" name="Concevoir et développer un logiciel" isExecutable="false">
  <bpmn:startEvent id="Start_DEL02" name="Début"><bpmn:outgoing>Flow_DEL02_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_DEL02_1" name="[Tech lead] Qualifier et planifier le besoin"><bpmn:incoming>Flow_DEL02_1</bpmn:incoming><bpmn:outgoing>Flow_DEL02_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_DEL02_2" name="[Tech lead] Réaliser et contrôler les activités"><bpmn:incoming>Flow_DEL02_2</bpmn:incoming><bpmn:outgoing>Flow_DEL02_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_DEL02_3" name="[Tech lead] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_DEL02_3</bpmn:incoming><bpmn:outgoing>Flow_DEL02_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_DEL02" name="Fin"><bpmn:incoming>Flow_DEL02_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_DEL02_1" sourceRef="Start_DEL02" targetRef="Task_DEL02_1"/>
  <bpmn:sequenceFlow id="Flow_DEL02_2" sourceRef="Task_DEL02_1" targetRef="Task_DEL02_2"/>
  <bpmn:sequenceFlow id="Flow_DEL02_3" sourceRef="Task_DEL02_2" targetRef="Task_DEL02_3"/>
  <bpmn:sequenceFlow id="Flow_DEL02_4" sourceRef="Task_DEL02_3" targetRef="End_DEL02"/>
  <bpmn:dataObject id="Data_DEL02_1" name="Dossier d''architecture"/><bpmn:dataObjectReference id="DataRef_DEL02_1" dataObjectRef="Data_DEL02_1" name="Dossier d''architecture"/>
  <bpmn:dataObject id="Data_DEL02_2" name="Code source"/><bpmn:dataObjectReference id="DataRef_DEL02_2" dataObjectRef="Data_DEL02_2" name="Code source"/>
  <bpmn:dataObject id="Data_DEL02_3" name="Pull request"/><bpmn:dataObjectReference id="DataRef_DEL02_3" dataObjectRef="Data_DEL02_3" name="Pull request"/>
  <bpmn:association id="Assoc_DEL02_1" sourceRef="Task_DEL02_1" targetRef="DataRef_DEL02_1" associationDirection="One"/>
  <bpmn:association id="Assoc_DEL02_2" sourceRef="Task_DEL02_2" targetRef="DataRef_DEL02_2" associationDirection="One"/>
  <bpmn:association id="Assoc_DEL02_3" sourceRef="Task_DEL02_3" targetRef="DataRef_DEL02_3" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_DEL02_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_DEL02_GIT" sourceRef="Task_DEL02_3" targetRef="DataStoreRef_DEL02_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_DEL02_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_DEL02_CICD" sourceRef="Task_DEL02_3" targetRef="DataStoreRef_DEL02_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_DEL02_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_DEL02_DOCS" sourceRef="Task_DEL02_3" targetRef="DataStoreRef_DEL02_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Conception, développement, revue de code et intégration</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_DEL02"><bpmndi:BPMNPlane id="Plane_DEL02" bpmnElement="Process_DEL02">
  <bpmndi:BPMNShape id="Start_DEL02_di" bpmnElement="Start_DEL02"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL02_1_di" bpmnElement="Task_DEL02_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL02_2_di" bpmnElement="Task_DEL02_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL02_3_di" bpmnElement="Task_DEL02_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_DEL02_di" bpmnElement="End_DEL02"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_DEL02_1_di" bpmnElement="Flow_DEL02_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL02_2_di" bpmnElement="Flow_DEL02_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL02_3_di" bpmnElement="Flow_DEL02_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL02_4_di" bpmnElement="Flow_DEL02_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000023','reference-seed','8b000001-0000-4000-8000-000000000023','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_DEL03" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_DEL03" name="Réaliser les tests internes" isExecutable="false">
  <bpmn:startEvent id="Start_DEL03" name="Début"><bpmn:outgoing>Flow_DEL03_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_DEL03_1" name="[Responsable qualité] Qualifier et planifier le besoin"><bpmn:incoming>Flow_DEL03_1</bpmn:incoming><bpmn:outgoing>Flow_DEL03_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_DEL03_2" name="[Responsable qualité] Réaliser et contrôler les activités"><bpmn:incoming>Flow_DEL03_2</bpmn:incoming><bpmn:outgoing>Flow_DEL03_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_DEL03_3" name="[Responsable qualité] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_DEL03_3</bpmn:incoming><bpmn:outgoing>Flow_DEL03_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_DEL03" name="Fin"><bpmn:incoming>Flow_DEL03_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_DEL03_1" sourceRef="Start_DEL03" targetRef="Task_DEL03_1"/>
  <bpmn:sequenceFlow id="Flow_DEL03_2" sourceRef="Task_DEL03_1" targetRef="Task_DEL03_2"/>
  <bpmn:sequenceFlow id="Flow_DEL03_3" sourceRef="Task_DEL03_2" targetRef="Task_DEL03_3"/>
  <bpmn:sequenceFlow id="Flow_DEL03_4" sourceRef="Task_DEL03_3" targetRef="End_DEL03"/>
  <bpmn:dataObject id="Data_DEL03_1" name="Plan de tests"/><bpmn:dataObjectReference id="DataRef_DEL03_1" dataObjectRef="Data_DEL03_1" name="Plan de tests"/>
  <bpmn:dataObject id="Data_DEL03_2" name="Rapport de tests"/><bpmn:dataObjectReference id="DataRef_DEL03_2" dataObjectRef="Data_DEL03_2" name="Rapport de tests"/>
  <bpmn:association id="Assoc_DEL03_1" sourceRef="Task_DEL03_1" targetRef="DataRef_DEL03_1" associationDirection="One"/>
  <bpmn:association id="Assoc_DEL03_2" sourceRef="Task_DEL03_2" targetRef="DataRef_DEL03_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_DEL03_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_DEL03_GIT" sourceRef="Task_DEL03_3" targetRef="DataStoreRef_DEL03_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_DEL03_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_DEL03_CICD" sourceRef="Task_DEL03_3" targetRef="DataStoreRef_DEL03_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_DEL03_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_DEL03_DOCS" sourceRef="Task_DEL03_3" targetRef="DataStoreRef_DEL03_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Stratégie, tests, anomalies et décision de livraison</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_DEL03"><bpmndi:BPMNPlane id="Plane_DEL03" bpmnElement="Process_DEL03">
  <bpmndi:BPMNShape id="Start_DEL03_di" bpmnElement="Start_DEL03"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL03_1_di" bpmnElement="Task_DEL03_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL03_2_di" bpmnElement="Task_DEL03_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL03_3_di" bpmnElement="Task_DEL03_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_DEL03_di" bpmnElement="End_DEL03"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_DEL03_1_di" bpmnElement="Flow_DEL03_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL03_2_di" bpmnElement="Flow_DEL03_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL03_3_di" bpmnElement="Flow_DEL03_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL03_4_di" bpmnElement="Flow_DEL03_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000024','reference-seed','8b000001-0000-4000-8000-000000000024','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_DEL04" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_DEL04" name="Organiser la recette et l''acceptation client" isExecutable="false">
  <bpmn:startEvent id="Start_DEL04" name="Début"><bpmn:outgoing>Flow_DEL04_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_DEL04_1" name="[Chef de projet] Qualifier et planifier le besoin"><bpmn:incoming>Flow_DEL04_1</bpmn:incoming><bpmn:outgoing>Flow_DEL04_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_DEL04_2" name="[Chef de projet] Réaliser et contrôler les activités"><bpmn:incoming>Flow_DEL04_2</bpmn:incoming><bpmn:outgoing>Flow_DEL04_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_DEL04_3" name="[Chef de projet] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_DEL04_3</bpmn:incoming><bpmn:outgoing>Flow_DEL04_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_DEL04" name="Fin"><bpmn:incoming>Flow_DEL04_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_DEL04_1" sourceRef="Start_DEL04" targetRef="Task_DEL04_1"/>
  <bpmn:sequenceFlow id="Flow_DEL04_2" sourceRef="Task_DEL04_1" targetRef="Task_DEL04_2"/>
  <bpmn:sequenceFlow id="Flow_DEL04_3" sourceRef="Task_DEL04_2" targetRef="Task_DEL04_3"/>
  <bpmn:sequenceFlow id="Flow_DEL04_4" sourceRef="Task_DEL04_3" targetRef="End_DEL04"/>
  <bpmn:dataObject id="Data_DEL04_1" name="Cahier de recette"/><bpmn:dataObjectReference id="DataRef_DEL04_1" dataObjectRef="Data_DEL04_1" name="Cahier de recette"/>
  <bpmn:dataObject id="Data_DEL04_2" name="PV de recette client"/><bpmn:dataObjectReference id="DataRef_DEL04_2" dataObjectRef="Data_DEL04_2" name="PV de recette client"/>
  <bpmn:association id="Assoc_DEL04_1" sourceRef="Task_DEL04_1" targetRef="DataRef_DEL04_1" associationDirection="One"/>
  <bpmn:association id="Assoc_DEL04_2" sourceRef="Task_DEL04_2" targetRef="DataRef_DEL04_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_DEL04_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_DEL04_GIT" sourceRef="Task_DEL04_3" targetRef="DataStoreRef_DEL04_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_DEL04_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_DEL04_CICD" sourceRef="Task_DEL04_3" targetRef="DataStoreRef_DEL04_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_DEL04_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_DEL04_DOCS" sourceRef="Task_DEL04_3" targetRef="DataStoreRef_DEL04_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Livrer en recette, exécuter UAT, traiter réserves et obtenir PV</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_DEL04"><bpmndi:BPMNPlane id="Plane_DEL04" bpmnElement="Process_DEL04">
  <bpmndi:BPMNShape id="Start_DEL04_di" bpmnElement="Start_DEL04"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL04_1_di" bpmnElement="Task_DEL04_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL04_2_di" bpmnElement="Task_DEL04_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL04_3_di" bpmnElement="Task_DEL04_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_DEL04_di" bpmnElement="End_DEL04"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_DEL04_1_di" bpmnElement="Flow_DEL04_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL04_2_di" bpmnElement="Flow_DEL04_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL04_3_di" bpmnElement="Flow_DEL04_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL04_4_di" bpmnElement="Flow_DEL04_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000025','reference-seed','8b000001-0000-4000-8000-000000000025','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_DEL05" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_DEL05" name="Déployer et livrer une version" isExecutable="false">
  <bpmn:startEvent id="Start_DEL05" name="Début"><bpmn:outgoing>Flow_DEL05_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_DEL05_1" name="[Responsable DevOps] Qualifier et planifier le besoin"><bpmn:incoming>Flow_DEL05_1</bpmn:incoming><bpmn:outgoing>Flow_DEL05_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_DEL05_2" name="[Responsable DevOps] Réaliser et contrôler les activités"><bpmn:incoming>Flow_DEL05_2</bpmn:incoming><bpmn:outgoing>Flow_DEL05_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_DEL05_3" name="[Responsable DevOps] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_DEL05_3</bpmn:incoming><bpmn:outgoing>Flow_DEL05_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_DEL05" name="Fin"><bpmn:incoming>Flow_DEL05_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_DEL05_1" sourceRef="Start_DEL05" targetRef="Task_DEL05_1"/>
  <bpmn:sequenceFlow id="Flow_DEL05_2" sourceRef="Task_DEL05_1" targetRef="Task_DEL05_2"/>
  <bpmn:sequenceFlow id="Flow_DEL05_3" sourceRef="Task_DEL05_2" targetRef="Task_DEL05_3"/>
  <bpmn:sequenceFlow id="Flow_DEL05_4" sourceRef="Task_DEL05_3" targetRef="End_DEL05"/>
  <bpmn:dataObject id="Data_DEL05_1" name="Dossier de mise en production"/><bpmn:dataObjectReference id="DataRef_DEL05_1" dataObjectRef="Data_DEL05_1" name="Dossier de mise en production"/>
  <bpmn:dataObject id="Data_DEL05_2" name="Notes de version"/><bpmn:dataObjectReference id="DataRef_DEL05_2" dataObjectRef="Data_DEL05_2" name="Notes de version"/>
  <bpmn:association id="Assoc_DEL05_1" sourceRef="Task_DEL05_1" targetRef="DataRef_DEL05_1" associationDirection="One"/>
  <bpmn:association id="Assoc_DEL05_2" sourceRef="Task_DEL05_2" targetRef="DataRef_DEL05_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_DEL05_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_DEL05_GIT" sourceRef="Task_DEL05_3" targetRef="DataStoreRef_DEL05_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_DEL05_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_DEL05_CICD" sourceRef="Task_DEL05_3" targetRef="DataStoreRef_DEL05_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_DEL05_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_DEL05_DOCS" sourceRef="Task_DEL05_3" targetRef="DataStoreRef_DEL05_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Préparer release, approuver changement, déployer et vérifier</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_DEL05"><bpmndi:BPMNPlane id="Plane_DEL05" bpmnElement="Process_DEL05">
  <bpmndi:BPMNShape id="Start_DEL05_di" bpmnElement="Start_DEL05"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL05_1_di" bpmnElement="Task_DEL05_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL05_2_di" bpmnElement="Task_DEL05_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_DEL05_3_di" bpmnElement="Task_DEL05_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_DEL05_di" bpmnElement="End_DEL05"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_DEL05_1_di" bpmnElement="Flow_DEL05_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL05_2_di" bpmnElement="Flow_DEL05_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL05_3_di" bpmnElement="Flow_DEL05_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_DEL05_4_di" bpmnElement="Flow_DEL05_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000026','reference-seed','8b000001-0000-4000-8000-000000000026','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_MNT00" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_MNT00" name="Gérer le service et la maintenance du logiciel" isExecutable="false">
  <bpmn:startEvent id="Start_MNT00" name="Début"><bpmn:outgoing>Flow_MNT00_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:callActivity id="Task_MNT00_1" name="[Service manager] Prendre en charge un logiciel livré" calledElement="Process_MNT01"><bpmn:incoming>Flow_MNT00_1</bpmn:incoming><bpmn:outgoing>Flow_MNT00_2</bpmn:outgoing></bpmn:callActivity>
  <bpmn:callActivity id="Task_MNT00_2" name="[Support N1] Traiter les incidents et demandes clients" calledElement="Process_MNT02"><bpmn:incoming>Flow_MNT00_2</bpmn:incoming><bpmn:outgoing>Flow_MNT00_3</bpmn:outgoing></bpmn:callActivity>
  <bpmn:callActivity id="Task_MNT00_3" name="[Tech lead] Réaliser une maintenance corrective" calledElement="Process_MNT03"><bpmn:incoming>Flow_MNT00_3</bpmn:incoming><bpmn:outgoing>Flow_MNT00_4</bpmn:outgoing></bpmn:callActivity>
  <bpmn:callActivity id="Task_MNT00_4" name="[Chef de projet] Gérer une demande d''évolution" calledElement="Process_MNT04"><bpmn:incoming>Flow_MNT00_4</bpmn:incoming><bpmn:outgoing>Flow_MNT00_5</bpmn:outgoing></bpmn:callActivity>
  <bpmn:callActivity id="Task_MNT00_5" name="[Responsable DevOps] Gérer une version et une mise en production" calledElement="Process_MNT05"><bpmn:incoming>Flow_MNT00_5</bpmn:incoming><bpmn:outgoing>Flow_MNT00_6</bpmn:outgoing></bpmn:callActivity>
  <bpmn:callActivity id="Task_MNT00_6" name="[Service manager] Réaliser la revue périodique de service" calledElement="Process_MNT06"><bpmn:incoming>Flow_MNT00_6</bpmn:incoming><bpmn:outgoing>Flow_MNT00_7</bpmn:outgoing></bpmn:callActivity>
  <bpmn:callActivity id="Task_MNT00_7" name="[Service manager] Clôturer la maintenance et organiser la réversibilité" calledElement="Process_MNT07"><bpmn:incoming>Flow_MNT00_7</bpmn:incoming><bpmn:outgoing>Flow_MNT00_8</bpmn:outgoing></bpmn:callActivity>
  <bpmn:endEvent id="End_MNT00" name="Fin"><bpmn:incoming>Flow_MNT00_8</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_MNT00_1" sourceRef="Start_MNT00" targetRef="Task_MNT00_1"/>
  <bpmn:sequenceFlow id="Flow_MNT00_2" sourceRef="Task_MNT00_1" targetRef="Task_MNT00_2"/>
  <bpmn:sequenceFlow id="Flow_MNT00_3" sourceRef="Task_MNT00_2" targetRef="Task_MNT00_3"/>
  <bpmn:sequenceFlow id="Flow_MNT00_4" sourceRef="Task_MNT00_3" targetRef="Task_MNT00_4"/>
  <bpmn:sequenceFlow id="Flow_MNT00_5" sourceRef="Task_MNT00_4" targetRef="Task_MNT00_5"/>
  <bpmn:sequenceFlow id="Flow_MNT00_6" sourceRef="Task_MNT00_5" targetRef="Task_MNT00_6"/>
  <bpmn:sequenceFlow id="Flow_MNT00_7" sourceRef="Task_MNT00_6" targetRef="Task_MNT00_7"/>
  <bpmn:sequenceFlow id="Flow_MNT00_8" sourceRef="Task_MNT00_7" targetRef="End_MNT00"/>
  <bpmn:dataObject id="Data_MNT00_1" name="Contrat de maintenance"/><bpmn:dataObjectReference id="DataRef_MNT00_1" dataObjectRef="Data_MNT00_1" name="Contrat de maintenance"/>
  <bpmn:dataObject id="Data_MNT00_2" name="SLA"/><bpmn:dataObjectReference id="DataRef_MNT00_2" dataObjectRef="Data_MNT00_2" name="SLA"/>
  <bpmn:dataObject id="Data_MNT00_3" name="Dossier de réversibilité"/><bpmn:dataObjectReference id="DataRef_MNT00_3" dataObjectRef="Data_MNT00_3" name="Dossier de réversibilité"/>
  <bpmn:association id="Assoc_MNT00_1" sourceRef="Task_MNT00_1" targetRef="DataRef_MNT00_1" associationDirection="One"/>
  <bpmn:association id="Assoc_MNT00_2" sourceRef="Task_MNT00_2" targetRef="DataRef_MNT00_2" associationDirection="One"/>
  <bpmn:association id="Assoc_MNT00_3" sourceRef="Task_MNT00_3" targetRef="DataRef_MNT00_3" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_MNT00_ITSM" dataStoreRef="Store_ITSM" name="Application ITSM"/><bpmn:association id="Assoc_MNT00_ITSM" sourceRef="Task_MNT00_7" targetRef="DataStoreRef_MNT00_ITSM" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT00_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_MNT00_GIT" sourceRef="Task_MNT00_7" targetRef="DataStoreRef_MNT00_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT00_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_MNT00_CICD" sourceRef="Task_MNT00_7" targetRef="DataStoreRef_MNT00_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT00_MON" dataStoreRef="Store_MON" name="Supervision"/><bpmn:association id="Assoc_MNT00_MON" sourceRef="Task_MNT00_7" targetRef="DataStoreRef_MNT00_MON" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT00_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_MNT00_DOCS" sourceRef="Task_MNT00_7" targetRef="DataStoreRef_MNT00_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Organiser la prise en charge et piloter incidents, correctifs, évolutions, versions et revues</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_MNT00"><bpmndi:BPMNPlane id="Plane_MNT00" bpmnElement="Process_MNT00">
  <bpmndi:BPMNShape id="Start_MNT00_di" bpmnElement="Start_MNT00"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT00_1_di" bpmnElement="Task_MNT00_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT00_2_di" bpmnElement="Task_MNT00_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT00_3_di" bpmnElement="Task_MNT00_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT00_4_di" bpmnElement="Task_MNT00_4"><dc:Bounds x="700" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT00_5_di" bpmnElement="Task_MNT00_5"><dc:Bounds x="890" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT00_6_di" bpmnElement="Task_MNT00_6"><dc:Bounds x="1080" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT00_7_di" bpmnElement="Task_MNT00_7"><dc:Bounds x="1270" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_MNT00_di" bpmnElement="End_MNT00"><dc:Bounds x="1480" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_MNT00_1_di" bpmnElement="Flow_MNT00_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT00_2_di" bpmnElement="Flow_MNT00_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT00_3_di" bpmnElement="Flow_MNT00_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT00_4_di" bpmnElement="Flow_MNT00_4"><di:waypoint x="660" y="198"/><di:waypoint x="700" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT00_5_di" bpmnElement="Flow_MNT00_5"><di:waypoint x="850" y="198"/><di:waypoint x="890" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT00_6_di" bpmnElement="Flow_MNT00_6"><di:waypoint x="1040" y="198"/><di:waypoint x="1080" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT00_7_di" bpmnElement="Flow_MNT00_7"><di:waypoint x="1230" y="198"/><di:waypoint x="1270" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT00_8_di" bpmnElement="Flow_MNT00_8"><di:waypoint x="1420" y="198"/><di:waypoint x="1480" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000027','reference-seed','8b000001-0000-4000-8000-000000000027','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_MNT01" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_MNT01" name="Prendre en charge un logiciel livré" isExecutable="false">
  <bpmn:startEvent id="Start_MNT01" name="Début"><bpmn:outgoing>Flow_MNT01_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_MNT01_1" name="[Service manager] Qualifier et planifier le besoin"><bpmn:incoming>Flow_MNT01_1</bpmn:incoming><bpmn:outgoing>Flow_MNT01_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT01_2" name="[Service manager] Réaliser et contrôler les activités"><bpmn:incoming>Flow_MNT01_2</bpmn:incoming><bpmn:outgoing>Flow_MNT01_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT01_3" name="[Service manager] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_MNT01_3</bpmn:incoming><bpmn:outgoing>Flow_MNT01_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_MNT01" name="Fin"><bpmn:incoming>Flow_MNT01_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_MNT01_1" sourceRef="Start_MNT01" targetRef="Task_MNT01_1"/>
  <bpmn:sequenceFlow id="Flow_MNT01_2" sourceRef="Task_MNT01_1" targetRef="Task_MNT01_2"/>
  <bpmn:sequenceFlow id="Flow_MNT01_3" sourceRef="Task_MNT01_2" targetRef="Task_MNT01_3"/>
  <bpmn:sequenceFlow id="Flow_MNT01_4" sourceRef="Task_MNT01_3" targetRef="End_MNT01"/>
  <bpmn:dataObject id="Data_MNT01_1" name="Dossier de transfert"/><bpmn:dataObjectReference id="DataRef_MNT01_1" dataObjectRef="Data_MNT01_1" name="Dossier de transfert"/>
  <bpmn:dataObject id="Data_MNT01_2" name="Fiche de configuration"/><bpmn:dataObjectReference id="DataRef_MNT01_2" dataObjectRef="Data_MNT01_2" name="Fiche de configuration"/>
  <bpmn:association id="Assoc_MNT01_1" sourceRef="Task_MNT01_1" targetRef="DataRef_MNT01_1" associationDirection="One"/>
  <bpmn:association id="Assoc_MNT01_2" sourceRef="Task_MNT01_2" targetRef="DataRef_MNT01_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_MNT01_ITSM" dataStoreRef="Store_ITSM" name="Application ITSM"/><bpmn:association id="Assoc_MNT01_ITSM" sourceRef="Task_MNT01_3" targetRef="DataStoreRef_MNT01_ITSM" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT01_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_MNT01_GIT" sourceRef="Task_MNT01_3" targetRef="DataStoreRef_MNT01_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT01_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_MNT01_CICD" sourceRef="Task_MNT01_3" targetRef="DataStoreRef_MNT01_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT01_MON" dataStoreRef="Store_MON" name="Supervision"/><bpmn:association id="Assoc_MNT01_MON" sourceRef="Task_MNT01_3" targetRef="DataStoreRef_MNT01_MON" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT01_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_MNT01_DOCS" sourceRef="Task_MNT01_3" targetRef="DataStoreRef_MNT01_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Transfert projet-maintenance, inventaire versions, SLA et supervision</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_MNT01"><bpmndi:BPMNPlane id="Plane_MNT01" bpmnElement="Process_MNT01">
  <bpmndi:BPMNShape id="Start_MNT01_di" bpmnElement="Start_MNT01"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT01_1_di" bpmnElement="Task_MNT01_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT01_2_di" bpmnElement="Task_MNT01_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT01_3_di" bpmnElement="Task_MNT01_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_MNT01_di" bpmnElement="End_MNT01"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_MNT01_1_di" bpmnElement="Flow_MNT01_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT01_2_di" bpmnElement="Flow_MNT01_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT01_3_di" bpmnElement="Flow_MNT01_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT01_4_di" bpmnElement="Flow_MNT01_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000028','reference-seed','8b000001-0000-4000-8000-000000000028','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_MNT02" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_MNT02" name="Traiter les incidents et demandes clients" isExecutable="false">
  <bpmn:startEvent id="Start_MNT02" name="Début"><bpmn:outgoing>Flow_MNT02_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_MNT02_1" name="[Support N1] Qualifier et planifier le besoin"><bpmn:incoming>Flow_MNT02_1</bpmn:incoming><bpmn:outgoing>Flow_MNT02_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT02_2" name="[Support N1] Réaliser et contrôler les activités"><bpmn:incoming>Flow_MNT02_2</bpmn:incoming><bpmn:outgoing>Flow_MNT02_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT02_3" name="[Support N1] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_MNT02_3</bpmn:incoming><bpmn:outgoing>Flow_MNT02_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_MNT02" name="Fin"><bpmn:incoming>Flow_MNT02_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_MNT02_1" sourceRef="Start_MNT02" targetRef="Task_MNT02_1"/>
  <bpmn:sequenceFlow id="Flow_MNT02_2" sourceRef="Task_MNT02_1" targetRef="Task_MNT02_2"/>
  <bpmn:sequenceFlow id="Flow_MNT02_3" sourceRef="Task_MNT02_2" targetRef="Task_MNT02_3"/>
  <bpmn:sequenceFlow id="Flow_MNT02_4" sourceRef="Task_MNT02_3" targetRef="End_MNT02"/>
  <bpmn:dataObject id="Data_MNT02_1" name="Ticket client"/><bpmn:dataObjectReference id="DataRef_MNT02_1" dataObjectRef="Data_MNT02_1" name="Ticket client"/>
  <bpmn:dataObject id="Data_MNT02_2" name="Historique des incidents"/><bpmn:dataObjectReference id="DataRef_MNT02_2" dataObjectRef="Data_MNT02_2" name="Historique des incidents"/>
  <bpmn:association id="Assoc_MNT02_1" sourceRef="Task_MNT02_1" targetRef="DataRef_MNT02_1" associationDirection="One"/>
  <bpmn:association id="Assoc_MNT02_2" sourceRef="Task_MNT02_2" targetRef="DataRef_MNT02_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_MNT02_ITSM" dataStoreRef="Store_ITSM" name="Application ITSM"/><bpmn:association id="Assoc_MNT02_ITSM" sourceRef="Task_MNT02_3" targetRef="DataStoreRef_MNT02_ITSM" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT02_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_MNT02_GIT" sourceRef="Task_MNT02_3" targetRef="DataStoreRef_MNT02_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT02_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_MNT02_CICD" sourceRef="Task_MNT02_3" targetRef="DataStoreRef_MNT02_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT02_MON" dataStoreRef="Store_MON" name="Supervision"/><bpmn:association id="Assoc_MNT02_MON" sourceRef="Task_MNT02_3" targetRef="DataStoreRef_MNT02_MON" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT02_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_MNT02_DOCS" sourceRef="Task_MNT02_3" targetRef="DataStoreRef_MNT02_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Enregistrer, qualifier, prioriser, diagnostiquer, escalader et confirmer la résolution</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_MNT02"><bpmndi:BPMNPlane id="Plane_MNT02" bpmnElement="Process_MNT02">
  <bpmndi:BPMNShape id="Start_MNT02_di" bpmnElement="Start_MNT02"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT02_1_di" bpmnElement="Task_MNT02_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT02_2_di" bpmnElement="Task_MNT02_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT02_3_di" bpmnElement="Task_MNT02_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_MNT02_di" bpmnElement="End_MNT02"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_MNT02_1_di" bpmnElement="Flow_MNT02_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT02_2_di" bpmnElement="Flow_MNT02_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT02_3_di" bpmnElement="Flow_MNT02_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT02_4_di" bpmnElement="Flow_MNT02_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000029','reference-seed','8b000001-0000-4000-8000-000000000029','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_MNT03" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_MNT03" name="Réaliser une maintenance corrective" isExecutable="false">
  <bpmn:startEvent id="Start_MNT03" name="Début"><bpmn:outgoing>Flow_MNT03_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_MNT03_1" name="[Tech lead] Qualifier et planifier le besoin"><bpmn:incoming>Flow_MNT03_1</bpmn:incoming><bpmn:outgoing>Flow_MNT03_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT03_2" name="[Tech lead] Réaliser et contrôler les activités"><bpmn:incoming>Flow_MNT03_2</bpmn:incoming><bpmn:outgoing>Flow_MNT03_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT03_3" name="[Tech lead] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_MNT03_3</bpmn:incoming><bpmn:outgoing>Flow_MNT03_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_MNT03" name="Fin"><bpmn:incoming>Flow_MNT03_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_MNT03_1" sourceRef="Start_MNT03" targetRef="Task_MNT03_1"/>
  <bpmn:sequenceFlow id="Flow_MNT03_2" sourceRef="Task_MNT03_1" targetRef="Task_MNT03_2"/>
  <bpmn:sequenceFlow id="Flow_MNT03_3" sourceRef="Task_MNT03_2" targetRef="Task_MNT03_3"/>
  <bpmn:sequenceFlow id="Flow_MNT03_4" sourceRef="Task_MNT03_3" targetRef="End_MNT03"/>
  <bpmn:dataObject id="Data_MNT03_1" name="Fiche anomalie"/><bpmn:dataObjectReference id="DataRef_MNT03_1" dataObjectRef="Data_MNT03_1" name="Fiche anomalie"/>
  <bpmn:dataObject id="Data_MNT03_2" name="Correctif"/><bpmn:dataObjectReference id="DataRef_MNT03_2" dataObjectRef="Data_MNT03_2" name="Correctif"/>
  <bpmn:dataObject id="Data_MNT03_3" name="Rapport de non-régression"/><bpmn:dataObjectReference id="DataRef_MNT03_3" dataObjectRef="Data_MNT03_3" name="Rapport de non-régression"/>
  <bpmn:association id="Assoc_MNT03_1" sourceRef="Task_MNT03_1" targetRef="DataRef_MNT03_1" associationDirection="One"/>
  <bpmn:association id="Assoc_MNT03_2" sourceRef="Task_MNT03_2" targetRef="DataRef_MNT03_2" associationDirection="One"/>
  <bpmn:association id="Assoc_MNT03_3" sourceRef="Task_MNT03_3" targetRef="DataRef_MNT03_3" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_MNT03_ITSM" dataStoreRef="Store_ITSM" name="Application ITSM"/><bpmn:association id="Assoc_MNT03_ITSM" sourceRef="Task_MNT03_3" targetRef="DataStoreRef_MNT03_ITSM" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT03_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_MNT03_GIT" sourceRef="Task_MNT03_3" targetRef="DataStoreRef_MNT03_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT03_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_MNT03_CICD" sourceRef="Task_MNT03_3" targetRef="DataStoreRef_MNT03_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT03_MON" dataStoreRef="Store_MON" name="Supervision"/><bpmn:association id="Assoc_MNT03_MON" sourceRef="Task_MNT03_3" targetRef="DataStoreRef_MNT03_MON" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT03_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_MNT03_DOCS" sourceRef="Task_MNT03_3" targetRef="DataStoreRef_MNT03_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Reproduire, analyser, corriger, tester et livrer le correctif</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_MNT03"><bpmndi:BPMNPlane id="Plane_MNT03" bpmnElement="Process_MNT03">
  <bpmndi:BPMNShape id="Start_MNT03_di" bpmnElement="Start_MNT03"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT03_1_di" bpmnElement="Task_MNT03_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT03_2_di" bpmnElement="Task_MNT03_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT03_3_di" bpmnElement="Task_MNT03_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_MNT03_di" bpmnElement="End_MNT03"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_MNT03_1_di" bpmnElement="Flow_MNT03_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT03_2_di" bpmnElement="Flow_MNT03_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT03_3_di" bpmnElement="Flow_MNT03_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT03_4_di" bpmnElement="Flow_MNT03_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000030','reference-seed','8b000001-0000-4000-8000-000000000030','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_MNT04" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_MNT04" name="Gérer une demande d''évolution" isExecutable="false">
  <bpmn:startEvent id="Start_MNT04" name="Début"><bpmn:outgoing>Flow_MNT04_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_MNT04_1" name="[Chef de projet] Qualifier et planifier le besoin"><bpmn:incoming>Flow_MNT04_1</bpmn:incoming><bpmn:outgoing>Flow_MNT04_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT04_2" name="[Chef de projet] Réaliser et contrôler les activités"><bpmn:incoming>Flow_MNT04_2</bpmn:incoming><bpmn:outgoing>Flow_MNT04_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT04_3" name="[Chef de projet] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_MNT04_3</bpmn:incoming><bpmn:outgoing>Flow_MNT04_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_MNT04" name="Fin"><bpmn:incoming>Flow_MNT04_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_MNT04_1" sourceRef="Start_MNT04" targetRef="Task_MNT04_1"/>
  <bpmn:sequenceFlow id="Flow_MNT04_2" sourceRef="Task_MNT04_1" targetRef="Task_MNT04_2"/>
  <bpmn:sequenceFlow id="Flow_MNT04_3" sourceRef="Task_MNT04_2" targetRef="Task_MNT04_3"/>
  <bpmn:sequenceFlow id="Flow_MNT04_4" sourceRef="Task_MNT04_3" targetRef="End_MNT04"/>
  <bpmn:dataObject id="Data_MNT04_1" name="Demande d''évolution"/><bpmn:dataObjectReference id="DataRef_MNT04_1" dataObjectRef="Data_MNT04_1" name="Demande d''évolution"/>
  <bpmn:dataObject id="Data_MNT04_2" name="Devis"/><bpmn:dataObjectReference id="DataRef_MNT04_2" dataObjectRef="Data_MNT04_2" name="Devis"/>
  <bpmn:dataObject id="Data_MNT04_3" name="Spécification"/><bpmn:dataObjectReference id="DataRef_MNT04_3" dataObjectRef="Data_MNT04_3" name="Spécification"/>
  <bpmn:association id="Assoc_MNT04_1" sourceRef="Task_MNT04_1" targetRef="DataRef_MNT04_1" associationDirection="One"/>
  <bpmn:association id="Assoc_MNT04_2" sourceRef="Task_MNT04_2" targetRef="DataRef_MNT04_2" associationDirection="One"/>
  <bpmn:association id="Assoc_MNT04_3" sourceRef="Task_MNT04_3" targetRef="DataRef_MNT04_3" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_MNT04_ITSM" dataStoreRef="Store_ITSM" name="Application ITSM"/><bpmn:association id="Assoc_MNT04_ITSM" sourceRef="Task_MNT04_3" targetRef="DataStoreRef_MNT04_ITSM" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT04_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_MNT04_GIT" sourceRef="Task_MNT04_3" targetRef="DataStoreRef_MNT04_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT04_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_MNT04_CICD" sourceRef="Task_MNT04_3" targetRef="DataStoreRef_MNT04_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT04_MON" dataStoreRef="Store_MON" name="Supervision"/><bpmn:association id="Assoc_MNT04_MON" sourceRef="Task_MNT04_3" targetRef="DataStoreRef_MNT04_MON" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT04_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_MNT04_DOCS" sourceRef="Task_MNT04_3" targetRef="DataStoreRef_MNT04_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Analyser impact, chiffrer, faire approuver et intégrer au backlog</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_MNT04"><bpmndi:BPMNPlane id="Plane_MNT04" bpmnElement="Process_MNT04">
  <bpmndi:BPMNShape id="Start_MNT04_di" bpmnElement="Start_MNT04"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT04_1_di" bpmnElement="Task_MNT04_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT04_2_di" bpmnElement="Task_MNT04_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT04_3_di" bpmnElement="Task_MNT04_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_MNT04_di" bpmnElement="End_MNT04"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_MNT04_1_di" bpmnElement="Flow_MNT04_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT04_2_di" bpmnElement="Flow_MNT04_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT04_3_di" bpmnElement="Flow_MNT04_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT04_4_di" bpmnElement="Flow_MNT04_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000031','reference-seed','8b000001-0000-4000-8000-000000000031','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_MNT05" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_MNT05" name="Gérer une version et une mise en production" isExecutable="false">
  <bpmn:startEvent id="Start_MNT05" name="Début"><bpmn:outgoing>Flow_MNT05_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_MNT05_1" name="[Responsable DevOps] Qualifier et planifier le besoin"><bpmn:incoming>Flow_MNT05_1</bpmn:incoming><bpmn:outgoing>Flow_MNT05_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT05_2" name="[Responsable DevOps] Réaliser et contrôler les activités"><bpmn:incoming>Flow_MNT05_2</bpmn:incoming><bpmn:outgoing>Flow_MNT05_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT05_3" name="[Responsable DevOps] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_MNT05_3</bpmn:incoming><bpmn:outgoing>Flow_MNT05_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_MNT05" name="Fin"><bpmn:incoming>Flow_MNT05_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_MNT05_1" sourceRef="Start_MNT05" targetRef="Task_MNT05_1"/>
  <bpmn:sequenceFlow id="Flow_MNT05_2" sourceRef="Task_MNT05_1" targetRef="Task_MNT05_2"/>
  <bpmn:sequenceFlow id="Flow_MNT05_3" sourceRef="Task_MNT05_2" targetRef="Task_MNT05_3"/>
  <bpmn:sequenceFlow id="Flow_MNT05_4" sourceRef="Task_MNT05_3" targetRef="End_MNT05"/>
  <bpmn:dataObject id="Data_MNT05_1" name="Plan de déploiement"/><bpmn:dataObjectReference id="DataRef_MNT05_1" dataObjectRef="Data_MNT05_1" name="Plan de déploiement"/>
  <bpmn:dataObject id="Data_MNT05_2" name="PV de mise en production"/><bpmn:dataObjectReference id="DataRef_MNT05_2" dataObjectRef="Data_MNT05_2" name="PV de mise en production"/>
  <bpmn:association id="Assoc_MNT05_1" sourceRef="Task_MNT05_1" targetRef="DataRef_MNT05_1" associationDirection="One"/>
  <bpmn:association id="Assoc_MNT05_2" sourceRef="Task_MNT05_2" targetRef="DataRef_MNT05_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_MNT05_ITSM" dataStoreRef="Store_ITSM" name="Application ITSM"/><bpmn:association id="Assoc_MNT05_ITSM" sourceRef="Task_MNT05_3" targetRef="DataStoreRef_MNT05_ITSM" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT05_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_MNT05_GIT" sourceRef="Task_MNT05_3" targetRef="DataStoreRef_MNT05_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT05_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_MNT05_CICD" sourceRef="Task_MNT05_3" targetRef="DataStoreRef_MNT05_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT05_MON" dataStoreRef="Store_MON" name="Supervision"/><bpmn:association id="Assoc_MNT05_MON" sourceRef="Task_MNT05_3" targetRef="DataStoreRef_MNT05_MON" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT05_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_MNT05_DOCS" sourceRef="Task_MNT05_3" targetRef="DataStoreRef_MNT05_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Préparer, approuver, déployer, contrôler et revenir arrière si besoin</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_MNT05"><bpmndi:BPMNPlane id="Plane_MNT05" bpmnElement="Process_MNT05">
  <bpmndi:BPMNShape id="Start_MNT05_di" bpmnElement="Start_MNT05"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT05_1_di" bpmnElement="Task_MNT05_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT05_2_di" bpmnElement="Task_MNT05_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT05_3_di" bpmnElement="Task_MNT05_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_MNT05_di" bpmnElement="End_MNT05"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_MNT05_1_di" bpmnElement="Flow_MNT05_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT05_2_di" bpmnElement="Flow_MNT05_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT05_3_di" bpmnElement="Flow_MNT05_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT05_4_di" bpmnElement="Flow_MNT05_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000032','reference-seed','8b000001-0000-4000-8000-000000000032','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_MNT06" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_MNT06" name="Réaliser la revue périodique de service" isExecutable="false">
  <bpmn:startEvent id="Start_MNT06" name="Début"><bpmn:outgoing>Flow_MNT06_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_MNT06_1" name="[Service manager] Qualifier et planifier le besoin"><bpmn:incoming>Flow_MNT06_1</bpmn:incoming><bpmn:outgoing>Flow_MNT06_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT06_2" name="[Service manager] Réaliser et contrôler les activités"><bpmn:incoming>Flow_MNT06_2</bpmn:incoming><bpmn:outgoing>Flow_MNT06_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT06_3" name="[Service manager] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_MNT06_3</bpmn:incoming><bpmn:outgoing>Flow_MNT06_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_MNT06" name="Fin"><bpmn:incoming>Flow_MNT06_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_MNT06_1" sourceRef="Start_MNT06" targetRef="Task_MNT06_1"/>
  <bpmn:sequenceFlow id="Flow_MNT06_2" sourceRef="Task_MNT06_1" targetRef="Task_MNT06_2"/>
  <bpmn:sequenceFlow id="Flow_MNT06_3" sourceRef="Task_MNT06_2" targetRef="Task_MNT06_3"/>
  <bpmn:sequenceFlow id="Flow_MNT06_4" sourceRef="Task_MNT06_3" targetRef="End_MNT06"/>
  <bpmn:dataObject id="Data_MNT06_1" name="Rapport SLA"/><bpmn:dataObjectReference id="DataRef_MNT06_1" dataObjectRef="Data_MNT06_1" name="Rapport SLA"/>
  <bpmn:dataObject id="Data_MNT06_2" name="Compte rendu de service"/><bpmn:dataObjectReference id="DataRef_MNT06_2" dataObjectRef="Data_MNT06_2" name="Compte rendu de service"/>
  <bpmn:association id="Assoc_MNT06_1" sourceRef="Task_MNT06_1" targetRef="DataRef_MNT06_1" associationDirection="One"/>
  <bpmn:association id="Assoc_MNT06_2" sourceRef="Task_MNT06_2" targetRef="DataRef_MNT06_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_MNT06_ITSM" dataStoreRef="Store_ITSM" name="Application ITSM"/><bpmn:association id="Assoc_MNT06_ITSM" sourceRef="Task_MNT06_3" targetRef="DataStoreRef_MNT06_ITSM" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT06_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_MNT06_GIT" sourceRef="Task_MNT06_3" targetRef="DataStoreRef_MNT06_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT06_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_MNT06_CICD" sourceRef="Task_MNT06_3" targetRef="DataStoreRef_MNT06_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT06_MON" dataStoreRef="Store_MON" name="Supervision"/><bpmn:association id="Assoc_MNT06_MON" sourceRef="Task_MNT06_3" targetRef="DataStoreRef_MNT06_MON" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT06_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_MNT06_DOCS" sourceRef="Task_MNT06_3" targetRef="DataStoreRef_MNT06_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Mesurer SLA, incidents, disponibilité, satisfaction et actions préventives</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_MNT06"><bpmndi:BPMNPlane id="Plane_MNT06" bpmnElement="Process_MNT06">
  <bpmndi:BPMNShape id="Start_MNT06_di" bpmnElement="Start_MNT06"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT06_1_di" bpmnElement="Task_MNT06_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT06_2_di" bpmnElement="Task_MNT06_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT06_3_di" bpmnElement="Task_MNT06_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_MNT06_di" bpmnElement="End_MNT06"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_MNT06_1_di" bpmnElement="Flow_MNT06_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT06_2_di" bpmnElement="Flow_MNT06_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT06_3_di" bpmnElement="Flow_MNT06_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT06_4_di" bpmnElement="Flow_MNT06_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES ('8c000000-0000-4000-8000-000000000033','reference-seed','8b000001-0000-4000-8000-000000000033','published',1,'<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_MNT07" targetNamespace="https://khi-flows.example/reference-it-company" exporter="KHI Flows" exporterVersion="reference-1.0">
 <bpmn:dataStore id="Store_ITSM" name="Application ITSM"/>
 <bpmn:dataStore id="Store_ERP" name="ERP et comptabilité"/>
 <bpmn:dataStore id="Store_SIRH" name="SIRH et paie"/>
 <bpmn:dataStore id="Store_CMDB" name="CMDB"/>
 <bpmn:dataStore id="Store_GIT" name="Dépôt Git"/>
 <bpmn:dataStore id="Store_CICD" name="CI/CD"/>
 <bpmn:dataStore id="Store_MON" name="Supervision"/>
 <bpmn:dataStore id="Store_DOCS" name="Base documentaire"/>
 <bpmn:process id="Process_MNT07" name="Clôturer la maintenance et organiser la réversibilité" isExecutable="false">
  <bpmn:startEvent id="Start_MNT07" name="Début"><bpmn:outgoing>Flow_MNT07_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:task id="Task_MNT07_1" name="[Service manager] Qualifier et planifier le besoin"><bpmn:incoming>Flow_MNT07_1</bpmn:incoming><bpmn:outgoing>Flow_MNT07_2</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT07_2" name="[Service manager] Réaliser et contrôler les activités"><bpmn:incoming>Flow_MNT07_2</bpmn:incoming><bpmn:outgoing>Flow_MNT07_3</bpmn:outgoing></bpmn:task>
  <bpmn:task id="Task_MNT07_3" name="[Service manager] Valider le résultat et archiver les preuves"><bpmn:incoming>Flow_MNT07_3</bpmn:incoming><bpmn:outgoing>Flow_MNT07_4</bpmn:outgoing></bpmn:task>
  <bpmn:endEvent id="End_MNT07" name="Fin"><bpmn:incoming>Flow_MNT07_4</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_MNT07_1" sourceRef="Start_MNT07" targetRef="Task_MNT07_1"/>
  <bpmn:sequenceFlow id="Flow_MNT07_2" sourceRef="Task_MNT07_1" targetRef="Task_MNT07_2"/>
  <bpmn:sequenceFlow id="Flow_MNT07_3" sourceRef="Task_MNT07_2" targetRef="Task_MNT07_3"/>
  <bpmn:sequenceFlow id="Flow_MNT07_4" sourceRef="Task_MNT07_3" targetRef="End_MNT07"/>
  <bpmn:dataObject id="Data_MNT07_1" name="Plan de réversibilité"/><bpmn:dataObjectReference id="DataRef_MNT07_1" dataObjectRef="Data_MNT07_1" name="Plan de réversibilité"/>
  <bpmn:dataObject id="Data_MNT07_2" name="PV de fin de service"/><bpmn:dataObjectReference id="DataRef_MNT07_2" dataObjectRef="Data_MNT07_2" name="PV de fin de service"/>
  <bpmn:association id="Assoc_MNT07_1" sourceRef="Task_MNT07_1" targetRef="DataRef_MNT07_1" associationDirection="One"/>
  <bpmn:association id="Assoc_MNT07_2" sourceRef="Task_MNT07_2" targetRef="DataRef_MNT07_2" associationDirection="One"/>
  <bpmn:dataStoreReference id="DataStoreRef_MNT07_ITSM" dataStoreRef="Store_ITSM" name="Application ITSM"/><bpmn:association id="Assoc_MNT07_ITSM" sourceRef="Task_MNT07_3" targetRef="DataStoreRef_MNT07_ITSM" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT07_GIT" dataStoreRef="Store_GIT" name="Dépôt Git"/><bpmn:association id="Assoc_MNT07_GIT" sourceRef="Task_MNT07_3" targetRef="DataStoreRef_MNT07_GIT" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT07_CICD" dataStoreRef="Store_CICD" name="CI/CD"/><bpmn:association id="Assoc_MNT07_CICD" sourceRef="Task_MNT07_3" targetRef="DataStoreRef_MNT07_CICD" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT07_MON" dataStoreRef="Store_MON" name="Supervision"/><bpmn:association id="Assoc_MNT07_MON" sourceRef="Task_MNT07_3" targetRef="DataStoreRef_MNT07_MON" associationDirection="One"/><bpmn:dataStoreReference id="DataStoreRef_MNT07_DOCS" dataStoreRef="Store_DOCS" name="Base documentaire"/><bpmn:association id="Assoc_MNT07_DOCS" sourceRef="Task_MNT07_3" targetRef="DataStoreRef_MNT07_DOCS" associationDirection="One"/>
  <bpmn:documentation>Processus du projet de référence. Les données sont fictives. Référentiel métier : Informer, transférer données et connaissances, révoquer accès et clôturer</bpmn:documentation>
 </bpmn:process>
 <bpmndi:BPMNDiagram id="Diagram_MNT07"><bpmndi:BPMNPlane id="Plane_MNT07" bpmnElement="Process_MNT07">
  <bpmndi:BPMNShape id="Start_MNT07_di" bpmnElement="Start_MNT07"><dc:Bounds x="50" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT07_1_di" bpmnElement="Task_MNT07_1"><dc:Bounds x="130" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT07_2_di" bpmnElement="Task_MNT07_2"><dc:Bounds x="320" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="Task_MNT07_3_di" bpmnElement="Task_MNT07_3"><dc:Bounds x="510" y="158" width="150" height="80"/></bpmndi:BPMNShape>
  <bpmndi:BPMNShape id="End_MNT07_di" bpmnElement="End_MNT07"><dc:Bounds x="720" y="180" width="36" height="36"/></bpmndi:BPMNShape>
  <bpmndi:BPMNEdge id="Flow_MNT07_1_di" bpmnElement="Flow_MNT07_1"><di:waypoint x="86" y="198"/><di:waypoint x="130" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT07_2_di" bpmnElement="Flow_MNT07_2"><di:waypoint x="280" y="198"/><di:waypoint x="320" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT07_3_di" bpmnElement="Flow_MNT07_3"><di:waypoint x="470" y="198"/><di:waypoint x="510" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNEdge id="Flow_MNT07_4_di" bpmnElement="Flow_MNT07_4"><di:waypoint x="660" y="198"/><di:waypoint x="720" y="198"/></bpmndi:BPMNEdge>
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>',NULL,'reference-seed') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,status='published',version=1,"updatedBy"='reference-seed';

INSERT INTO project_processes (id,"createdBy","projectId","resourceId",usage,"sourceResourceId") VALUES
('8e000000-0000-4000-8000-000000000001','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000001','project-specific',NULL),
('8e000000-0000-4000-8000-000000000002','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000002','project-specific',NULL),
('8e000000-0000-4000-8000-000000000003','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000003','project-specific',NULL),
('8e000000-0000-4000-8000-000000000004','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000004','project-specific',NULL),
('8e000000-0000-4000-8000-000000000005','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000005','project-specific',NULL),
('8e000000-0000-4000-8000-000000000006','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000006','project-specific',NULL),
('8e000000-0000-4000-8000-000000000007','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000007','project-specific',NULL),
('8e000000-0000-4000-8000-000000000008','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000008','project-specific',NULL),
('8e000000-0000-4000-8000-000000000009','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000009','project-specific',NULL),
('8e000000-0000-4000-8000-000000000010','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000010','project-specific',NULL),
('8e000000-0000-4000-8000-000000000011','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000011','project-specific',NULL),
('8e000000-0000-4000-8000-000000000012','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000012','project-specific',NULL),
('8e000000-0000-4000-8000-000000000013','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000013','project-specific',NULL),
('8e000000-0000-4000-8000-000000000014','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000014','project-specific',NULL),
('8e000000-0000-4000-8000-000000000015','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000015','project-specific',NULL),
('8e000000-0000-4000-8000-000000000016','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000016','project-specific',NULL),
('8e000000-0000-4000-8000-000000000017','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000017','project-specific',NULL),
('8e000000-0000-4000-8000-000000000018','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000018','project-specific',NULL),
('8e000000-0000-4000-8000-000000000019','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000019','project-specific',NULL),
('8e000000-0000-4000-8000-000000000020','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000020','project-specific',NULL),
('8e000000-0000-4000-8000-000000000021','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000021','project-specific',NULL),
('8e000000-0000-4000-8000-000000000022','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000022','project-specific',NULL),
('8e000000-0000-4000-8000-000000000023','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000023','project-specific',NULL),
('8e000000-0000-4000-8000-000000000024','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000024','project-specific',NULL),
('8e000000-0000-4000-8000-000000000025','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000025','project-specific',NULL),
('8e000000-0000-4000-8000-000000000026','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','project-specific',NULL),
('8e000000-0000-4000-8000-000000000027','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000027','project-specific',NULL),
('8e000000-0000-4000-8000-000000000028','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000028','project-specific',NULL),
('8e000000-0000-4000-8000-000000000029','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000029','project-specific',NULL),
('8e000000-0000-4000-8000-000000000030','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000030','project-specific',NULL),
('8e000000-0000-4000-8000-000000000031','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000031','project-specific',NULL),
('8e000000-0000-4000-8000-000000000032','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000032','project-specific',NULL),
('8e000000-0000-4000-8000-000000000033','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000033','project-specific',NULL)
ON CONFLICT ("projectId","resourceId") DO NOTHING;

INSERT INTO project_raci_actors (id,"createdBy","projectId",name,"normalizedName",active,origin) VALUES
('8f000000-0000-4000-8000-000000000001','reference-seed','8a000000-0000-4000-8000-000000000001','Direction générale','direction générale',true,'manual'),
('8f000000-0000-4000-8000-000000000002','reference-seed','8a000000-0000-4000-8000-000000000001','Direction commerciale','direction commerciale',true,'manual'),
('8f000000-0000-4000-8000-000000000003','reference-seed','8a000000-0000-4000-8000-000000000001','Responsable RH','responsable rh',true,'manual'),
('8f000000-0000-4000-8000-000000000004','reference-seed','8a000000-0000-4000-8000-000000000001','Manager opérationnel','manager opérationnel',true,'manual'),
('8f000000-0000-4000-8000-000000000005','reference-seed','8a000000-0000-4000-8000-000000000001','Direction des opérations','direction des opérations',true,'manual'),
('8f000000-0000-4000-8000-000000000006','reference-seed','8a000000-0000-4000-8000-000000000001','Chef de projet','chef de projet',true,'manual'),
('8f000000-0000-4000-8000-000000000007','reference-seed','8a000000-0000-4000-8000-000000000001','Responsable financier','responsable financier',true,'manual'),
('8f000000-0000-4000-8000-000000000008','reference-seed','8a000000-0000-4000-8000-000000000001','Gestionnaire paie','gestionnaire paie',true,'manual'),
('8f000000-0000-4000-8000-000000000009','reference-seed','8a000000-0000-4000-8000-000000000001','Acheteur','acheteur',true,'manual'),
('8f000000-0000-4000-8000-000000000010','reference-seed','8a000000-0000-4000-8000-000000000001','Responsable IT','responsable it',true,'manual'),
('8f000000-0000-4000-8000-000000000011','reference-seed','8a000000-0000-4000-8000-000000000001','Responsable sécurité','responsable sécurité',true,'manual'),
('8f000000-0000-4000-8000-000000000012','reference-seed','8a000000-0000-4000-8000-000000000001','Support N1','support n1',true,'manual'),
('8f000000-0000-4000-8000-000000000013','reference-seed','8a000000-0000-4000-8000-000000000001','Support N2 / développeur','support n2 / développeur',true,'manual'),
('8f000000-0000-4000-8000-000000000014','reference-seed','8a000000-0000-4000-8000-000000000001','Tech lead / architecte','tech lead / architecte',true,'manual'),
('8f000000-0000-4000-8000-000000000015','reference-seed','8a000000-0000-4000-8000-000000000001','Équipe de développement','équipe de développement',true,'manual'),
('8f000000-0000-4000-8000-000000000016','reference-seed','8a000000-0000-4000-8000-000000000001','Responsable qualité / test','responsable qualité / test',true,'manual'),
('8f000000-0000-4000-8000-000000000017','reference-seed','8a000000-0000-4000-8000-000000000001','Business analyst','business analyst',true,'manual'),
('8f000000-0000-4000-8000-000000000018','reference-seed','8a000000-0000-4000-8000-000000000001','Responsable DevOps','responsable devops',true,'manual'),
('8f000000-0000-4000-8000-000000000019','reference-seed','8a000000-0000-4000-8000-000000000001','Service manager','service manager',true,'manual'),
('8f000000-0000-4000-8000-000000000020','reference-seed','8a000000-0000-4000-8000-000000000001','Représentant client','représentant client',true,'manual')
ON CONFLICT ("projectId","normalizedName") DO NOTHING;

INSERT INTO project_raci_entries (id,"createdBy","projectId","resourceId","taskId","taskName","actorName",role) VALUES
('90000000-0000-4000-8000-000000000001','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000001','Task_GOV01_1','Qualifier et planifier le besoin','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000002','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000001','Task_GOV01_1','Qualifier et planifier le besoin','Direction générale','A'),
('90000000-0000-4000-8000-000000000003','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000001','Task_GOV01_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000004','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000001','Task_GOV01_2','Réaliser et contrôler les activités','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000005','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000001','Task_GOV01_2','Réaliser et contrôler les activités','Direction générale','A'),
('90000000-0000-4000-8000-000000000006','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000001','Task_GOV01_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000007','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000001','Task_GOV01_3','Valider le résultat et archiver les preuves','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000008','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000001','Task_GOV01_3','Valider le résultat et archiver les preuves','Direction générale','A'),
('90000000-0000-4000-8000-000000000009','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000001','Task_GOV01_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000010','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000002','Task_GOV02_1','Qualifier et planifier le besoin','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000011','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000002','Task_GOV02_1','Qualifier et planifier le besoin','Direction générale','A'),
('90000000-0000-4000-8000-000000000012','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000002','Task_GOV02_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000013','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000002','Task_GOV02_2','Réaliser et contrôler les activités','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000014','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000002','Task_GOV02_2','Réaliser et contrôler les activités','Direction générale','A'),
('90000000-0000-4000-8000-000000000015','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000002','Task_GOV02_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000016','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000002','Task_GOV02_3','Valider le résultat et archiver les preuves','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000017','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000002','Task_GOV02_3','Valider le résultat et archiver les preuves','Direction générale','A'),
('90000000-0000-4000-8000-000000000018','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000002','Task_GOV02_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000019','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000003','Task_GOV03_1','Qualifier et planifier le besoin','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000020','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000003','Task_GOV03_1','Qualifier et planifier le besoin','Direction générale','A'),
('90000000-0000-4000-8000-000000000021','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000003','Task_GOV03_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000022','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000003','Task_GOV03_2','Réaliser et contrôler les activités','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000023','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000003','Task_GOV03_2','Réaliser et contrôler les activités','Direction générale','A'),
('90000000-0000-4000-8000-000000000024','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000003','Task_GOV03_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000025','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000003','Task_GOV03_3','Valider le résultat et archiver les preuves','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000026','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000003','Task_GOV03_3','Valider le résultat et archiver les preuves','Direction générale','A'),
('90000000-0000-4000-8000-000000000027','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000003','Task_GOV03_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000028','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000004','Task_GOV04_1','Qualifier et planifier le besoin','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000029','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000004','Task_GOV04_1','Qualifier et planifier le besoin','Direction générale','A'),
('90000000-0000-4000-8000-000000000030','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000004','Task_GOV04_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000031','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000004','Task_GOV04_2','Réaliser et contrôler les activités','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000032','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000004','Task_GOV04_2','Réaliser et contrôler les activités','Direction générale','A'),
('90000000-0000-4000-8000-000000000033','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000004','Task_GOV04_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000034','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000004','Task_GOV04_3','Valider le résultat et archiver les preuves','Direction commerciale','R'),
('90000000-0000-4000-8000-000000000035','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000004','Task_GOV04_3','Valider le résultat et archiver les preuves','Direction générale','A'),
('90000000-0000-4000-8000-000000000036','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000004','Task_GOV04_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000037','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000005','Task_HR01_1','Qualifier et planifier le besoin','Responsable RH','R'),
('90000000-0000-4000-8000-000000000038','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000005','Task_HR01_1','Qualifier et planifier le besoin','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000039','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000005','Task_HR01_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000040','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000005','Task_HR01_2','Réaliser et contrôler les activités','Responsable RH','R'),
('90000000-0000-4000-8000-000000000041','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000005','Task_HR01_2','Réaliser et contrôler les activités','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000042','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000005','Task_HR01_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000043','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000005','Task_HR01_3','Valider le résultat et archiver les preuves','Responsable RH','R'),
('90000000-0000-4000-8000-000000000044','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000005','Task_HR01_3','Valider le résultat et archiver les preuves','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000045','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000005','Task_HR01_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000046','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000006','Task_HR02_1','Qualifier et planifier le besoin','Responsable RH','R'),
('90000000-0000-4000-8000-000000000047','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000006','Task_HR02_1','Qualifier et planifier le besoin','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000048','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000006','Task_HR02_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000049','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000006','Task_HR02_2','Réaliser et contrôler les activités','Responsable RH','R'),
('90000000-0000-4000-8000-000000000050','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000006','Task_HR02_2','Réaliser et contrôler les activités','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000051','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000006','Task_HR02_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000052','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000006','Task_HR02_3','Valider le résultat et archiver les preuves','Responsable RH','R'),
('90000000-0000-4000-8000-000000000053','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000006','Task_HR02_3','Valider le résultat et archiver les preuves','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000054','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000006','Task_HR02_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000055','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000007','Task_HR03_1','Qualifier et planifier le besoin','Responsable RH','R'),
('90000000-0000-4000-8000-000000000056','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000007','Task_HR03_1','Qualifier et planifier le besoin','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000057','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000007','Task_HR03_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000058','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000007','Task_HR03_2','Réaliser et contrôler les activités','Responsable RH','R'),
('90000000-0000-4000-8000-000000000059','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000007','Task_HR03_2','Réaliser et contrôler les activités','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000060','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000007','Task_HR03_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000061','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000007','Task_HR03_3','Valider le résultat et archiver les preuves','Responsable RH','R'),
('90000000-0000-4000-8000-000000000062','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000007','Task_HR03_3','Valider le résultat et archiver les preuves','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000063','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000007','Task_HR03_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000064','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000008','Task_HR04_1','Qualifier et planifier le besoin','Responsable RH','R'),
('90000000-0000-4000-8000-000000000065','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000008','Task_HR04_1','Qualifier et planifier le besoin','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000066','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000008','Task_HR04_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000067','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000008','Task_HR04_2','Réaliser et contrôler les activités','Responsable RH','R'),
('90000000-0000-4000-8000-000000000068','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000008','Task_HR04_2','Réaliser et contrôler les activités','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000069','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000008','Task_HR04_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000070','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000008','Task_HR04_3','Valider le résultat et archiver les preuves','Responsable RH','R'),
('90000000-0000-4000-8000-000000000071','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000008','Task_HR04_3','Valider le résultat et archiver les preuves','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000072','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000008','Task_HR04_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000073','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000009','Task_HR05_1','Qualifier et planifier le besoin','Responsable RH','R'),
('90000000-0000-4000-8000-000000000074','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000009','Task_HR05_1','Qualifier et planifier le besoin','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000075','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000009','Task_HR05_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000076','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000009','Task_HR05_2','Réaliser et contrôler les activités','Responsable RH','R'),
('90000000-0000-4000-8000-000000000077','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000009','Task_HR05_2','Réaliser et contrôler les activités','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000078','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000009','Task_HR05_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000079','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000009','Task_HR05_3','Valider le résultat et archiver les preuves','Responsable RH','R'),
('90000000-0000-4000-8000-000000000080','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000009','Task_HR05_3','Valider le résultat et archiver les preuves','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000081','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000009','Task_HR05_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000082','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000010','Task_HR06_1','Qualifier et planifier le besoin','Responsable RH','R'),
('90000000-0000-4000-8000-000000000083','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000010','Task_HR06_1','Qualifier et planifier le besoin','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000084','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000010','Task_HR06_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000085','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000010','Task_HR06_2','Réaliser et contrôler les activités','Responsable RH','R'),
('90000000-0000-4000-8000-000000000086','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000010','Task_HR06_2','Réaliser et contrôler les activités','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000087','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000010','Task_HR06_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000088','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000010','Task_HR06_3','Valider le résultat et archiver les preuves','Responsable RH','R'),
('90000000-0000-4000-8000-000000000089','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000010','Task_HR06_3','Valider le résultat et archiver les preuves','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000090','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000010','Task_HR06_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000091','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000011','Task_HR07_1','Qualifier et planifier le besoin','Responsable RH','R'),
('90000000-0000-4000-8000-000000000092','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000011','Task_HR07_1','Qualifier et planifier le besoin','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000093','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000011','Task_HR07_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000094','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000011','Task_HR07_2','Réaliser et contrôler les activités','Responsable RH','R'),
('90000000-0000-4000-8000-000000000095','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000011','Task_HR07_2','Réaliser et contrôler les activités','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000096','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000011','Task_HR07_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000097','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000011','Task_HR07_3','Valider le résultat et archiver les preuves','Responsable RH','R'),
('90000000-0000-4000-8000-000000000098','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000011','Task_HR07_3','Valider le résultat et archiver les preuves','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000099','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000011','Task_HR07_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000100','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000012','Task_HR08_1','Qualifier et planifier le besoin','Responsable RH','R'),
('90000000-0000-4000-8000-000000000101','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000012','Task_HR08_1','Qualifier et planifier le besoin','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000102','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000012','Task_HR08_1','Qualifier et planifier le besoin','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000103','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000012','Task_HR08_2','Réaliser et contrôler les activités','Responsable RH','R'),
('90000000-0000-4000-8000-000000000104','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000012','Task_HR08_2','Réaliser et contrôler les activités','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000105','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000012','Task_HR08_2','Réaliser et contrôler les activités','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000106','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000012','Task_HR08_3','Valider le résultat et archiver les preuves','Responsable RH','R'),
('90000000-0000-4000-8000-000000000107','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000012','Task_HR08_3','Valider le résultat et archiver les preuves','Manager opérationnel','A'),
('90000000-0000-4000-8000-000000000108','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000012','Task_HR08_3','Valider le résultat et archiver les preuves','Direction des opérations','C'),
('90000000-0000-4000-8000-000000000109','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000013','Task_FIN01_1','Qualifier et planifier le besoin','Responsable financier','R'),
('90000000-0000-4000-8000-000000000110','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000013','Task_FIN01_1','Qualifier et planifier le besoin','Direction générale','A'),
('90000000-0000-4000-8000-000000000111','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000013','Task_FIN01_1','Qualifier et planifier le besoin','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000112','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000013','Task_FIN01_2','Réaliser et contrôler les activités','Responsable financier','R'),
('90000000-0000-4000-8000-000000000113','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000013','Task_FIN01_2','Réaliser et contrôler les activités','Direction générale','A'),
('90000000-0000-4000-8000-000000000114','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000013','Task_FIN01_2','Réaliser et contrôler les activités','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000115','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000013','Task_FIN01_3','Valider le résultat et archiver les preuves','Responsable financier','R'),
('90000000-0000-4000-8000-000000000116','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000013','Task_FIN01_3','Valider le résultat et archiver les preuves','Direction générale','A'),
('90000000-0000-4000-8000-000000000117','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000013','Task_FIN01_3','Valider le résultat et archiver les preuves','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000118','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000014','Task_FIN02_1','Qualifier et planifier le besoin','Responsable financier','R'),
('90000000-0000-4000-8000-000000000119','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000014','Task_FIN02_1','Qualifier et planifier le besoin','Direction générale','A'),
('90000000-0000-4000-8000-000000000120','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000014','Task_FIN02_1','Qualifier et planifier le besoin','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000121','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000014','Task_FIN02_2','Réaliser et contrôler les activités','Responsable financier','R'),
('90000000-0000-4000-8000-000000000122','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000014','Task_FIN02_2','Réaliser et contrôler les activités','Direction générale','A'),
('90000000-0000-4000-8000-000000000123','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000014','Task_FIN02_2','Réaliser et contrôler les activités','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000124','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000014','Task_FIN02_3','Valider le résultat et archiver les preuves','Responsable financier','R'),
('90000000-0000-4000-8000-000000000125','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000014','Task_FIN02_3','Valider le résultat et archiver les preuves','Direction générale','A'),
('90000000-0000-4000-8000-000000000126','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000014','Task_FIN02_3','Valider le résultat et archiver les preuves','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000127','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000015','Task_FIN03_1','Qualifier et planifier le besoin','Responsable financier','R'),
('90000000-0000-4000-8000-000000000128','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000015','Task_FIN03_1','Qualifier et planifier le besoin','Direction générale','A'),
('90000000-0000-4000-8000-000000000129','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000015','Task_FIN03_1','Qualifier et planifier le besoin','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000130','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000015','Task_FIN03_2','Réaliser et contrôler les activités','Responsable financier','R'),
('90000000-0000-4000-8000-000000000131','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000015','Task_FIN03_2','Réaliser et contrôler les activités','Direction générale','A'),
('90000000-0000-4000-8000-000000000132','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000015','Task_FIN03_2','Réaliser et contrôler les activités','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000133','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000015','Task_FIN03_3','Valider le résultat et archiver les preuves','Responsable financier','R'),
('90000000-0000-4000-8000-000000000134','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000015','Task_FIN03_3','Valider le résultat et archiver les preuves','Direction générale','A'),
('90000000-0000-4000-8000-000000000135','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000015','Task_FIN03_3','Valider le résultat et archiver les preuves','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000136','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000016','Task_FIN04_1','Qualifier et planifier le besoin','Responsable financier','R'),
('90000000-0000-4000-8000-000000000137','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000016','Task_FIN04_1','Qualifier et planifier le besoin','Direction générale','A'),
('90000000-0000-4000-8000-000000000138','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000016','Task_FIN04_1','Qualifier et planifier le besoin','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000139','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000016','Task_FIN04_2','Réaliser et contrôler les activités','Responsable financier','R'),
('90000000-0000-4000-8000-000000000140','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000016','Task_FIN04_2','Réaliser et contrôler les activités','Direction générale','A'),
('90000000-0000-4000-8000-000000000141','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000016','Task_FIN04_2','Réaliser et contrôler les activités','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000142','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000016','Task_FIN04_3','Valider le résultat et archiver les preuves','Responsable financier','R'),
('90000000-0000-4000-8000-000000000143','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000016','Task_FIN04_3','Valider le résultat et archiver les preuves','Direction générale','A'),
('90000000-0000-4000-8000-000000000144','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000016','Task_FIN04_3','Valider le résultat et archiver les preuves','Gestionnaire paie','C'),
('90000000-0000-4000-8000-000000000145','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000017','Task_IT01_1','Qualifier et planifier le besoin','Support N1','R'),
('90000000-0000-4000-8000-000000000146','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000017','Task_IT01_1','Qualifier et planifier le besoin','Responsable IT','A'),
('90000000-0000-4000-8000-000000000147','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000017','Task_IT01_1','Qualifier et planifier le besoin','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000148','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000017','Task_IT01_2','Réaliser et contrôler les activités','Support N1','R'),
('90000000-0000-4000-8000-000000000149','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000017','Task_IT01_2','Réaliser et contrôler les activités','Responsable IT','A'),
('90000000-0000-4000-8000-000000000150','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000017','Task_IT01_2','Réaliser et contrôler les activités','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000151','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000017','Task_IT01_3','Valider le résultat et archiver les preuves','Support N1','R'),
('90000000-0000-4000-8000-000000000152','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000017','Task_IT01_3','Valider le résultat et archiver les preuves','Responsable IT','A'),
('90000000-0000-4000-8000-000000000153','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000017','Task_IT01_3','Valider le résultat et archiver les preuves','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000154','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000018','Task_IT02_1','Qualifier et planifier le besoin','Support N1','R'),
('90000000-0000-4000-8000-000000000155','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000018','Task_IT02_1','Qualifier et planifier le besoin','Responsable IT','A'),
('90000000-0000-4000-8000-000000000156','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000018','Task_IT02_1','Qualifier et planifier le besoin','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000157','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000018','Task_IT02_2','Réaliser et contrôler les activités','Support N1','R'),
('90000000-0000-4000-8000-000000000158','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000018','Task_IT02_2','Réaliser et contrôler les activités','Responsable IT','A'),
('90000000-0000-4000-8000-000000000159','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000018','Task_IT02_2','Réaliser et contrôler les activités','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000160','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000018','Task_IT02_3','Valider le résultat et archiver les preuves','Support N1','R'),
('90000000-0000-4000-8000-000000000161','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000018','Task_IT02_3','Valider le résultat et archiver les preuves','Responsable IT','A'),
('90000000-0000-4000-8000-000000000162','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000018','Task_IT02_3','Valider le résultat et archiver les preuves','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000163','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000019','Task_IT03_1','Qualifier et planifier le besoin','Support N1','R'),
('90000000-0000-4000-8000-000000000164','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000019','Task_IT03_1','Qualifier et planifier le besoin','Responsable IT','A'),
('90000000-0000-4000-8000-000000000165','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000019','Task_IT03_1','Qualifier et planifier le besoin','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000166','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000019','Task_IT03_2','Réaliser et contrôler les activités','Support N1','R'),
('90000000-0000-4000-8000-000000000167','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000019','Task_IT03_2','Réaliser et contrôler les activités','Responsable IT','A'),
('90000000-0000-4000-8000-000000000168','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000019','Task_IT03_2','Réaliser et contrôler les activités','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000169','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000019','Task_IT03_3','Valider le résultat et archiver les preuves','Support N1','R'),
('90000000-0000-4000-8000-000000000170','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000019','Task_IT03_3','Valider le résultat et archiver les preuves','Responsable IT','A'),
('90000000-0000-4000-8000-000000000171','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000019','Task_IT03_3','Valider le résultat et archiver les preuves','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000172','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000020','Task_IT04_1','Qualifier et planifier le besoin','Support N1','R'),
('90000000-0000-4000-8000-000000000173','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000020','Task_IT04_1','Qualifier et planifier le besoin','Responsable IT','A'),
('90000000-0000-4000-8000-000000000174','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000020','Task_IT04_1','Qualifier et planifier le besoin','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000175','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000020','Task_IT04_2','Réaliser et contrôler les activités','Support N1','R'),
('90000000-0000-4000-8000-000000000176','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000020','Task_IT04_2','Réaliser et contrôler les activités','Responsable IT','A'),
('90000000-0000-4000-8000-000000000177','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000020','Task_IT04_2','Réaliser et contrôler les activités','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000178','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000020','Task_IT04_3','Valider le résultat et archiver les preuves','Support N1','R'),
('90000000-0000-4000-8000-000000000179','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000020','Task_IT04_3','Valider le résultat et archiver les preuves','Responsable IT','A'),
('90000000-0000-4000-8000-000000000180','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000020','Task_IT04_3','Valider le résultat et archiver les preuves','Responsable sécurité','C'),
('90000000-0000-4000-8000-000000000181','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000021','Task_DEL01_1','Qualifier et planifier le besoin','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000182','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000021','Task_DEL01_1','Qualifier et planifier le besoin','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000183','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000021','Task_DEL01_1','Qualifier et planifier le besoin','Business analyst','C'),
('90000000-0000-4000-8000-000000000184','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000021','Task_DEL01_2','Réaliser et contrôler les activités','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000185','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000021','Task_DEL01_2','Réaliser et contrôler les activités','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000186','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000021','Task_DEL01_2','Réaliser et contrôler les activités','Business analyst','C'),
('90000000-0000-4000-8000-000000000187','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000021','Task_DEL01_3','Valider le résultat et archiver les preuves','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000188','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000021','Task_DEL01_3','Valider le résultat et archiver les preuves','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000189','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000021','Task_DEL01_3','Valider le résultat et archiver les preuves','Business analyst','C'),
('90000000-0000-4000-8000-000000000190','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000022','Task_DEL02_1','Qualifier et planifier le besoin','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000191','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000022','Task_DEL02_1','Qualifier et planifier le besoin','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000192','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000022','Task_DEL02_1','Qualifier et planifier le besoin','Business analyst','C'),
('90000000-0000-4000-8000-000000000193','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000022','Task_DEL02_2','Réaliser et contrôler les activités','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000194','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000022','Task_DEL02_2','Réaliser et contrôler les activités','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000195','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000022','Task_DEL02_2','Réaliser et contrôler les activités','Business analyst','C'),
('90000000-0000-4000-8000-000000000196','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000022','Task_DEL02_3','Valider le résultat et archiver les preuves','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000197','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000022','Task_DEL02_3','Valider le résultat et archiver les preuves','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000198','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000022','Task_DEL02_3','Valider le résultat et archiver les preuves','Business analyst','C'),
('90000000-0000-4000-8000-000000000199','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000023','Task_DEL03_1','Qualifier et planifier le besoin','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000200','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000023','Task_DEL03_1','Qualifier et planifier le besoin','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000201','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000023','Task_DEL03_1','Qualifier et planifier le besoin','Business analyst','C'),
('90000000-0000-4000-8000-000000000202','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000023','Task_DEL03_2','Réaliser et contrôler les activités','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000203','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000023','Task_DEL03_2','Réaliser et contrôler les activités','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000204','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000023','Task_DEL03_2','Réaliser et contrôler les activités','Business analyst','C'),
('90000000-0000-4000-8000-000000000205','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000023','Task_DEL03_3','Valider le résultat et archiver les preuves','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000206','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000023','Task_DEL03_3','Valider le résultat et archiver les preuves','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000207','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000023','Task_DEL03_3','Valider le résultat et archiver les preuves','Business analyst','C'),
('90000000-0000-4000-8000-000000000208','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000024','Task_DEL04_1','Qualifier et planifier le besoin','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000209','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000024','Task_DEL04_1','Qualifier et planifier le besoin','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000210','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000024','Task_DEL04_1','Qualifier et planifier le besoin','Business analyst','C'),
('90000000-0000-4000-8000-000000000211','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000024','Task_DEL04_2','Réaliser et contrôler les activités','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000212','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000024','Task_DEL04_2','Réaliser et contrôler les activités','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000213','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000024','Task_DEL04_2','Réaliser et contrôler les activités','Business analyst','C'),
('90000000-0000-4000-8000-000000000214','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000024','Task_DEL04_3','Valider le résultat et archiver les preuves','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000215','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000024','Task_DEL04_3','Valider le résultat et archiver les preuves','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000216','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000024','Task_DEL04_3','Valider le résultat et archiver les preuves','Business analyst','C'),
('90000000-0000-4000-8000-000000000217','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000025','Task_DEL05_1','Qualifier et planifier le besoin','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000218','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000025','Task_DEL05_1','Qualifier et planifier le besoin','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000219','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000025','Task_DEL05_1','Qualifier et planifier le besoin','Business analyst','C'),
('90000000-0000-4000-8000-000000000220','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000025','Task_DEL05_2','Réaliser et contrôler les activités','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000221','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000025','Task_DEL05_2','Réaliser et contrôler les activités','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000222','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000025','Task_DEL05_2','Réaliser et contrôler les activités','Business analyst','C'),
('90000000-0000-4000-8000-000000000223','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000025','Task_DEL05_3','Valider le résultat et archiver les preuves','Équipe de développement','R'),
('90000000-0000-4000-8000-000000000224','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000025','Task_DEL05_3','Valider le résultat et archiver les preuves','Tech lead / architecte','A'),
('90000000-0000-4000-8000-000000000225','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000025','Task_DEL05_3','Valider le résultat et archiver les preuves','Business analyst','C'),
('90000000-0000-4000-8000-000000000226','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_1','Prendre en charge un logiciel livré','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000227','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_1','Prendre en charge un logiciel livré','Service manager','A'),
('90000000-0000-4000-8000-000000000228','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_1','Prendre en charge un logiciel livré','Représentant client','C'),
('90000000-0000-4000-8000-000000000229','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_2','Traiter les incidents et demandes clients','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000230','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_2','Traiter les incidents et demandes clients','Service manager','A'),
('90000000-0000-4000-8000-000000000231','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_2','Traiter les incidents et demandes clients','Représentant client','C'),
('90000000-0000-4000-8000-000000000232','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_3','Réaliser une maintenance corrective','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000233','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_3','Réaliser une maintenance corrective','Service manager','A'),
('90000000-0000-4000-8000-000000000234','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_3','Réaliser une maintenance corrective','Représentant client','C'),
('90000000-0000-4000-8000-000000000235','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_4','Gérer une demande d''évolution','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000236','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_4','Gérer une demande d''évolution','Service manager','A'),
('90000000-0000-4000-8000-000000000237','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_4','Gérer une demande d''évolution','Représentant client','C'),
('90000000-0000-4000-8000-000000000238','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_5','Gérer une version et une mise en production','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000239','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_5','Gérer une version et une mise en production','Service manager','A'),
('90000000-0000-4000-8000-000000000240','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_5','Gérer une version et une mise en production','Représentant client','C'),
('90000000-0000-4000-8000-000000000241','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_6','Réaliser la revue périodique de service','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000242','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_6','Réaliser la revue périodique de service','Service manager','A'),
('90000000-0000-4000-8000-000000000243','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_6','Réaliser la revue périodique de service','Représentant client','C'),
('90000000-0000-4000-8000-000000000244','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_7','Clôturer la maintenance et organiser la réversibilité','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000245','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_7','Clôturer la maintenance et organiser la réversibilité','Service manager','A'),
('90000000-0000-4000-8000-000000000246','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000026','Task_MNT00_7','Clôturer la maintenance et organiser la réversibilité','Représentant client','C'),
('90000000-0000-4000-8000-000000000247','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000027','Task_MNT01_1','Qualifier et planifier le besoin','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000248','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000027','Task_MNT01_1','Qualifier et planifier le besoin','Service manager','A'),
('90000000-0000-4000-8000-000000000249','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000027','Task_MNT01_1','Qualifier et planifier le besoin','Représentant client','C'),
('90000000-0000-4000-8000-000000000250','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000027','Task_MNT01_2','Réaliser et contrôler les activités','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000251','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000027','Task_MNT01_2','Réaliser et contrôler les activités','Service manager','A'),
('90000000-0000-4000-8000-000000000252','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000027','Task_MNT01_2','Réaliser et contrôler les activités','Représentant client','C'),
('90000000-0000-4000-8000-000000000253','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000027','Task_MNT01_3','Valider le résultat et archiver les preuves','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000254','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000027','Task_MNT01_3','Valider le résultat et archiver les preuves','Service manager','A'),
('90000000-0000-4000-8000-000000000255','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000027','Task_MNT01_3','Valider le résultat et archiver les preuves','Représentant client','C'),
('90000000-0000-4000-8000-000000000256','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000028','Task_MNT02_1','Qualifier et planifier le besoin','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000257','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000028','Task_MNT02_1','Qualifier et planifier le besoin','Service manager','A'),
('90000000-0000-4000-8000-000000000258','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000028','Task_MNT02_1','Qualifier et planifier le besoin','Représentant client','C'),
('90000000-0000-4000-8000-000000000259','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000028','Task_MNT02_2','Réaliser et contrôler les activités','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000260','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000028','Task_MNT02_2','Réaliser et contrôler les activités','Service manager','A'),
('90000000-0000-4000-8000-000000000261','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000028','Task_MNT02_2','Réaliser et contrôler les activités','Représentant client','C'),
('90000000-0000-4000-8000-000000000262','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000028','Task_MNT02_3','Valider le résultat et archiver les preuves','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000263','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000028','Task_MNT02_3','Valider le résultat et archiver les preuves','Service manager','A'),
('90000000-0000-4000-8000-000000000264','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000028','Task_MNT02_3','Valider le résultat et archiver les preuves','Représentant client','C'),
('90000000-0000-4000-8000-000000000265','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000029','Task_MNT03_1','Qualifier et planifier le besoin','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000266','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000029','Task_MNT03_1','Qualifier et planifier le besoin','Service manager','A'),
('90000000-0000-4000-8000-000000000267','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000029','Task_MNT03_1','Qualifier et planifier le besoin','Représentant client','C'),
('90000000-0000-4000-8000-000000000268','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000029','Task_MNT03_2','Réaliser et contrôler les activités','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000269','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000029','Task_MNT03_2','Réaliser et contrôler les activités','Service manager','A'),
('90000000-0000-4000-8000-000000000270','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000029','Task_MNT03_2','Réaliser et contrôler les activités','Représentant client','C'),
('90000000-0000-4000-8000-000000000271','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000029','Task_MNT03_3','Valider le résultat et archiver les preuves','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000272','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000029','Task_MNT03_3','Valider le résultat et archiver les preuves','Service manager','A'),
('90000000-0000-4000-8000-000000000273','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000029','Task_MNT03_3','Valider le résultat et archiver les preuves','Représentant client','C'),
('90000000-0000-4000-8000-000000000274','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000030','Task_MNT04_1','Qualifier et planifier le besoin','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000275','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000030','Task_MNT04_1','Qualifier et planifier le besoin','Service manager','A'),
('90000000-0000-4000-8000-000000000276','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000030','Task_MNT04_1','Qualifier et planifier le besoin','Représentant client','C'),
('90000000-0000-4000-8000-000000000277','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000030','Task_MNT04_2','Réaliser et contrôler les activités','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000278','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000030','Task_MNT04_2','Réaliser et contrôler les activités','Service manager','A'),
('90000000-0000-4000-8000-000000000279','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000030','Task_MNT04_2','Réaliser et contrôler les activités','Représentant client','C'),
('90000000-0000-4000-8000-000000000280','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000030','Task_MNT04_3','Valider le résultat et archiver les preuves','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000281','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000030','Task_MNT04_3','Valider le résultat et archiver les preuves','Service manager','A'),
('90000000-0000-4000-8000-000000000282','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000030','Task_MNT04_3','Valider le résultat et archiver les preuves','Représentant client','C'),
('90000000-0000-4000-8000-000000000283','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000031','Task_MNT05_1','Qualifier et planifier le besoin','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000284','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000031','Task_MNT05_1','Qualifier et planifier le besoin','Service manager','A'),
('90000000-0000-4000-8000-000000000285','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000031','Task_MNT05_1','Qualifier et planifier le besoin','Représentant client','C'),
('90000000-0000-4000-8000-000000000286','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000031','Task_MNT05_2','Réaliser et contrôler les activités','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000287','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000031','Task_MNT05_2','Réaliser et contrôler les activités','Service manager','A'),
('90000000-0000-4000-8000-000000000288','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000031','Task_MNT05_2','Réaliser et contrôler les activités','Représentant client','C'),
('90000000-0000-4000-8000-000000000289','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000031','Task_MNT05_3','Valider le résultat et archiver les preuves','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000290','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000031','Task_MNT05_3','Valider le résultat et archiver les preuves','Service manager','A'),
('90000000-0000-4000-8000-000000000291','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000031','Task_MNT05_3','Valider le résultat et archiver les preuves','Représentant client','C'),
('90000000-0000-4000-8000-000000000292','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000032','Task_MNT06_1','Qualifier et planifier le besoin','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000293','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000032','Task_MNT06_1','Qualifier et planifier le besoin','Service manager','A'),
('90000000-0000-4000-8000-000000000294','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000032','Task_MNT06_1','Qualifier et planifier le besoin','Représentant client','C'),
('90000000-0000-4000-8000-000000000295','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000032','Task_MNT06_2','Réaliser et contrôler les activités','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000296','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000032','Task_MNT06_2','Réaliser et contrôler les activités','Service manager','A'),
('90000000-0000-4000-8000-000000000297','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000032','Task_MNT06_2','Réaliser et contrôler les activités','Représentant client','C'),
('90000000-0000-4000-8000-000000000298','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000032','Task_MNT06_3','Valider le résultat et archiver les preuves','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000299','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000032','Task_MNT06_3','Valider le résultat et archiver les preuves','Service manager','A'),
('90000000-0000-4000-8000-000000000300','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000032','Task_MNT06_3','Valider le résultat et archiver les preuves','Représentant client','C'),
('90000000-0000-4000-8000-000000000301','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000033','Task_MNT07_1','Qualifier et planifier le besoin','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000302','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000033','Task_MNT07_1','Qualifier et planifier le besoin','Service manager','A'),
('90000000-0000-4000-8000-000000000303','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000033','Task_MNT07_1','Qualifier et planifier le besoin','Représentant client','C'),
('90000000-0000-4000-8000-000000000304','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000033','Task_MNT07_2','Réaliser et contrôler les activités','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000305','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000033','Task_MNT07_2','Réaliser et contrôler les activités','Service manager','A'),
('90000000-0000-4000-8000-000000000306','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000033','Task_MNT07_2','Réaliser et contrôler les activités','Représentant client','C'),
('90000000-0000-4000-8000-000000000307','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000033','Task_MNT07_3','Valider le résultat et archiver les preuves','Support N2 / développeur','R'),
('90000000-0000-4000-8000-000000000308','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000033','Task_MNT07_3','Valider le résultat et archiver les preuves','Service manager','A'),
('90000000-0000-4000-8000-000000000309','reference-seed','8a000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000033','Task_MNT07_3','Valider le résultat et archiver les preuves','Représentant client','C')
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_documented_sources (id,"projectId",kind,name,description,link,location,access,retention,"containsPersonalData","createdBy") VALUES
('8d000000-0000-4000-8000-000000000001','8a000000-0000-4000-8000-000000000001','file','Budget annuel','Information documentée utilisée par le processus Piloter l''entreprise et les capacités.',NULL,'/Référentiel/GOV/GOV01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000002','8a000000-0000-4000-8000-000000000001','file','Tableau de bord de capacité','Information documentée utilisée par le processus Piloter l''entreprise et les capacités.',NULL,'/Référentiel/GOV/GOV01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000003','8a000000-0000-4000-8000-000000000001','file','Fiche opportunité','Information documentée utilisée par le processus Gérer une opportunité et contractualiser.',NULL,'/Référentiel/GOV/GOV02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000004','8a000000-0000-4000-8000-000000000001','file','Offre commerciale','Information documentée utilisée par le processus Gérer une opportunité et contractualiser.',NULL,'/Référentiel/GOV/GOV02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000005','8a000000-0000-4000-8000-000000000001','file','Contrat client','Information documentée utilisée par le processus Gérer une opportunité et contractualiser.',NULL,'/Référentiel/GOV/GOV02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000006','8a000000-0000-4000-8000-000000000001','file','Plan projet','Information documentée utilisée par le processus Piloter un projet client.',NULL,'/Référentiel/GOV/GOV03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000007','8a000000-0000-4000-8000-000000000001','file','Registre des risques','Information documentée utilisée par le processus Piloter un projet client.',NULL,'/Référentiel/GOV/GOV03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000008','8a000000-0000-4000-8000-000000000001','file','Compte rendu projet','Information documentée utilisée par le processus Piloter un projet client.',NULL,'/Référentiel/GOV/GOV03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000009','8a000000-0000-4000-8000-000000000001','file','Bon de commande client','Information documentée utilisée par le processus Gérer les commandes clients et la facturation.',NULL,'/Référentiel/GOV/GOV04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000010','8a000000-0000-4000-8000-000000000001','file','PV de livraison','Information documentée utilisée par le processus Gérer les commandes clients et la facturation.',NULL,'/Référentiel/GOV/GOV04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000011','8a000000-0000-4000-8000-000000000001','file','Dossier de facturation','Information documentée utilisée par le processus Gérer les commandes clients et la facturation.',NULL,'/Référentiel/GOV/GOV04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000012','8a000000-0000-4000-8000-000000000001','file','Demande de recrutement','Information documentée utilisée par le processus Recruter un collaborateur.',NULL,'/Référentiel/HR/HR01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000013','8a000000-0000-4000-8000-000000000001','file','Fiche de poste','Information documentée utilisée par le processus Recruter un collaborateur.',NULL,'/Référentiel/HR/HR01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000014','8a000000-0000-4000-8000-000000000001','file','Contrat de travail','Information documentée utilisée par le processus Établir et signer le contrat de travail.',NULL,'/Référentiel/HR/HR02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',true,'reference-seed'),
('8d000000-0000-4000-8000-000000000015','8a000000-0000-4000-8000-000000000001','file','Preuve de signature','Information documentée utilisée par le processus Établir et signer le contrat de travail.',NULL,'/Référentiel/HR/HR02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000016','8a000000-0000-4000-8000-000000000001','file','Parcours d''intégration','Information documentée utilisée par le processus Réaliser l''intégration d''un collaborateur.',NULL,'/Référentiel/HR/HR03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000017','8a000000-0000-4000-8000-000000000001','file','Charte informatique signée','Information documentée utilisée par le processus Réaliser l''intégration d''un collaborateur.',NULL,'/Référentiel/HR/HR03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000018','8a000000-0000-4000-8000-000000000001','file','Demande d''achat','Information documentée utilisée par le processus Commander et attribuer un équipement.',NULL,'/Référentiel/HR/HR04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000019','8a000000-0000-4000-8000-000000000001','file','Fiche inventaire','Information documentée utilisée par le processus Commander et attribuer un équipement.',NULL,'/Référentiel/HR/HR04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000020','8a000000-0000-4000-8000-000000000001','file','PV de remise et charte','Information documentée utilisée par le processus Commander et attribuer un équipement.',NULL,'/Référentiel/HR/HR04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000021','8a000000-0000-4000-8000-000000000001','file','Matrice de compétences','Information documentée utilisée par le processus Gérer les affectations aux projets.',NULL,'/Référentiel/HR/HR05/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000022','8a000000-0000-4000-8000-000000000001','file','Affectation projet','Information documentée utilisée par le processus Gérer les affectations aux projets.',NULL,'/Référentiel/HR/HR05/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000023','8a000000-0000-4000-8000-000000000001','file','Demande de congé','Information documentée utilisée par le processus Gérer les absences et congés.',NULL,'/Référentiel/HR/HR06/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000024','8a000000-0000-4000-8000-000000000001','file','Calendrier des absences','Information documentée utilisée par le processus Gérer les absences et congés.',NULL,'/Référentiel/HR/HR06/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',true,'reference-seed'),
('8d000000-0000-4000-8000-000000000025','8a000000-0000-4000-8000-000000000001','file','Compte rendu entretien','Information documentée utilisée par le processus Réaliser les entretiens et évaluations.',NULL,'/Référentiel/HR/HR07/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',true,'reference-seed'),
('8d000000-0000-4000-8000-000000000026','8a000000-0000-4000-8000-000000000001','file','Objectifs annuels','Information documentée utilisée par le processus Réaliser les entretiens et évaluations.',NULL,'/Référentiel/HR/HR07/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000027','8a000000-0000-4000-8000-000000000001','file','Plan de formation','Information documentée utilisée par le processus Gérer les formations et compétences.',NULL,'/Référentiel/HR/HR08/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000028','8a000000-0000-4000-8000-000000000001','file','Attestation de formation','Information documentée utilisée par le processus Gérer les formations et compétences.',NULL,'/Référentiel/HR/HR08/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000029','8a000000-0000-4000-8000-000000000001','file','Note de frais','Information documentée utilisée par le processus Traiter les notes de frais.',NULL,'/Référentiel/FIN/FIN01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000030','8a000000-0000-4000-8000-000000000001','file','Justificatifs','Information documentée utilisée par le processus Traiter les notes de frais.',NULL,'/Référentiel/FIN/FIN01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000031','8a000000-0000-4000-8000-000000000001','file','Variables de paie','Information documentée utilisée par le processus Préparer et exécuter la paie.',NULL,'/Référentiel/FIN/FIN02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',true,'reference-seed'),
('8d000000-0000-4000-8000-000000000032','8a000000-0000-4000-8000-000000000001','file','Bulletin de paie','Information documentée utilisée par le processus Préparer et exécuter la paie.',NULL,'/Référentiel/FIN/FIN02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',true,'reference-seed'),
('8d000000-0000-4000-8000-000000000033','8a000000-0000-4000-8000-000000000001','file','Demande d''achat','Information documentée utilisée par le processus Acheter un bien ou un service.',NULL,'/Référentiel/FIN/FIN03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000034','8a000000-0000-4000-8000-000000000001','file','Bon de commande fournisseur','Information documentée utilisée par le processus Acheter un bien ou un service.',NULL,'/Référentiel/FIN/FIN03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000035','8a000000-0000-4000-8000-000000000001','file','PV réception','Information documentée utilisée par le processus Acheter un bien ou un service.',NULL,'/Référentiel/FIN/FIN03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000036','8a000000-0000-4000-8000-000000000001','file','Feuille de temps','Information documentée utilisée par le processus Suivre le temps et la rentabilité projet.',NULL,'/Référentiel/FIN/FIN04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000037','8a000000-0000-4000-8000-000000000001','file','Tableau de rentabilité','Information documentée utilisée par le processus Suivre le temps et la rentabilité projet.',NULL,'/Référentiel/FIN/FIN04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000038','8a000000-0000-4000-8000-000000000001','file','Ticket ITSM','Information documentée utilisée par le processus Traiter un ticket de support interne.',NULL,'/Référentiel/IT/IT01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000039','8a000000-0000-4000-8000-000000000001','file','Base de connaissances','Information documentée utilisée par le processus Traiter un ticket de support interne.',NULL,'/Référentiel/IT/IT01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000040','8a000000-0000-4000-8000-000000000001','file','CMDB','Information documentée utilisée par le processus Gérer le parc et le cycle de vie matériel.',NULL,'/Référentiel/IT/IT02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000041','8a000000-0000-4000-8000-000000000001','file','Registre des équipements','Information documentée utilisée par le processus Gérer le parc et le cycle de vie matériel.',NULL,'/Référentiel/IT/IT02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000042','8a000000-0000-4000-8000-000000000001','file','Demande d''accès','Information documentée utilisée par le processus Gérer les accès et habilitations.',NULL,'/Référentiel/IT/IT03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000043','8a000000-0000-4000-8000-000000000001','file','Matrice des habilitations','Information documentée utilisée par le processus Gérer les accès et habilitations.',NULL,'/Référentiel/IT/IT03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000044','8a000000-0000-4000-8000-000000000001','file','Politique de sauvegarde','Information documentée utilisée par le processus Gérer les sauvegardes et restaurations.',NULL,'/Référentiel/IT/IT04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000045','8a000000-0000-4000-8000-000000000001','file','Rapport de restauration','Information documentée utilisée par le processus Gérer les sauvegardes et restaurations.',NULL,'/Référentiel/IT/IT04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000046','8a000000-0000-4000-8000-000000000001','file','Spécifications','Information documentée utilisée par le processus Recueillir et valider les exigences client.',NULL,'/Référentiel/DEL/DEL01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000047','8a000000-0000-4000-8000-000000000001','file','Backlog produit','Information documentée utilisée par le processus Recueillir et valider les exigences client.',NULL,'/Référentiel/DEL/DEL01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000048','8a000000-0000-4000-8000-000000000001','file','Dossier d''architecture','Information documentée utilisée par le processus Concevoir et développer un logiciel.',NULL,'/Référentiel/DEL/DEL02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000049','8a000000-0000-4000-8000-000000000001','file','Code source','Information documentée utilisée par le processus Concevoir et développer un logiciel.',NULL,'/Référentiel/DEL/DEL02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000050','8a000000-0000-4000-8000-000000000001','file','Pull request','Information documentée utilisée par le processus Concevoir et développer un logiciel.',NULL,'/Référentiel/DEL/DEL02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000051','8a000000-0000-4000-8000-000000000001','file','Plan de tests','Information documentée utilisée par le processus Réaliser les tests internes.',NULL,'/Référentiel/DEL/DEL03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000052','8a000000-0000-4000-8000-000000000001','file','Rapport de tests','Information documentée utilisée par le processus Réaliser les tests internes.',NULL,'/Référentiel/DEL/DEL03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000053','8a000000-0000-4000-8000-000000000001','file','Cahier de recette','Information documentée utilisée par le processus Organiser la recette et l''acceptation client.',NULL,'/Référentiel/DEL/DEL04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000054','8a000000-0000-4000-8000-000000000001','file','PV de recette client','Information documentée utilisée par le processus Organiser la recette et l''acceptation client.',NULL,'/Référentiel/DEL/DEL04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000055','8a000000-0000-4000-8000-000000000001','file','Dossier de mise en production','Information documentée utilisée par le processus Déployer et livrer une version.',NULL,'/Référentiel/DEL/DEL05/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000056','8a000000-0000-4000-8000-000000000001','file','Notes de version','Information documentée utilisée par le processus Déployer et livrer une version.',NULL,'/Référentiel/DEL/DEL05/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000057','8a000000-0000-4000-8000-000000000001','file','Contrat de maintenance','Information documentée utilisée par le processus Gérer le service et la maintenance du logiciel.',NULL,'/Référentiel/MNT/MNT00/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000058','8a000000-0000-4000-8000-000000000001','file','SLA','Information documentée utilisée par le processus Gérer le service et la maintenance du logiciel.',NULL,'/Référentiel/MNT/MNT00/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000059','8a000000-0000-4000-8000-000000000001','file','Dossier de réversibilité','Information documentée utilisée par le processus Gérer le service et la maintenance du logiciel.',NULL,'/Référentiel/MNT/MNT00/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000060','8a000000-0000-4000-8000-000000000001','file','Dossier de transfert','Information documentée utilisée par le processus Prendre en charge un logiciel livré.',NULL,'/Référentiel/MNT/MNT01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000061','8a000000-0000-4000-8000-000000000001','file','Fiche de configuration','Information documentée utilisée par le processus Prendre en charge un logiciel livré.',NULL,'/Référentiel/MNT/MNT01/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000062','8a000000-0000-4000-8000-000000000001','file','Ticket client','Information documentée utilisée par le processus Traiter les incidents et demandes clients.',NULL,'/Référentiel/MNT/MNT02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000063','8a000000-0000-4000-8000-000000000001','file','Historique des incidents','Information documentée utilisée par le processus Traiter les incidents et demandes clients.',NULL,'/Référentiel/MNT/MNT02/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000064','8a000000-0000-4000-8000-000000000001','file','Fiche anomalie','Information documentée utilisée par le processus Réaliser une maintenance corrective.',NULL,'/Référentiel/MNT/MNT03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000065','8a000000-0000-4000-8000-000000000001','file','Correctif','Information documentée utilisée par le processus Réaliser une maintenance corrective.',NULL,'/Référentiel/MNT/MNT03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000066','8a000000-0000-4000-8000-000000000001','file','Rapport de non-régression','Information documentée utilisée par le processus Réaliser une maintenance corrective.',NULL,'/Référentiel/MNT/MNT03/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000067','8a000000-0000-4000-8000-000000000001','file','Demande d''évolution','Information documentée utilisée par le processus Gérer une demande d''évolution.',NULL,'/Référentiel/MNT/MNT04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000068','8a000000-0000-4000-8000-000000000001','file','Devis','Information documentée utilisée par le processus Gérer une demande d''évolution.',NULL,'/Référentiel/MNT/MNT04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000069','8a000000-0000-4000-8000-000000000001','file','Spécification','Information documentée utilisée par le processus Gérer une demande d''évolution.',NULL,'/Référentiel/MNT/MNT04/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000070','8a000000-0000-4000-8000-000000000001','file','Plan de déploiement','Information documentée utilisée par le processus Gérer une version et une mise en production.',NULL,'/Référentiel/MNT/MNT05/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000071','8a000000-0000-4000-8000-000000000001','file','PV de mise en production','Information documentée utilisée par le processus Gérer une version et une mise en production.',NULL,'/Référentiel/MNT/MNT05/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000072','8a000000-0000-4000-8000-000000000001','file','Rapport SLA','Information documentée utilisée par le processus Réaliser la revue périodique de service.',NULL,'/Référentiel/MNT/MNT06/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000073','8a000000-0000-4000-8000-000000000001','file','Compte rendu de service','Information documentée utilisée par le processus Réaliser la revue périodique de service.',NULL,'/Référentiel/MNT/MNT06/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000074','8a000000-0000-4000-8000-000000000001','file','Plan de réversibilité','Information documentée utilisée par le processus Clôturer la maintenance et organiser la réversibilité.',NULL,'/Référentiel/MNT/MNT07/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000075','8a000000-0000-4000-8000-000000000001','file','PV de fin de service','Information documentée utilisée par le processus Clôturer la maintenance et organiser la réversibilité.',NULL,'/Référentiel/MNT/MNT07/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000076','8a000000-0000-4000-8000-000000000001','application','Application ITSM','Gestion des tickets internes et clients','https://itsm.demo.invalid',NULL,'Comptes nominatifs et droits selon fonction.','Selon politique de conservation.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000077','8a000000-0000-4000-8000-000000000001','application','ERP et comptabilité','Achats, commandes, facturation et comptabilité','https://erp.demo.invalid',NULL,'Comptes nominatifs et droits selon fonction.','Selon politique de conservation.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000078','8a000000-0000-4000-8000-000000000001','application','SIRH et paie','Dossiers collaborateurs, absences et paie','https://hr.demo.invalid',NULL,'Comptes nominatifs et droits selon fonction.','Selon politique de conservation.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000079','8a000000-0000-4000-8000-000000000001','database','CMDB','Inventaire des actifs, configurations et affectations',NULL,NULL,'Comptes nominatifs et droits selon fonction.','Selon politique de conservation.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000080','8a000000-0000-4000-8000-000000000001','application','Dépôt Git','Code source, revues et versions','https://git.demo.invalid',NULL,'Comptes nominatifs et droits selon fonction.','Selon politique de conservation.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000081','8a000000-0000-4000-8000-000000000001','application','CI/CD','Intégration continue, tests et déploiements','https://cicd.demo.invalid',NULL,'Comptes nominatifs et droits selon fonction.','Selon politique de conservation.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000082','8a000000-0000-4000-8000-000000000001','application','Supervision','Disponibilité, alertes et métriques de service','https://monitoring.demo.invalid',NULL,'Comptes nominatifs et droits selon fonction.','Selon politique de conservation.',false,'reference-seed'),
('8d000000-0000-4000-8000-000000000083','8a000000-0000-4000-8000-000000000001','application','Base documentaire','Procédures, dossiers projet et base de connaissances','https://docs.demo.invalid',NULL,'Comptes nominatifs et droits selon fonction.','Selon politique de conservation.',false,'reference-seed')
,('8d000000-0000-4000-8000-000000000084','8a000000-0000-4000-8000-000000000001','form','Présentation et organigramme NovaSys','Entreprise fictive de services numériques concevant, réalisant, déployant et maintenant des logiciels pour des clients professionnels. Organisation fonctionnelle : Direction générale ; Direction commerciale ; Ressources humaines ; Direction des opérations ; Finance et administration ; Systèmes d’information internes ; Pôle réalisation logicielle ; Pôle services et maintenance. Les responsabilités détaillées sont représentées par les acteurs RACI du projet. Cette présentation ne constitue pas un référentiel de postes ou de collaborateurs.',NULL,'/Référentiel/Organisation/','Accès selon le rôle projet et les habilitations métier.','Selon la politique de conservation applicable.',false,'reference-seed')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,link=EXCLUDED.link,location=EXCLUDED.location,access=EXCLUDED.access,retention=EXCLUDED.retention,"containsPersonalData"=EXCLUDED."containsPersonalData";

INSERT INTO project_documented_source_references (id,"projectId","sourceId","resourceId","elementId","elementName","elementType","createdBy") VALUES
('91000000-0000-4000-8000-000000000001','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000001','8b000001-0000-4000-8000-000000000001','DataRef_GOV01_1','Budget annuel','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000002','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000002','8b000001-0000-4000-8000-000000000001','DataRef_GOV01_2','Tableau de bord de capacité','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000003','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000003','8b000001-0000-4000-8000-000000000002','DataRef_GOV02_1','Fiche opportunité','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000004','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000004','8b000001-0000-4000-8000-000000000002','DataRef_GOV02_2','Offre commerciale','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000005','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000005','8b000001-0000-4000-8000-000000000002','DataRef_GOV02_3','Contrat client','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000006','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000006','8b000001-0000-4000-8000-000000000003','DataRef_GOV03_1','Plan projet','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000007','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000007','8b000001-0000-4000-8000-000000000003','DataRef_GOV03_2','Registre des risques','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000008','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000008','8b000001-0000-4000-8000-000000000003','DataRef_GOV03_3','Compte rendu projet','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000009','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000009','8b000001-0000-4000-8000-000000000004','DataRef_GOV04_1','Bon de commande client','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000010','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000010','8b000001-0000-4000-8000-000000000004','DataRef_GOV04_2','PV de livraison','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000011','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000011','8b000001-0000-4000-8000-000000000004','DataRef_GOV04_3','Dossier de facturation','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000012','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000012','8b000001-0000-4000-8000-000000000005','DataRef_HR01_1','Demande de recrutement','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000013','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000013','8b000001-0000-4000-8000-000000000005','DataRef_HR01_2','Fiche de poste','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000014','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000014','8b000001-0000-4000-8000-000000000006','DataRef_HR02_1','Contrat de travail','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000015','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000015','8b000001-0000-4000-8000-000000000006','DataRef_HR02_2','Preuve de signature','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000016','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000016','8b000001-0000-4000-8000-000000000007','DataRef_HR03_1','Parcours d''intégration','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000017','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000017','8b000001-0000-4000-8000-000000000007','DataRef_HR03_2','Charte informatique signée','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000018','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000018','8b000001-0000-4000-8000-000000000008','DataRef_HR04_1','Demande d''achat','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000019','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000019','8b000001-0000-4000-8000-000000000008','DataRef_HR04_2','Fiche inventaire','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000020','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000020','8b000001-0000-4000-8000-000000000008','DataRef_HR04_3','PV de remise et charte','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000021','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000021','8b000001-0000-4000-8000-000000000009','DataRef_HR05_1','Matrice de compétences','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000022','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000022','8b000001-0000-4000-8000-000000000009','DataRef_HR05_2','Affectation projet','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000023','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000023','8b000001-0000-4000-8000-000000000010','DataRef_HR06_1','Demande de congé','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000024','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000024','8b000001-0000-4000-8000-000000000010','DataRef_HR06_2','Calendrier des absences','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000025','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000025','8b000001-0000-4000-8000-000000000011','DataRef_HR07_1','Compte rendu entretien','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000026','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000026','8b000001-0000-4000-8000-000000000011','DataRef_HR07_2','Objectifs annuels','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000027','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000027','8b000001-0000-4000-8000-000000000012','DataRef_HR08_1','Plan de formation','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000028','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000028','8b000001-0000-4000-8000-000000000012','DataRef_HR08_2','Attestation de formation','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000029','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000029','8b000001-0000-4000-8000-000000000013','DataRef_FIN01_1','Note de frais','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000030','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000030','8b000001-0000-4000-8000-000000000013','DataRef_FIN01_2','Justificatifs','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000031','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000031','8b000001-0000-4000-8000-000000000014','DataRef_FIN02_1','Variables de paie','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000032','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000032','8b000001-0000-4000-8000-000000000014','DataRef_FIN02_2','Bulletin de paie','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000033','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000033','8b000001-0000-4000-8000-000000000015','DataRef_FIN03_1','Demande d''achat','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000034','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000034','8b000001-0000-4000-8000-000000000015','DataRef_FIN03_2','Bon de commande fournisseur','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000035','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000035','8b000001-0000-4000-8000-000000000015','DataRef_FIN03_3','PV réception','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000036','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000036','8b000001-0000-4000-8000-000000000016','DataRef_FIN04_1','Feuille de temps','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000037','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000037','8b000001-0000-4000-8000-000000000016','DataRef_FIN04_2','Tableau de rentabilité','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000038','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000038','8b000001-0000-4000-8000-000000000017','DataRef_IT01_1','Ticket ITSM','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000039','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000039','8b000001-0000-4000-8000-000000000017','DataRef_IT01_2','Base de connaissances','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000040','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000040','8b000001-0000-4000-8000-000000000018','DataRef_IT02_1','CMDB','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000041','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000041','8b000001-0000-4000-8000-000000000018','DataRef_IT02_2','Registre des équipements','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000042','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000042','8b000001-0000-4000-8000-000000000019','DataRef_IT03_1','Demande d''accès','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000043','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000043','8b000001-0000-4000-8000-000000000019','DataRef_IT03_2','Matrice des habilitations','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000044','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000044','8b000001-0000-4000-8000-000000000020','DataRef_IT04_1','Politique de sauvegarde','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000045','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000045','8b000001-0000-4000-8000-000000000020','DataRef_IT04_2','Rapport de restauration','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000046','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000046','8b000001-0000-4000-8000-000000000021','DataRef_DEL01_1','Spécifications','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000047','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000047','8b000001-0000-4000-8000-000000000021','DataRef_DEL01_2','Backlog produit','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000048','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000048','8b000001-0000-4000-8000-000000000022','DataRef_DEL02_1','Dossier d''architecture','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000049','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000049','8b000001-0000-4000-8000-000000000022','DataRef_DEL02_2','Code source','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000050','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000050','8b000001-0000-4000-8000-000000000022','DataRef_DEL02_3','Pull request','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000051','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000051','8b000001-0000-4000-8000-000000000023','DataRef_DEL03_1','Plan de tests','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000052','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000052','8b000001-0000-4000-8000-000000000023','DataRef_DEL03_2','Rapport de tests','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000053','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000053','8b000001-0000-4000-8000-000000000024','DataRef_DEL04_1','Cahier de recette','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000054','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000054','8b000001-0000-4000-8000-000000000024','DataRef_DEL04_2','PV de recette client','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000055','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000055','8b000001-0000-4000-8000-000000000025','DataRef_DEL05_1','Dossier de mise en production','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000056','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000056','8b000001-0000-4000-8000-000000000025','DataRef_DEL05_2','Notes de version','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000057','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000057','8b000001-0000-4000-8000-000000000026','DataRef_MNT00_1','Contrat de maintenance','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000058','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000058','8b000001-0000-4000-8000-000000000026','DataRef_MNT00_2','SLA','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000059','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000059','8b000001-0000-4000-8000-000000000026','DataRef_MNT00_3','Dossier de réversibilité','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000060','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000060','8b000001-0000-4000-8000-000000000027','DataRef_MNT01_1','Dossier de transfert','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000061','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000061','8b000001-0000-4000-8000-000000000027','DataRef_MNT01_2','Fiche de configuration','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000062','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000062','8b000001-0000-4000-8000-000000000028','DataRef_MNT02_1','Ticket client','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000063','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000063','8b000001-0000-4000-8000-000000000028','DataRef_MNT02_2','Historique des incidents','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000064','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000064','8b000001-0000-4000-8000-000000000029','DataRef_MNT03_1','Fiche anomalie','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000065','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000065','8b000001-0000-4000-8000-000000000029','DataRef_MNT03_2','Correctif','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000066','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000066','8b000001-0000-4000-8000-000000000029','DataRef_MNT03_3','Rapport de non-régression','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000067','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000067','8b000001-0000-4000-8000-000000000030','DataRef_MNT04_1','Demande d''évolution','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000068','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000068','8b000001-0000-4000-8000-000000000030','DataRef_MNT04_2','Devis','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000069','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000069','8b000001-0000-4000-8000-000000000030','DataRef_MNT04_3','Spécification','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000070','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000070','8b000001-0000-4000-8000-000000000031','DataRef_MNT05_1','Plan de déploiement','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000071','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000071','8b000001-0000-4000-8000-000000000031','DataRef_MNT05_2','PV de mise en production','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000072','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000072','8b000001-0000-4000-8000-000000000032','DataRef_MNT06_1','Rapport SLA','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000073','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000073','8b000001-0000-4000-8000-000000000032','DataRef_MNT06_2','Compte rendu de service','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000074','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000074','8b000001-0000-4000-8000-000000000033','DataRef_MNT07_1','Plan de réversibilité','DataObjectReference','reference-seed'),
('91000000-0000-4000-8000-000000000075','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000075','8b000001-0000-4000-8000-000000000033','DataRef_MNT07_2','PV de fin de service','DataObjectReference','reference-seed'),
('92000000-0000-4000-8000-000000000001','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000077','8b000001-0000-4000-8000-000000000001','DataStoreRef_GOV01_ERP','ERP et comptabilité','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000002','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000001','DataStoreRef_GOV01_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000003','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000077','8b000001-0000-4000-8000-000000000002','DataStoreRef_GOV02_ERP','ERP et comptabilité','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000004','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000002','DataStoreRef_GOV02_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000005','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000077','8b000001-0000-4000-8000-000000000003','DataStoreRef_GOV03_ERP','ERP et comptabilité','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000006','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000003','DataStoreRef_GOV03_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000007','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000077','8b000001-0000-4000-8000-000000000004','DataStoreRef_GOV04_ERP','ERP et comptabilité','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000008','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000004','DataStoreRef_GOV04_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000009','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000077','8b000001-0000-4000-8000-000000000013','DataStoreRef_FIN01_ERP','ERP et comptabilité','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000010','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000078','8b000001-0000-4000-8000-000000000013','DataStoreRef_FIN01_SIRH','SIRH et paie','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000011','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000013','DataStoreRef_FIN01_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000012','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000077','8b000001-0000-4000-8000-000000000014','DataStoreRef_FIN02_ERP','ERP et comptabilité','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000013','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000078','8b000001-0000-4000-8000-000000000014','DataStoreRef_FIN02_SIRH','SIRH et paie','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000014','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000014','DataStoreRef_FIN02_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000015','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000077','8b000001-0000-4000-8000-000000000015','DataStoreRef_FIN03_ERP','ERP et comptabilité','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000016','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000078','8b000001-0000-4000-8000-000000000015','DataStoreRef_FIN03_SIRH','SIRH et paie','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000017','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000015','DataStoreRef_FIN03_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000018','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000077','8b000001-0000-4000-8000-000000000016','DataStoreRef_FIN04_ERP','ERP et comptabilité','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000019','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000078','8b000001-0000-4000-8000-000000000016','DataStoreRef_FIN04_SIRH','SIRH et paie','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000020','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000016','DataStoreRef_FIN04_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000021','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000021','DataStoreRef_DEL01_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000022','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000021','DataStoreRef_DEL01_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000023','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000021','DataStoreRef_DEL01_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000024','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000022','DataStoreRef_DEL02_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000025','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000022','DataStoreRef_DEL02_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000026','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000022','DataStoreRef_DEL02_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000027','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000023','DataStoreRef_DEL03_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000028','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000023','DataStoreRef_DEL03_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000029','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000023','DataStoreRef_DEL03_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000030','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000024','DataStoreRef_DEL04_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000031','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000024','DataStoreRef_DEL04_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000032','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000024','DataStoreRef_DEL04_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000033','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000025','DataStoreRef_DEL05_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000034','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000025','DataStoreRef_DEL05_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000035','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000025','DataStoreRef_DEL05_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000036','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000076','8b000001-0000-4000-8000-000000000026','DataStoreRef_MNT00_ITSM','Application ITSM','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000037','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000026','DataStoreRef_MNT00_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000038','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000026','DataStoreRef_MNT00_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000039','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000082','8b000001-0000-4000-8000-000000000026','DataStoreRef_MNT00_MON','Supervision','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000040','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000026','DataStoreRef_MNT00_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000041','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000076','8b000001-0000-4000-8000-000000000027','DataStoreRef_MNT01_ITSM','Application ITSM','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000042','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000027','DataStoreRef_MNT01_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000043','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000027','DataStoreRef_MNT01_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000044','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000082','8b000001-0000-4000-8000-000000000027','DataStoreRef_MNT01_MON','Supervision','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000045','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000027','DataStoreRef_MNT01_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000046','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000076','8b000001-0000-4000-8000-000000000028','DataStoreRef_MNT02_ITSM','Application ITSM','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000047','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000028','DataStoreRef_MNT02_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000048','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000028','DataStoreRef_MNT02_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000049','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000082','8b000001-0000-4000-8000-000000000028','DataStoreRef_MNT02_MON','Supervision','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000050','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000028','DataStoreRef_MNT02_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000051','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000076','8b000001-0000-4000-8000-000000000029','DataStoreRef_MNT03_ITSM','Application ITSM','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000052','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000029','DataStoreRef_MNT03_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000053','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000029','DataStoreRef_MNT03_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000054','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000082','8b000001-0000-4000-8000-000000000029','DataStoreRef_MNT03_MON','Supervision','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000055','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000029','DataStoreRef_MNT03_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000056','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000076','8b000001-0000-4000-8000-000000000030','DataStoreRef_MNT04_ITSM','Application ITSM','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000057','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000030','DataStoreRef_MNT04_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000058','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000030','DataStoreRef_MNT04_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000059','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000082','8b000001-0000-4000-8000-000000000030','DataStoreRef_MNT04_MON','Supervision','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000060','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000030','DataStoreRef_MNT04_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000061','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000076','8b000001-0000-4000-8000-000000000031','DataStoreRef_MNT05_ITSM','Application ITSM','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000062','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000031','DataStoreRef_MNT05_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000063','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000031','DataStoreRef_MNT05_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000064','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000082','8b000001-0000-4000-8000-000000000031','DataStoreRef_MNT05_MON','Supervision','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000065','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000031','DataStoreRef_MNT05_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000066','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000076','8b000001-0000-4000-8000-000000000032','DataStoreRef_MNT06_ITSM','Application ITSM','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000067','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000032','DataStoreRef_MNT06_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000068','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000032','DataStoreRef_MNT06_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000069','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000082','8b000001-0000-4000-8000-000000000032','DataStoreRef_MNT06_MON','Supervision','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000070','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000032','DataStoreRef_MNT06_DOCS','Base documentaire','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000071','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000076','8b000001-0000-4000-8000-000000000033','DataStoreRef_MNT07_ITSM','Application ITSM','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000072','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000080','8b000001-0000-4000-8000-000000000033','DataStoreRef_MNT07_GIT','Dépôt Git','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000073','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000081','8b000001-0000-4000-8000-000000000033','DataStoreRef_MNT07_CICD','CI/CD','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000074','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000082','8b000001-0000-4000-8000-000000000033','DataStoreRef_MNT07_MON','Supervision','DataStoreReference','reference-seed'),
('92000000-0000-4000-8000-000000000075','8a000000-0000-4000-8000-000000000001','8d000000-0000-4000-8000-000000000083','8b000001-0000-4000-8000-000000000033','DataStoreRef_MNT07_DOCS','Base documentaire','DataStoreReference','reference-seed')
ON CONFLICT ("projectId","resourceId","elementId") DO NOTHING;

COMMIT;
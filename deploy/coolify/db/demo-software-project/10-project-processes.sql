-- Portable demo package: complete software project lifecycle.
-- Requires schema migrations through 20261110_v3_job_architecture.sql.
-- Run 00-job-functions.sql first, then this file. Safe to re-run; never deletes user data.
BEGIN;

INSERT INTO projects (id,"createdBy",name,description) VALUES
('a1000000-0000-4000-8000-000000000001','demo-software','Développement logiciel — Projet de démonstration','Projet complet illustrant le cycle de développement logiciel, les processus RH et les processus de soutien.')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description;

INSERT INTO project_members (id,"createdBy","projectId","userId",role) VALUES
('a1100000-0000-4000-8000-000000000001','demo-software','a1000000-0000-4000-8000-000000000001',:'demo_user','admin')
ON CONFLICT ("projectId","userId") DO NOTHING;

INSERT INTO resources (id,"createdBy",name,description,depth,"parentId","authToken",type) VALUES
('a2000000-0000-4000-8000-000000000001','demo-software','Projet démonstration — Cycle de vie logiciel','Projet de démonstration complet : cycle de développement, RH et processus de soutien.',0,NULL,NULL,'folder'),
('a2000000-0000-4000-8000-000000000002','demo-software','Cycle de développement logiciel','Processus de réalisation du logiciel de l''initialisation à l''exploitation.',1,'a2000000-0000-4000-8000-000000000001',NULL,'folder'),
('a2000000-0000-4000-8000-000000000003','demo-software','Ressources humaines','Processus RH avec parcours différenciés selon le contrat.',1,'a2000000-0000-4000-8000-000000000001',NULL,'folder'),
('a2000000-0000-4000-8000-000000000004','demo-software','Processus de soutien','Processus transverses de soutien au projet et à l''organisation.',1,'a2000000-0000-4000-8000-000000000001',NULL,'folder')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,depth=EXCLUDED.depth,"parentId"=EXCLUDED."parentId",type=EXCLUDED.type;

INSERT INTO resources (id,"createdBy",name,description,depth,"parentId","authToken",type) VALUES
('a3000000-0000-4000-8000-000000000001','demo-software','Cycle complet de développement logiciel','Vue de bout en bout du cycle projet, des opportunités à l''exploitation et à l''amélioration continue.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000002','demo-software','Gestion et gouvernance de projet','Initialisation, planification, pilotage, arbitrages, risques, changements et clôture.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000003','demo-software','Recueil et gestion des exigences','Besoins, analyse, spécification, priorisation, traçabilité et acceptation.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000004','demo-software','Architecture et conception technique','Architecture, choix techniques, interfaces, données, sécurité et revues de conception.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000005','demo-software','Conception UX/UI et accessibilité','Recherche utilisateur, parcours, prototypes, design system et validation ergonomique.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000006','demo-software','Développement logiciel et gestion des sprints','Préparation, réalisation, tests unitaires, intégration continue et revue d''incrément.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000007','demo-software','Revue de code et gestion de configuration','Branches, pull requests, revues, intégration, versionnement et traçabilité.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000008','demo-software','Intégration continue et construction logicielle','Build, tests automatisés, contrôles qualité/sécurité, packaging et publication d''artefacts.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000009','demo-software','Intégration des composants et systèmes','Assemblage, configuration, interfaces, environnements et qualification d''intégration.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000010','demo-software','Vérification, validation et acceptation','Stratégie IVV, tests système, non-régression, recette utilisateur, preuves et décision.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000011','demo-software','Assurance qualité et amélioration continue','Plan qualité, revues, audits, non-conformités, actions correctives et bilan qualité.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000012','demo-software','Sécurité applicative et protection des données','Analyse de risques, exigences, contrôles, tests, remédiation et homologation.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000013','demo-software','Préparation de livraison et mise en production','Go/no-go, préparation de version, déploiement, vérifications et retour arrière.',2,'a2000000-0000-4000-8000-000000000002',NULL,'process'),
('a3000000-0000-4000-8000-000000000014','demo-software','Exploitation, maintenance et gestion des incidents','Supervision, traitement des incidents, maintenance corrective/préventive et amélioration.',2,'a2000000-0000-4000-8000-000000000004',NULL,'process'),
('a3000000-0000-4000-8000-000000000015','demo-software','Gestion du support informatique interne','Demande utilisateur, qualification, priorisation, résolution, escalade et clôture.',2,'a2000000-0000-4000-8000-000000000004',NULL,'process'),
('a3000000-0000-4000-8000-000000000016','demo-software','Gestion de la documentation et des livrables','Création, validation, versionnement, diffusion, archivage et retrait documentaire.',2,'a2000000-0000-4000-8000-000000000004',NULL,'process'),
('a3000000-0000-4000-8000-000000000017','demo-software','Suivi des activités, charges et avancement','Collecte des activités, rapprochement planning, analyse des écarts et reporting.',2,'a2000000-0000-4000-8000-000000000004',NULL,'process'),
('a3000000-0000-4000-8000-000000000018','demo-software','Gestion des données et des référentiels','Définition, qualité, accès, sauvegarde, conservation et évolution des données.',2,'a2000000-0000-4000-8000-000000000004',NULL,'process'),
('a3000000-0000-4000-8000-000000000019','demo-software','RH — Recrutement','De la demande de recrutement à la sélection et à la proposition contractuelle, avec typologie de contrat.',2,'a2000000-0000-4000-8000-000000000003',NULL,'process'),
('a3000000-0000-4000-8000-000000000020','demo-software','RH — Onboarding et intégration','Préparation de l''arrivée, accueil, accès, sécurité, formation et suivi d''intégration selon le contrat.',2,'a2000000-0000-4000-8000-000000000003',NULL,'process'),
('a3000000-0000-4000-8000-000000000021','demo-software','RH — Évaluation périodique et développement','Préparation, entretien, bilan de compétences, objectifs et plan de développement adapté au contrat.',2,'a2000000-0000-4000-8000-000000000003',NULL,'process'),
('a3000000-0000-4000-8000-000000000022','demo-software','RH — Outboarding et fin de collaboration','Anticipation du départ, transfert, restitution des actifs, clôture des accès et obligations de fin.',2,'a2000000-0000-4000-8000-000000000003',NULL,'process')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,depth=EXCLUDED.depth,"parentId"=EXCLUDED."parentId",type=EXCLUDED.type;

INSERT INTO contents (id,"createdBy","resourceId",status,version,content,"pngContent","updatedBy") VALUES
('a4000000-0000-4000-8000-000000000001','demo-software','a3000000-0000-4000-8000-000000000001','published',1,$bpmn_1$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_CycleComplet" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_CycleComplet" name="Cycle complet de développement logiciel" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:callActivity id="Call_0" name="[CDP] Gouverner et piloter le projet" calledElement="Process_GestionProjet"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:callActivity>
<bpmn:callActivity id="Call_1" name="[POBA] Cadrer les besoins et exigences" calledElement="Process_Exigences"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:callActivity>
<bpmn:callActivity id="Call_2" name="[ARCH] Concevoir l&apos;architecture et la solution" calledElement="Process_Architecture"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:callActivity>
<bpmn:callActivity id="Call_3" name="[UX] Concevoir l&apos;expérience utilisateur" calledElement="Process_UX"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:callActivity>
<bpmn:callActivity id="Call_4" name="[TL] Réaliser les incréments logiciels" calledElement="Process_Developpement"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:callActivity>
<bpmn:callActivity id="Call_5" name="[QUAL] Assurer la qualité du projet" calledElement="Process_Qualite"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:callActivity>
<bpmn:callActivity id="Call_6" name="[SEC] Maîtriser la sécurité applicative" calledElement="Process_Securite"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:callActivity>
<bpmn:callActivity id="Call_7" name="[IVV] Intégrer, vérifier et valider" calledElement="Process_IVV"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:callActivity>
<bpmn:callActivity id="Call_8" name="[DEVOPS] Livrer et mettre en production" calledElement="Process_Release"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:callActivity>
<bpmn:callActivity id="Call_9" name="[SUPPORT] Exploiter, maintenir et supporter" calledElement="Process_Exploitation"><bpmn:incoming>Flow_9</bpmn:incoming><bpmn:outgoing>Flow_10</bpmn:outgoing></bpmn:callActivity>
<bpmn:callActivity id="Call_10" name="[DOC] Gérer la documentation du projet" calledElement="Process_Documentation"><bpmn:incoming>Flow_10</bpmn:incoming><bpmn:outgoing>Flow_11</bpmn:outgoing></bpmn:callActivity>
<bpmn:callActivity id="Call_11" name="[CDP] Suivre les activités et rendre compte" calledElement="Process_SuiviActivites"><bpmn:incoming>Flow_11</bpmn:incoming><bpmn:outgoing>Flow_12</bpmn:outgoing></bpmn:callActivity>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_12</bpmn:incoming></bpmn:endEvent>
        <bpmn:callActivity id="Call_12" name="[TL] Revoir le code et gérer la configuration" calledElement="Process_RevueCode"><bpmn:incoming>Flow_Call_12</bpmn:incoming><bpmn:outgoing>Flow_Call_12_next</bpmn:outgoing></bpmn:callActivity>
    <bpmn:callActivity id="Call_13" name="[DEVOPS] Construire et contrôler le pipeline CI/CD" calledElement="Process_CI"><bpmn:incoming>Flow_Call_13</bpmn:incoming><bpmn:outgoing>Flow_Call_13_next</bpmn:outgoing></bpmn:callActivity>
    <bpmn:callActivity id="Call_14" name="[SYS] Intégrer les composants et systèmes" calledElement="Process_Integration"><bpmn:incoming>Flow_Call_14</bpmn:incoming><bpmn:outgoing>Flow_Call_14_next</bpmn:outgoing></bpmn:callActivity>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Call_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Call_0" targetRef="Call_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Call_1" targetRef="Call_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Call_2" targetRef="Call_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Call_3" targetRef="Call_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Call_4" targetRef="Call_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Call_5" targetRef="Call_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Call_6" targetRef="Call_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Call_7" targetRef="Call_8"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Call_8" targetRef="Call_9"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_10" sourceRef="Call_9" targetRef="Call_10"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_11" sourceRef="Call_10" targetRef="Call_11"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_12" sourceRef="Call_11" targetRef="End"></bpmn:sequenceFlow>
      <bpmn:sequenceFlow id="Flow_Call_12" sourceRef="Call_12" targetRef="Call_13"/>
    <bpmn:sequenceFlow id="Flow_Call_13" sourceRef="Call_13" targetRef="Call_14"/>
    <bpmn:sequenceFlow id="Flow_Call_14" sourceRef="Call_14" targetRef="Call_5"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_CycleComplet"><bpmndi:BPMNPlane id="Plane_Process_CycleComplet" bpmnElement="Process_CycleComplet">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_0_di" bpmnElement="Call_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_1_di" bpmnElement="Call_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_2_di" bpmnElement="Call_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_3_di" bpmnElement="Call_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_4_di" bpmnElement="Call_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_5_di" bpmnElement="Call_5"><dc:Bounds x="1650" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_6_di" bpmnElement="Call_6"><dc:Bounds x="1840" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_7_di" bpmnElement="Call_7"><dc:Bounds x="2030" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_8_di" bpmnElement="Call_8"><dc:Bounds x="2220" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_9_di" bpmnElement="Call_9"><dc:Bounds x="2410" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_10_di" bpmnElement="Call_10"><dc:Bounds x="2600" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Call_11_di" bpmnElement="Call_11"><dc:Bounds x="2790" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="2980" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="91" y="198"/><di:waypoint x="111" y="198"/><di:waypoint x="111" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1345" y="220"/><di:waypoint x="1345" y="220"/><di:waypoint x="1650" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1800" y="220"/><di:waypoint x="1820" y="220"/><di:waypoint x="1820" y="220"/><di:waypoint x="1840" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1990" y="220"/><di:waypoint x="2010" y="220"/><di:waypoint x="2010" y="220"/><di:waypoint x="2030" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="2180" y="220"/><di:waypoint x="2200" y="220"/><di:waypoint x="2200" y="220"/><di:waypoint x="2220" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="2370" y="220"/><di:waypoint x="2390" y="220"/><di:waypoint x="2390" y="220"/><di:waypoint x="2410" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_10_di" bpmnElement="Flow_10"><di:waypoint x="2560" y="220"/><di:waypoint x="2580" y="220"/><di:waypoint x="2580" y="220"/><di:waypoint x="2600" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_11_di" bpmnElement="Flow_11"><di:waypoint x="2750" y="220"/><di:waypoint x="2770" y="220"/><di:waypoint x="2770" y="220"/><di:waypoint x="2790" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_12_di" bpmnElement="Flow_12"><di:waypoint x="2940" y="220"/><di:waypoint x="2960" y="220"/><di:waypoint x="2960" y="198"/><di:waypoint x="2980" y="198"/></bpmndi:BPMNEdge>
  <bpmndi:BPMNShape id="Call_12_di" bpmnElement="Call_12"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Call_13_di" bpmnElement="Call_13"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape id="Call_14_di" bpmnElement="Call_14"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_1$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000002','demo-software','a3000000-0000-4000-8000-000000000002','published',1,$bpmn_2$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_GestionProjet" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_GestionProjet" name="Gestion et gouvernance de projet" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[CDP] Formaliser la charte et les objectifs"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[CDP] Définir le périmètre, les livrables et critères de succès"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[CDP] Construire le planning, les jalons et le budget"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[CDP] Affecter les ressources et responsabilités"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[CDP] Identifier les risques et plans de réponse"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[DO] Valider les engagements et le lancement"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[CDP] Animer les revues de pilotage"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[DO] Arbitrer les écarts majeurs"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_8" name="[CDP] Prononcer la clôture et capitaliser"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_9</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="Task_8"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Task_8" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_GestionProjet"><bpmndi:BPMNPlane id="Plane_Process_GestionProjet" bpmnElement="Process_GestionProjet">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_8_di" bpmnElement="Task_8"><dc:Bounds x="1650" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1840" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1650" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1800" y="220"/><di:waypoint x="1820" y="220"/><di:waypoint x="1820" y="198"/><di:waypoint x="1840" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_2$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000003','demo-software','a3000000-0000-4000-8000-000000000003','published',1,$bpmn_3$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Exigences" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Exigences" name="Recueil et gestion des exigences" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[POBA] Identifier les parties prenantes et utilisateurs"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[POBA] Recueillir les besoins et contraintes"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[UX] Conduire les ateliers et parcours utilisateurs"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[POBA] Rédiger les exigences fonctionnelles et non fonctionnelles"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[ARCH] Vérifier la cohérence technique"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[SEC] Qualifier les exigences de sécurité et données"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[POBA] Définir les critères d&apos;acceptation"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[POBA] Prioriser et baseliner le backlog"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_8" name="[CDP] Faire valider le référentiel des exigences"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_9</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="Task_8"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Task_8" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Exigences"><bpmndi:BPMNPlane id="Plane_Process_Exigences" bpmnElement="Process_Exigences">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_8_di" bpmnElement="Task_8"><dc:Bounds x="1650" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1840" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1650" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1800" y="220"/><di:waypoint x="1820" y="220"/><di:waypoint x="1820" y="198"/><di:waypoint x="1840" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_3$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000004','demo-software','a3000000-0000-4000-8000-000000000004','published',1,$bpmn_4$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Architecture" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Architecture" name="Architecture et conception technique" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[ARCH] Analyser les contraintes et exigences"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[ARCH] Définir l&apos;architecture logique et physique"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[DATA] Concevoir les modèles et flux de données"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[SYS] Définir les interfaces et intégrations"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[SEC] Réaliser l&apos;analyse de risques de sécurité"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[DEVOPS] Définir les environnements et principes de déploiement"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[ARCH] Produire les dossiers de conception"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[QUAL] Organiser la revue de conception"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_8" name="[DT] Valider l&apos;architecture cible"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_9</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="Task_8"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Task_8" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Architecture"><bpmndi:BPMNPlane id="Plane_Process_Architecture" bpmnElement="Process_Architecture">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_8_di" bpmnElement="Task_8"><dc:Bounds x="1650" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1840" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1650" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1800" y="220"/><di:waypoint x="1820" y="220"/><di:waypoint x="1820" y="198"/><di:waypoint x="1840" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_4$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000005','demo-software','a3000000-0000-4000-8000-000000000005','published',1,$bpmn_5$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_UX" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_UX" name="Conception UX/UI et accessibilité" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[UX] Analyser les utilisateurs et contextes d&apos;usage"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[UX] Définir les parcours et scénarios"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[UX] Réaliser les wireframes et prototypes"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[POBA] Valider l&apos;adéquation aux besoins"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[UX] Décliner l&apos;interface et le design system"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[UX] Vérifier accessibilité et responsive"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[UX] Organiser les tests utilisateurs"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[POBA] Valider les maquettes et critères UX"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_8</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_UX"><bpmndi:BPMNPlane id="Plane_Process_UX" bpmnElement="Process_UX">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1650" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="198"/><di:waypoint x="1650" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_5$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000006','demo-software','a3000000-0000-4000-8000-000000000006','published',1,$bpmn_6$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Developpement" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Developpement" name="Développement logiciel et gestion des sprints" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[SM] Préparer et planifier le sprint"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[POBA] Clarifier les éléments du backlog"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[TL] Distribuer les travaux et définir les règles techniques"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[DEV] Développer les composants"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[DEV] Réaliser les tests unitaires"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[TL] Effectuer les revues de code"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[DEV] Corriger les anomalies détectées"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[SM] Animer la revue et rétrospective"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_8" name="[POBA] Accepter ou rejeter l&apos;incrément"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_9</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="Task_8"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Task_8" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Developpement"><bpmndi:BPMNPlane id="Plane_Process_Developpement" bpmnElement="Process_Developpement">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_8_di" bpmnElement="Task_8"><dc:Bounds x="1650" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1840" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1650" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1800" y="220"/><di:waypoint x="1820" y="220"/><di:waypoint x="1820" y="198"/><di:waypoint x="1840" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_6$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000007','demo-software','a3000000-0000-4000-8000-000000000007','published',1,$bpmn_7$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_RevueCode" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_RevueCode" name="Revue de code et gestion de configuration" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[DEV] Créer une branche et associer le ticket"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[DEV] Soumettre une pull request"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[TL] Contrôler la conformité aux règles de codage"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[SEC] Vérifier les points de sécurité"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[DEV] Traiter les commentaires de revue"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[TL] Approuver et fusionner le changement"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[DEVOPS] Tracer la version et les artefacts"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_7</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_RevueCode"><bpmndi:BPMNPlane id="Plane_Process_RevueCode" bpmnElement="Process_RevueCode">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1460" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="198"/><di:waypoint x="1460" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_7$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000008','demo-software','a3000000-0000-4000-8000-000000000008','published',1,$bpmn_8$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_CI" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_CI" name="Intégration continue et construction logicielle" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[DEV] Pousser le changement dans le dépôt"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[DEVOPS] Déclencher le pipeline CI"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[DEVOPS] Construire et compiler les composants"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[IVV] Exécuter les tests automatisés"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[QUAL] Contrôler couverture et qualité du code"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[SEC] Exécuter les analyses de vulnérabilités"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[DEVOPS] Publier les artefacts versionnés"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[TL] Analyser et traiter les échecs du pipeline"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_8</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_CI"><bpmndi:BPMNPlane id="Plane_Process_CI" bpmnElement="Process_CI">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1650" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="198"/><di:waypoint x="1650" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_8$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000009','demo-software','a3000000-0000-4000-8000-000000000009','published',1,$bpmn_9$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Integration" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Integration" name="Intégration des composants et systèmes" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[SYS] Préparer l&apos;environnement d&apos;intégration"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[DEV] Livrer les composants vérifiés"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[SYS] Assembler les composants et dépendances"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[DATA] Intégrer les schémas et migrations de données"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[SYS] Vérifier les interfaces et échanges"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[IVV] Exécuter les tests d&apos;intégration"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[SYS] Traiter les écarts d&apos;intégration"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[IVV] Prononcer l&apos;aptitude à la qualification"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_8</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Integration"><bpmndi:BPMNPlane id="Plane_Process_Integration" bpmnElement="Process_Integration">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1650" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="198"/><di:waypoint x="1650" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_9$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000010','demo-software','a3000000-0000-4000-8000-000000000010','published',1,$bpmn_10$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_IVV" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_IVV" name="Vérification, validation et acceptation" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[IVV] Établir le plan IVV et la matrice de traçabilité"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[IVV] Préparer les jeux de données et environnements"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[IVV] Exécuter les tests système et non-régression"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[SEC] Exécuter les tests de sécurité"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[QUAL] Vérifier la couverture des exigences"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[IVV] Enregistrer et qualifier les anomalies"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[DEV] Corriger les anomalies bloquantes"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[IVV] Rejouer les tests et consolider les preuves"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_8" name="[POBA] Organiser la recette métier"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_9" name="[DO] Prononcer l&apos;acceptation ou le refus"><bpmn:incoming>Flow_9</bpmn:incoming><bpmn:outgoing>Flow_10</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_10</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="Task_8"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Task_8" targetRef="Task_9"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_10" sourceRef="Task_9" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_IVV"><bpmndi:BPMNPlane id="Plane_Process_IVV" bpmnElement="Process_IVV">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_8_di" bpmnElement="Task_8"><dc:Bounds x="1650" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_9_di" bpmnElement="Task_9"><dc:Bounds x="1840" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="2030" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1650" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1800" y="220"/><di:waypoint x="1820" y="220"/><di:waypoint x="1820" y="220"/><di:waypoint x="1840" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_10_di" bpmnElement="Flow_10"><di:waypoint x="1990" y="220"/><di:waypoint x="2010" y="220"/><di:waypoint x="2010" y="198"/><di:waypoint x="2030" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_10$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000011','demo-software','a3000000-0000-4000-8000-000000000011','published',1,$bpmn_11$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Qualite" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Qualite" name="Assurance qualité et amélioration continue" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[QUAL] Établir le plan qualité projet"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[QUAL] Définir les revues et points de contrôle"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[QUAL] Vérifier l&apos;application des processus"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[QUAL] Réaliser les audits et revues indépendantes"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[QUAL] Enregistrer les non-conformités"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[CDP] Affecter les actions correctives"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[QUAL] Vérifier l&apos;efficacité des actions"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[DO] Valider le bilan qualité"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_8</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Qualite"><bpmndi:BPMNPlane id="Plane_Process_Qualite" bpmnElement="Process_Qualite">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1650" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="198"/><di:waypoint x="1650" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_11$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000012','demo-software','a3000000-0000-4000-8000-000000000012','published',1,$bpmn_12$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Securite" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Securite" name="Sécurité applicative et protection des données" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[SEC] Identifier les actifs et données sensibles"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[SEC] Analyser les menaces et risques"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[SEC] Définir les exigences et mesures de sécurité"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[ARCH] Intégrer les mesures dans l&apos;architecture"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[DEV] Appliquer les pratiques de développement sécurisé"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[SEC] Réaliser les scans et tests de sécurité"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[DEV] Corriger les vulnérabilités"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[SEC] Évaluer les risques résiduels et prononcer l&apos;avis"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_8</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Securite"><bpmndi:BPMNPlane id="Plane_Process_Securite" bpmnElement="Process_Securite">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1650" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="198"/><di:waypoint x="1650" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_12$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000013','demo-software','a3000000-0000-4000-8000-000000000013','published',1,$bpmn_13$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Release" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Release" name="Préparation de livraison et mise en production" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[CDP] Vérifier les critères de sortie et livrables"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[IVV] Confirmer la clôture des tests"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[QUAL] Émettre l&apos;avis qualité"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[SEC] Émettre l&apos;avis sécurité"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[DEVOPS] Préparer le paquet et les notes de version"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[DO] Décider le go/no-go"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[DEVOPS] Déployer en production"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[SYS] Vérifier le service après déploiement"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_8" name="[CDP] Prononcer la livraison au client"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_9</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="Task_8"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Task_8" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Release"><bpmndi:BPMNPlane id="Plane_Process_Release" bpmnElement="Process_Release">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_8_di" bpmnElement="Task_8"><dc:Bounds x="1650" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1840" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1650" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1800" y="220"/><di:waypoint x="1820" y="220"/><di:waypoint x="1820" y="198"/><di:waypoint x="1840" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_13$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000014','demo-software','a3000000-0000-4000-8000-000000000014','published',1,$bpmn_14$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Exploitation" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Exploitation" name="Exploitation, maintenance et gestion des incidents" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[DEVOPS] Surveiller disponibilité et performance"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[SUPPORT] Qualifier les alertes et incidents"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[SUPPORT] Évaluer l&apos;impact et prioriser"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[SYS] Rétablir le service ou appliquer un contournement"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[DEV] Analyser la cause racine si nécessaire"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[TL] Valider le correctif"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[DEVOPS] Déployer le correctif"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[SUPPORT] Informer les utilisateurs et clôturer"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_8" name="[QUAL] Capitaliser le retour d&apos;expérience"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_9</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="Task_8"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Task_8" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Exploitation"><bpmndi:BPMNPlane id="Plane_Process_Exploitation" bpmnElement="Process_Exploitation">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_8_di" bpmnElement="Task_8"><dc:Bounds x="1650" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1840" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1650" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1800" y="220"/><di:waypoint x="1820" y="220"/><di:waypoint x="1820" y="198"/><di:waypoint x="1840" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_14$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000015','demo-software','a3000000-0000-4000-8000-000000000015','published',1,$bpmn_15$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_SupportIT" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_SupportIT" name="Gestion du support informatique interne" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[COLLAB] Déclarer une demande ou un incident"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[HELPDESK] Enregistrer et qualifier le ticket"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[HELPDESK] Prioriser selon impact et urgence"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[SYS] Résoudre au niveau 1 ou 2"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[DT] Arbitrer une escalade technique"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[HELPDESK] Informer le demandeur"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[COLLAB] Confirmer la résolution"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[HELPDESK] Clôturer et alimenter la base de connaissance"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_8</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_SupportIT"><bpmndi:BPMNPlane id="Plane_Process_SupportIT" bpmnElement="Process_SupportIT">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1650" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="198"/><di:waypoint x="1650" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_15$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000016','demo-software','a3000000-0000-4000-8000-000000000016','published',1,$bpmn_16$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Documentation" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Documentation" name="Gestion de la documentation et des livrables" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[DOC] Identifier les documents et propriétaires"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[CDP] Définir les règles de gestion documentaire"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[DOC] Créer ou mettre à jour le document"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[QUAL] Vérifier le fond et la conformité"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[DT] Valider le document technique"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[DOC] Publier la version approuvée"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[DOC] Diffuser aux destinataires autorisés"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[DOC] Archiver les versions remplacées"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_8</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Documentation"><bpmndi:BPMNPlane id="Plane_Process_Documentation" bpmnElement="Process_Documentation">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1650" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="198"/><di:waypoint x="1650" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_16$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000017','demo-software','a3000000-0000-4000-8000-000000000017','published',1,$bpmn_17$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_SuiviActivites" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_SuiviActivites" name="Suivi des activités, charges et avancement" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[COLLAB] Déclarer les activités réalisées et le temps passé"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[CDP] Contrôler la cohérence des déclarations"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[CDP] Mettre à jour avancement et reste à faire"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[CDP] Comparer réalisé, prévu et capacité"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[SM] Identifier les blocages et dépendances"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[CDP] Proposer les actions de rattrapage"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[DO] Arbitrer les écarts significatifs"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[CDP] Diffuser le tableau de bord"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_8</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_SuiviActivites"><bpmndi:BPMNPlane id="Plane_Process_SuiviActivites" bpmnElement="Process_SuiviActivites">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1650" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="198"/><di:waypoint x="1650" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_17$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000018','demo-software','a3000000-0000-4000-8000-000000000018','published',1,$bpmn_18$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_GestionDonnees" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_GestionDonnees" name="Gestion des données et des référentiels" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Task_0" name="[DATA] Identifier les jeux et référentiels de données"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_1" name="[POBA] Définir les règles métier et qualité"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_2" name="[SEC] Définir classification et habilitations"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_3" name="[DATA] Mettre en œuvre modèles et contrôles"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_4" name="[SYS] Organiser sauvegardes et restauration"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_5" name="[DATA] Contrôler qualité et intégrité"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_6" name="[SEC] Vérifier conservation et purge"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Task_7" name="[DATA] Tracer les évolutions du référentiel"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_8</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Task_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_0" targetRef="Task_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="Task_7"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Task_7" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_GestionDonnees"><bpmndi:BPMNPlane id="Plane_Process_GestionDonnees" bpmnElement="Process_GestionDonnees">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_0_di" bpmnElement="Task_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="1080" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="1270" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_7_di" bpmnElement="Task_7"><dc:Bounds x="1460" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1650" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="NaN"/><di:waypoint x="NaN" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1080" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1250" y="220"/><di:waypoint x="1270" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1440" y="220"/><di:waypoint x="1460" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1610" y="220"/><di:waypoint x="1630" y="220"/><di:waypoint x="1630" y="198"/><di:waypoint x="1650" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_18$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000019','demo-software','a3000000-0000-4000-8000-000000000019','published',1,$bpmn_19$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Recrutement" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Recrutement" name="RH — Recrutement" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Before_0" name="[MANAGER] Formaliser le besoin et la fiche de fonction"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Before_1" name="[DO] Valider le budget et l&apos;ouverture du poste"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Before_2" name="[HR] Publier l&apos;offre et organiser les candidatures"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Before_3" name="[MANAGER] Évaluer les candidatures et conduire les entretiens"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Before_4" name="[HR] Vérifier les références et préparer la proposition"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:exclusiveGateway id="Gateway_Split" name="Type de contrat ?" gatewayDirection="Diverging" default="Flow_15"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing><bpmn:outgoing>Flow_9</bpmn:outgoing><bpmn:outgoing>Flow_12</bpmn:outgoing><bpmn:outgoing>Flow_15</bpmn:outgoing></bpmn:exclusiveGateway>
<bpmn:exclusiveGateway id="Gateway_Join" name="Poursuivre le parcours" gatewayDirection="Converging"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:incoming>Flow_11</bpmn:incoming><bpmn:incoming>Flow_14</bpmn:incoming><bpmn:incoming>Flow_17</bpmn:incoming><bpmn:outgoing>Flow_18</bpmn:outgoing></bpmn:exclusiveGateway>
<bpmn:userTask id="Branch_0_0" name="[HR] Préparer la proposition de CDI et les clauses applicables"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_0_1" name="[HR] Constituer le dossier d&apos;embauche CDI"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_1_0" name="[HR] Justifier le motif et le terme du CDD"><bpmn:incoming>Flow_9</bpmn:incoming><bpmn:outgoing>Flow_10</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_1_1" name="[HR] Préparer le contrat et les échéances de renouvellement"><bpmn:incoming>Flow_10</bpmn:incoming><bpmn:outgoing>Flow_11</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_2_0" name="[HR] Valider la convention, les dates et le sujet de stage"><bpmn:incoming>Flow_12</bpmn:incoming><bpmn:outgoing>Flow_13</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_2_1" name="[TUTOR] Désigner le tuteur et les objectifs pédagogiques"><bpmn:incoming>Flow_13</bpmn:incoming><bpmn:outgoing>Flow_14</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_3_0" name="[HR] Valider le rythme et le contrat d&apos;alternance"><bpmn:incoming>Flow_15</bpmn:incoming><bpmn:outgoing>Flow_16</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_3_1" name="[TUTOR] Désigner le maître d&apos;apprentissage et le parcours école"><bpmn:incoming>Flow_16</bpmn:incoming><bpmn:outgoing>Flow_17</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="After_0" name="[HR] Faire signer les documents et enregistrer l&apos;embauche"><bpmn:incoming>Flow_18</bpmn:incoming><bpmn:outgoing>Flow_19</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="After_1" name="[HR] Transmettre le dossier au processus d&apos;onboarding"><bpmn:incoming>Flow_19</bpmn:incoming><bpmn:outgoing>Flow_20</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_20</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Before_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Before_0" targetRef="Before_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Before_1" targetRef="Before_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Before_2" targetRef="Before_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Before_3" targetRef="Before_4"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Before_4" targetRef="Gateway_Split"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Gateway_Split" targetRef="Branch_0_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;CDI&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Branch_0_0" targetRef="Branch_0_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Branch_0_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Gateway_Split" targetRef="Branch_1_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;CDD&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_10" sourceRef="Branch_1_0" targetRef="Branch_1_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_11" sourceRef="Branch_1_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_12" sourceRef="Gateway_Split" targetRef="Branch_2_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;STAGE&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_13" sourceRef="Branch_2_0" targetRef="Branch_2_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_14" sourceRef="Branch_2_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_15" sourceRef="Gateway_Split" targetRef="Branch_3_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;ALTERNANCE&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_16" sourceRef="Branch_3_0" targetRef="Branch_3_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_17" sourceRef="Branch_3_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_18" sourceRef="Gateway_Join" targetRef="After_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_19" sourceRef="After_0" targetRef="After_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_20" sourceRef="After_1" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Recrutement"><bpmndi:BPMNPlane id="Plane_Process_Recrutement" bpmnElement="Process_Recrutement">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_0_di" bpmnElement="Before_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_1_di" bpmnElement="Before_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_2_di" bpmnElement="Before_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_3_di" bpmnElement="Before_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_4_di" bpmnElement="Before_4"><dc:Bounds x="890" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Gateway_Split_di" bpmnElement="Gateway_Split"><dc:Bounds x="1080" y="180" width="50" height="50"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Gateway_Join_di" bpmnElement="Gateway_Join"><dc:Bounds x="1630" y="180" width="50" height="50"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_0_0_di" bpmnElement="Branch_0_0"><dc:Bounds x="1270" y="35" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_0_1_di" bpmnElement="Branch_0_1"><dc:Bounds x="1445" y="35" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_1_0_di" bpmnElement="Branch_1_0"><dc:Bounds x="1270" y="150" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_1_1_di" bpmnElement="Branch_1_1"><dc:Bounds x="1445" y="150" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_2_0_di" bpmnElement="Branch_2_0"><dc:Bounds x="1270" y="265" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_2_1_di" bpmnElement="Branch_2_1"><dc:Bounds x="1445" y="265" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_3_0_di" bpmnElement="Branch_3_0"><dc:Bounds x="1270" y="380" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_3_1_di" bpmnElement="Branch_3_1"><dc:Bounds x="1445" y="380" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="After_0_di" bpmnElement="After_0"><dc:Bounds x="1760" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="After_1_di" bpmnElement="After_1"><dc:Bounds x="1950" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="2140" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="91" y="198"/><di:waypoint x="111" y="198"/><di:waypoint x="111" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="890" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="220"/><di:waypoint x="1060" y="220"/><di:waypoint x="1060" y="205"/><di:waypoint x="1080" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1130" y="205"/><di:waypoint x="1200" y="205"/><di:waypoint x="1200" y="75"/><di:waypoint x="1270" y="75"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1420" y="75"/><di:waypoint x="1433" y="75"/><di:waypoint x="1433" y="75"/><di:waypoint x="1445" y="75"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1595" y="75"/><di:waypoint x="1613" y="75"/><di:waypoint x="1613" y="205"/><di:waypoint x="1630" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1130" y="205"/><di:waypoint x="1200" y="205"/><di:waypoint x="1200" y="190"/><di:waypoint x="1270" y="190"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_10_di" bpmnElement="Flow_10"><di:waypoint x="1420" y="190"/><di:waypoint x="1433" y="190"/><di:waypoint x="1433" y="190"/><di:waypoint x="1445" y="190"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_11_di" bpmnElement="Flow_11"><di:waypoint x="1595" y="190"/><di:waypoint x="1613" y="190"/><di:waypoint x="1613" y="205"/><di:waypoint x="1630" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_12_di" bpmnElement="Flow_12"><di:waypoint x="1130" y="205"/><di:waypoint x="1200" y="205"/><di:waypoint x="1200" y="305"/><di:waypoint x="1270" y="305"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_13_di" bpmnElement="Flow_13"><di:waypoint x="1420" y="305"/><di:waypoint x="1433" y="305"/><di:waypoint x="1433" y="305"/><di:waypoint x="1445" y="305"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_14_di" bpmnElement="Flow_14"><di:waypoint x="1595" y="305"/><di:waypoint x="1613" y="305"/><di:waypoint x="1613" y="205"/><di:waypoint x="1630" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_15_di" bpmnElement="Flow_15"><di:waypoint x="1130" y="205"/><di:waypoint x="1200" y="205"/><di:waypoint x="1200" y="420"/><di:waypoint x="1270" y="420"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_16_di" bpmnElement="Flow_16"><di:waypoint x="1420" y="420"/><di:waypoint x="1433" y="420"/><di:waypoint x="1433" y="420"/><di:waypoint x="1445" y="420"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_17_di" bpmnElement="Flow_17"><di:waypoint x="1595" y="420"/><di:waypoint x="1613" y="420"/><di:waypoint x="1613" y="205"/><di:waypoint x="1630" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_18_di" bpmnElement="Flow_18"><di:waypoint x="1680" y="205"/><di:waypoint x="1720" y="205"/><di:waypoint x="1720" y="220"/><di:waypoint x="1760" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_19_di" bpmnElement="Flow_19"><di:waypoint x="1910" y="220"/><di:waypoint x="1930" y="220"/><di:waypoint x="1930" y="220"/><di:waypoint x="1950" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_20_di" bpmnElement="Flow_20"><di:waypoint x="2100" y="220"/><di:waypoint x="2120" y="220"/><di:waypoint x="2120" y="198"/><di:waypoint x="2140" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_19$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000020','demo-software','a3000000-0000-4000-8000-000000000020','published',1,$bpmn_20$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Onboarding" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Onboarding" name="RH — Onboarding et intégration" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Before_0" name="[HR] Confirmer la date d&apos;arrivée et le dossier administratif"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Before_1" name="[MANAGER] Préparer le poste, les missions et le parcours d&apos;accueil"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Before_2" name="[HELPDESK] Créer les comptes, habilitations et équipements"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Before_3" name="[HR] Organiser l&apos;accueil et les informations obligatoires"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing></bpmn:userTask>
<bpmn:exclusiveGateway id="Gateway_Split" name="Type de contrat ?" gatewayDirection="Diverging" default="Flow_14"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing><bpmn:outgoing>Flow_8</bpmn:outgoing><bpmn:outgoing>Flow_11</bpmn:outgoing><bpmn:outgoing>Flow_14</bpmn:outgoing></bpmn:exclusiveGateway>
<bpmn:exclusiveGateway id="Gateway_Join" name="Poursuivre le parcours" gatewayDirection="Converging"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:incoming>Flow_10</bpmn:incoming><bpmn:incoming>Flow_13</bpmn:incoming><bpmn:incoming>Flow_16</bpmn:incoming><bpmn:outgoing>Flow_17</bpmn:outgoing></bpmn:exclusiveGateway>
<bpmn:userTask id="Branch_0_0" name="[MANAGER] Définir les objectifs de prise de poste à 30/60/90 jours"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_0_1" name="[HR] Planifier le suivi de période d&apos;essai"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:outgoing>Flow_7</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_1_0" name="[MANAGER] Définir les objectifs liés à la durée du CDD"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_1_1" name="[HR] Planifier les points avant échéance et renouvellement éventuel"><bpmn:incoming>Flow_9</bpmn:incoming><bpmn:outgoing>Flow_10</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_2_0" name="[TUTOR] Présenter le sujet, les livrables et le cadre pédagogique"><bpmn:incoming>Flow_11</bpmn:incoming><bpmn:outgoing>Flow_12</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_2_1" name="[SCHOOL] Confirmer les modalités de suivi avec l&apos;établissement"><bpmn:incoming>Flow_12</bpmn:incoming><bpmn:outgoing>Flow_13</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_3_0" name="[TUTOR] Construire le parcours de progression en entreprise"><bpmn:incoming>Flow_14</bpmn:incoming><bpmn:outgoing>Flow_15</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_3_1" name="[SCHOOL] Synchroniser calendrier, compétences et évaluations école"><bpmn:incoming>Flow_15</bpmn:incoming><bpmn:outgoing>Flow_16</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="After_0" name="[COLLAB] Prendre connaissance des règles et outils"><bpmn:incoming>Flow_17</bpmn:incoming><bpmn:outgoing>Flow_18</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="After_1" name="[MANAGER] Réaliser le point de démarrage et confirmer l&apos;intégration"><bpmn:incoming>Flow_18</bpmn:incoming><bpmn:outgoing>Flow_19</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_19</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Before_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Before_0" targetRef="Before_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Before_1" targetRef="Before_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Before_2" targetRef="Before_3"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Before_3" targetRef="Gateway_Split"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Gateway_Split" targetRef="Branch_0_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;CDI&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Branch_0_0" targetRef="Branch_0_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Branch_0_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Gateway_Split" targetRef="Branch_1_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;CDD&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Branch_1_0" targetRef="Branch_1_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_10" sourceRef="Branch_1_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_11" sourceRef="Gateway_Split" targetRef="Branch_2_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;STAGE&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_12" sourceRef="Branch_2_0" targetRef="Branch_2_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_13" sourceRef="Branch_2_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_14" sourceRef="Gateway_Split" targetRef="Branch_3_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;ALTERNANCE&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_15" sourceRef="Branch_3_0" targetRef="Branch_3_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_16" sourceRef="Branch_3_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_17" sourceRef="Gateway_Join" targetRef="After_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_18" sourceRef="After_0" targetRef="After_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_19" sourceRef="After_1" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Onboarding"><bpmndi:BPMNPlane id="Plane_Process_Onboarding" bpmnElement="Process_Onboarding">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_0_di" bpmnElement="Before_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_1_di" bpmnElement="Before_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_2_di" bpmnElement="Before_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_3_di" bpmnElement="Before_3"><dc:Bounds x="700" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Gateway_Split_di" bpmnElement="Gateway_Split"><dc:Bounds x="890" y="180" width="50" height="50"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Gateway_Join_di" bpmnElement="Gateway_Join"><dc:Bounds x="1440" y="180" width="50" height="50"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_0_0_di" bpmnElement="Branch_0_0"><dc:Bounds x="1080" y="35" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_0_1_di" bpmnElement="Branch_0_1"><dc:Bounds x="1255" y="35" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_1_0_di" bpmnElement="Branch_1_0"><dc:Bounds x="1080" y="150" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_1_1_di" bpmnElement="Branch_1_1"><dc:Bounds x="1255" y="150" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_2_0_di" bpmnElement="Branch_2_0"><dc:Bounds x="1080" y="265" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_2_1_di" bpmnElement="Branch_2_1"><dc:Bounds x="1255" y="265" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_3_0_di" bpmnElement="Branch_3_0"><dc:Bounds x="1080" y="380" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_3_1_di" bpmnElement="Branch_3_1"><dc:Bounds x="1255" y="380" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="After_0_di" bpmnElement="After_0"><dc:Bounds x="1570" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="After_1_di" bpmnElement="After_1"><dc:Bounds x="1760" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1950" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="91" y="198"/><di:waypoint x="111" y="198"/><di:waypoint x="111" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="700" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="850" y="220"/><di:waypoint x="870" y="220"/><di:waypoint x="870" y="205"/><di:waypoint x="890" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="940" y="205"/><di:waypoint x="1010" y="205"/><di:waypoint x="1010" y="75"/><di:waypoint x="1080" y="75"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1230" y="75"/><di:waypoint x="1243" y="75"/><di:waypoint x="1243" y="75"/><di:waypoint x="1255" y="75"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1405" y="75"/><di:waypoint x="1423" y="75"/><di:waypoint x="1423" y="205"/><di:waypoint x="1440" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="940" y="205"/><di:waypoint x="1010" y="205"/><di:waypoint x="1010" y="190"/><di:waypoint x="1080" y="190"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1230" y="190"/><di:waypoint x="1243" y="190"/><di:waypoint x="1243" y="190"/><di:waypoint x="1255" y="190"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_10_di" bpmnElement="Flow_10"><di:waypoint x="1405" y="190"/><di:waypoint x="1423" y="190"/><di:waypoint x="1423" y="205"/><di:waypoint x="1440" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_11_di" bpmnElement="Flow_11"><di:waypoint x="940" y="205"/><di:waypoint x="1010" y="205"/><di:waypoint x="1010" y="305"/><di:waypoint x="1080" y="305"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_12_di" bpmnElement="Flow_12"><di:waypoint x="1230" y="305"/><di:waypoint x="1243" y="305"/><di:waypoint x="1243" y="305"/><di:waypoint x="1255" y="305"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_13_di" bpmnElement="Flow_13"><di:waypoint x="1405" y="305"/><di:waypoint x="1423" y="305"/><di:waypoint x="1423" y="205"/><di:waypoint x="1440" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_14_di" bpmnElement="Flow_14"><di:waypoint x="940" y="205"/><di:waypoint x="1010" y="205"/><di:waypoint x="1010" y="420"/><di:waypoint x="1080" y="420"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_15_di" bpmnElement="Flow_15"><di:waypoint x="1230" y="420"/><di:waypoint x="1243" y="420"/><di:waypoint x="1243" y="420"/><di:waypoint x="1255" y="420"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_16_di" bpmnElement="Flow_16"><di:waypoint x="1405" y="420"/><di:waypoint x="1423" y="420"/><di:waypoint x="1423" y="205"/><di:waypoint x="1440" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_17_di" bpmnElement="Flow_17"><di:waypoint x="1490" y="205"/><di:waypoint x="1530" y="205"/><di:waypoint x="1530" y="220"/><di:waypoint x="1570" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_18_di" bpmnElement="Flow_18"><di:waypoint x="1720" y="220"/><di:waypoint x="1740" y="220"/><di:waypoint x="1740" y="220"/><di:waypoint x="1760" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_19_di" bpmnElement="Flow_19"><di:waypoint x="1910" y="220"/><di:waypoint x="1930" y="220"/><di:waypoint x="1930" y="198"/><di:waypoint x="1950" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_20$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000021','demo-software','a3000000-0000-4000-8000-000000000021','published',1,$bpmn_21$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_EvaluationPeriodique" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_EvaluationPeriodique" name="RH — Évaluation périodique et développement" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Before_0" name="[HR] Déclencher la campagne et communiquer le calendrier"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Before_1" name="[COLLAB] Préparer le bilan et l&apos;autoévaluation"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Before_2" name="[MANAGER] Collecter les faits et préparer l&apos;entretien"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:exclusiveGateway id="Gateway_Split" name="Type de contrat ?" gatewayDirection="Diverging" default="Flow_13"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing><bpmn:outgoing>Flow_7</bpmn:outgoing><bpmn:outgoing>Flow_10</bpmn:outgoing><bpmn:outgoing>Flow_13</bpmn:outgoing></bpmn:exclusiveGateway>
<bpmn:exclusiveGateway id="Gateway_Join" name="Poursuivre le parcours" gatewayDirection="Converging"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:incoming>Flow_9</bpmn:incoming><bpmn:incoming>Flow_12</bpmn:incoming><bpmn:incoming>Flow_15</bpmn:incoming><bpmn:outgoing>Flow_16</bpmn:outgoing></bpmn:exclusiveGateway>
<bpmn:userTask id="Branch_0_0" name="[MANAGER] Réaliser l&apos;entretien annuel et revoir les objectifs"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_0_1" name="[HR] Examiner évolution, mobilité et formation"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_1_0" name="[MANAGER] Réaliser le point périodique et préparer la fin de contrat"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_1_1" name="[HR] Évaluer les perspectives de renouvellement ou de sortie"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_2_0" name="[TUTOR] Réaliser le bilan intermédiaire et final du stage"><bpmn:incoming>Flow_10</bpmn:incoming><bpmn:outgoing>Flow_11</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_2_1" name="[SCHOOL] Recueillir l&apos;évaluation pédagogique de l&apos;établissement"><bpmn:incoming>Flow_11</bpmn:incoming><bpmn:outgoing>Flow_12</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_3_0" name="[TUTOR] Évaluer les compétences acquises en entreprise"><bpmn:incoming>Flow_13</bpmn:incoming><bpmn:outgoing>Flow_14</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_3_1" name="[SCHOOL] Réaliser le bilan tripartite entreprise-école-alternant"><bpmn:incoming>Flow_14</bpmn:incoming><bpmn:outgoing>Flow_15</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="After_0" name="[MANAGER] Formaliser les résultats et objectifs de progrès"><bpmn:incoming>Flow_16</bpmn:incoming><bpmn:outgoing>Flow_17</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="After_1" name="[HR] Mettre à jour les compétences et le plan de formation"><bpmn:incoming>Flow_17</bpmn:incoming><bpmn:outgoing>Flow_18</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_18</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Before_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Before_0" targetRef="Before_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Before_1" targetRef="Before_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Before_2" targetRef="Gateway_Split"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_Split" targetRef="Branch_0_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;CDI&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Branch_0_0" targetRef="Branch_0_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Branch_0_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Gateway_Split" targetRef="Branch_1_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;CDD&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Branch_1_0" targetRef="Branch_1_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Branch_1_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_10" sourceRef="Gateway_Split" targetRef="Branch_2_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;STAGE&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_11" sourceRef="Branch_2_0" targetRef="Branch_2_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_12" sourceRef="Branch_2_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_13" sourceRef="Gateway_Split" targetRef="Branch_3_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;ALTERNANCE&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_14" sourceRef="Branch_3_0" targetRef="Branch_3_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_15" sourceRef="Branch_3_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_16" sourceRef="Gateway_Join" targetRef="After_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_17" sourceRef="After_0" targetRef="After_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_18" sourceRef="After_1" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_EvaluationPeriodique"><bpmndi:BPMNPlane id="Plane_Process_EvaluationPeriodique" bpmnElement="Process_EvaluationPeriodique">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_0_di" bpmnElement="Before_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_1_di" bpmnElement="Before_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_2_di" bpmnElement="Before_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Gateway_Split_di" bpmnElement="Gateway_Split"><dc:Bounds x="700" y="180" width="50" height="50"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Gateway_Join_di" bpmnElement="Gateway_Join"><dc:Bounds x="1250" y="180" width="50" height="50"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_0_0_di" bpmnElement="Branch_0_0"><dc:Bounds x="890" y="35" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_0_1_di" bpmnElement="Branch_0_1"><dc:Bounds x="1065" y="35" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_1_0_di" bpmnElement="Branch_1_0"><dc:Bounds x="890" y="150" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_1_1_di" bpmnElement="Branch_1_1"><dc:Bounds x="1065" y="150" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_2_0_di" bpmnElement="Branch_2_0"><dc:Bounds x="890" y="265" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_2_1_di" bpmnElement="Branch_2_1"><dc:Bounds x="1065" y="265" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_3_0_di" bpmnElement="Branch_3_0"><dc:Bounds x="890" y="380" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_3_1_di" bpmnElement="Branch_3_1"><dc:Bounds x="1065" y="380" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="After_0_di" bpmnElement="After_0"><dc:Bounds x="1380" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="After_1_di" bpmnElement="After_1"><dc:Bounds x="1570" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1760" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="91" y="198"/><di:waypoint x="111" y="198"/><di:waypoint x="111" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="205"/><di:waypoint x="700" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="750" y="205"/><di:waypoint x="820" y="205"/><di:waypoint x="820" y="75"/><di:waypoint x="890" y="75"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="75"/><di:waypoint x="1053" y="75"/><di:waypoint x="1053" y="75"/><di:waypoint x="1065" y="75"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1215" y="75"/><di:waypoint x="1233" y="75"/><di:waypoint x="1233" y="205"/><di:waypoint x="1250" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="750" y="205"/><di:waypoint x="820" y="205"/><di:waypoint x="820" y="190"/><di:waypoint x="890" y="190"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1040" y="190"/><di:waypoint x="1053" y="190"/><di:waypoint x="1053" y="190"/><di:waypoint x="1065" y="190"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1215" y="190"/><di:waypoint x="1233" y="190"/><di:waypoint x="1233" y="205"/><di:waypoint x="1250" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_10_di" bpmnElement="Flow_10"><di:waypoint x="750" y="205"/><di:waypoint x="820" y="205"/><di:waypoint x="820" y="305"/><di:waypoint x="890" y="305"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_11_di" bpmnElement="Flow_11"><di:waypoint x="1040" y="305"/><di:waypoint x="1053" y="305"/><di:waypoint x="1053" y="305"/><di:waypoint x="1065" y="305"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_12_di" bpmnElement="Flow_12"><di:waypoint x="1215" y="305"/><di:waypoint x="1233" y="305"/><di:waypoint x="1233" y="205"/><di:waypoint x="1250" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_13_di" bpmnElement="Flow_13"><di:waypoint x="750" y="205"/><di:waypoint x="820" y="205"/><di:waypoint x="820" y="420"/><di:waypoint x="890" y="420"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_14_di" bpmnElement="Flow_14"><di:waypoint x="1040" y="420"/><di:waypoint x="1053" y="420"/><di:waypoint x="1053" y="420"/><di:waypoint x="1065" y="420"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_15_di" bpmnElement="Flow_15"><di:waypoint x="1215" y="420"/><di:waypoint x="1233" y="420"/><di:waypoint x="1233" y="205"/><di:waypoint x="1250" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_16_di" bpmnElement="Flow_16"><di:waypoint x="1300" y="205"/><di:waypoint x="1340" y="205"/><di:waypoint x="1340" y="220"/><di:waypoint x="1380" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_17_di" bpmnElement="Flow_17"><di:waypoint x="1530" y="220"/><di:waypoint x="1550" y="220"/><di:waypoint x="1550" y="220"/><di:waypoint x="1570" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_18_di" bpmnElement="Flow_18"><di:waypoint x="1720" y="220"/><di:waypoint x="1740" y="220"/><di:waypoint x="1740" y="198"/><di:waypoint x="1760" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_21$,NULL,'demo-software'),
('a4000000-0000-4000-8000-000000000022','demo-software','a3000000-0000-4000-8000-000000000022','published',1,$bpmn_22$<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Process_Offboarding" targetNamespace="https://khi-flows.example/software-project-demo" exporter="KHI Flows" exporterVersion="0.8-demo">
  <bpmn:process id="Process_Offboarding" name="RH — Outboarding et fin de collaboration" isExecutable="false">
    <bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:startEvent id="Start" name="Déclencheur"><bpmn:outgoing>Flow_0</bpmn:outgoing></bpmn:startEvent>
<bpmn:userTask id="Before_0" name="[HR] Déclencher le départ et vérifier les dates/obligations"><bpmn:incoming>Flow_0</bpmn:incoming><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Before_1" name="[MANAGER] Organiser la passation et le transfert de connaissances"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Before_2" name="[DOC] Mettre à jour les dossiers et documents de référence"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:userTask>
<bpmn:exclusiveGateway id="Gateway_Split" name="Type de contrat ?" gatewayDirection="Diverging" default="Flow_13"><bpmn:incoming>Flow_3</bpmn:incoming><bpmn:outgoing>Flow_4</bpmn:outgoing><bpmn:outgoing>Flow_7</bpmn:outgoing><bpmn:outgoing>Flow_10</bpmn:outgoing><bpmn:outgoing>Flow_13</bpmn:outgoing></bpmn:exclusiveGateway>
<bpmn:exclusiveGateway id="Gateway_Join" name="Poursuivre le parcours" gatewayDirection="Converging"><bpmn:incoming>Flow_6</bpmn:incoming><bpmn:incoming>Flow_9</bpmn:incoming><bpmn:incoming>Flow_12</bpmn:incoming><bpmn:incoming>Flow_15</bpmn:incoming><bpmn:outgoing>Flow_16</bpmn:outgoing></bpmn:exclusiveGateway>
<bpmn:userTask id="Branch_0_0" name="[HR] Traiter la procédure de départ et les documents de fin de contrat"><bpmn:incoming>Flow_4</bpmn:incoming><bpmn:outgoing>Flow_5</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_0_1" name="[HR] Planifier les obligations et échéances de sortie"><bpmn:incoming>Flow_5</bpmn:incoming><bpmn:outgoing>Flow_6</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_1_0" name="[HR] Vérifier le terme, renouvellement ou fin anticipée"><bpmn:incoming>Flow_7</bpmn:incoming><bpmn:outgoing>Flow_8</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_1_1" name="[HR] Préparer les documents de fin de CDD"><bpmn:incoming>Flow_8</bpmn:incoming><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_2_0" name="[TUTOR] Évaluer le stage et valider le rapport ou livrable"><bpmn:incoming>Flow_10</bpmn:incoming><bpmn:outgoing>Flow_11</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_2_1" name="[HR] Clôturer la convention et remettre les attestations"><bpmn:incoming>Flow_11</bpmn:incoming><bpmn:outgoing>Flow_12</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_3_0" name="[TUTOR] Faire le bilan final des compétences et livrables"><bpmn:incoming>Flow_13</bpmn:incoming><bpmn:outgoing>Flow_14</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="Branch_3_1" name="[HR] Clôturer le contrat et informer l&apos;établissement"><bpmn:incoming>Flow_14</bpmn:incoming><bpmn:outgoing>Flow_15</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="After_0" name="[HELPDESK] Désactiver les comptes et récupérer les équipements"><bpmn:incoming>Flow_16</bpmn:incoming><bpmn:outgoing>Flow_17</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="After_1" name="[MANAGER] Valider la restitution et la passation"><bpmn:incoming>Flow_17</bpmn:incoming><bpmn:outgoing>Flow_18</bpmn:outgoing></bpmn:userTask>
<bpmn:userTask id="After_2" name="[HR] Clôturer le dossier et archiver les pièces"><bpmn:incoming>Flow_18</bpmn:incoming><bpmn:outgoing>Flow_19</bpmn:outgoing></bpmn:userTask>
<bpmn:endEvent id="End" name="Processus terminé"><bpmn:incoming>Flow_19</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_0" sourceRef="Start" targetRef="Before_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_1" sourceRef="Before_0" targetRef="Before_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_2" sourceRef="Before_1" targetRef="Before_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_3" sourceRef="Before_2" targetRef="Gateway_Split"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_Split" targetRef="Branch_0_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;CDI&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_5" sourceRef="Branch_0_0" targetRef="Branch_0_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_6" sourceRef="Branch_0_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_7" sourceRef="Gateway_Split" targetRef="Branch_1_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;CDD&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_8" sourceRef="Branch_1_0" targetRef="Branch_1_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_9" sourceRef="Branch_1_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_10" sourceRef="Gateway_Split" targetRef="Branch_2_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;STAGE&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_11" sourceRef="Branch_2_0" targetRef="Branch_2_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_12" sourceRef="Branch_2_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_13" sourceRef="Gateway_Split" targetRef="Branch_3_0"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">typeContrat = &apos;ALTERNANCE&apos;</bpmn:conditionExpression></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_14" sourceRef="Branch_3_0" targetRef="Branch_3_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_15" sourceRef="Branch_3_1" targetRef="Gateway_Join"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_16" sourceRef="Gateway_Join" targetRef="After_0"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_17" sourceRef="After_0" targetRef="After_1"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_18" sourceRef="After_1" targetRef="After_2"></bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_19" sourceRef="After_2" targetRef="End"></bpmn:sequenceFlow>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_Process_Offboarding"><bpmndi:BPMNPlane id="Plane_Process_Offboarding" bpmnElement="Process_Offboarding">
    <bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="undefined" y="undefined" width="undefined" height="undefined"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Start_di" bpmnElement="Start"><dc:Bounds x="55" y="180" width="36" height="36"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_0_di" bpmnElement="Before_0"><dc:Bounds x="130" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_1_di" bpmnElement="Before_1"><dc:Bounds x="320" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Before_2_di" bpmnElement="Before_2"><dc:Bounds x="510" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Gateway_Split_di" bpmnElement="Gateway_Split"><dc:Bounds x="700" y="180" width="50" height="50"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Gateway_Join_di" bpmnElement="Gateway_Join"><dc:Bounds x="1250" y="180" width="50" height="50"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_0_0_di" bpmnElement="Branch_0_0"><dc:Bounds x="890" y="35" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_0_1_di" bpmnElement="Branch_0_1"><dc:Bounds x="1065" y="35" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_1_0_di" bpmnElement="Branch_1_0"><dc:Bounds x="890" y="150" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_1_1_di" bpmnElement="Branch_1_1"><dc:Bounds x="1065" y="150" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_2_0_di" bpmnElement="Branch_2_0"><dc:Bounds x="890" y="265" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_2_1_di" bpmnElement="Branch_2_1"><dc:Bounds x="1065" y="265" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_3_0_di" bpmnElement="Branch_3_0"><dc:Bounds x="890" y="380" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Branch_3_1_di" bpmnElement="Branch_3_1"><dc:Bounds x="1065" y="380" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="After_0_di" bpmnElement="After_0"><dc:Bounds x="1380" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="After_1_di" bpmnElement="After_1"><dc:Bounds x="1570" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="After_2_di" bpmnElement="After_2"><dc:Bounds x="1760" y="180" width="150" height="80"/></bpmndi:BPMNShape>
<bpmndi:BPMNShape id="End_di" bpmnElement="End"><dc:Bounds x="1950" y="180" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="Flow_0_di" bpmnElement="Flow_0"><di:waypoint x="91" y="198"/><di:waypoint x="111" y="198"/><di:waypoint x="111" y="220"/><di:waypoint x="130" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="280" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="300" y="220"/><di:waypoint x="320" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="470" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="490" y="220"/><di:waypoint x="510" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="660" y="220"/><di:waypoint x="680" y="220"/><di:waypoint x="680" y="205"/><di:waypoint x="700" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="750" y="205"/><di:waypoint x="820" y="205"/><di:waypoint x="820" y="75"/><di:waypoint x="890" y="75"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="1040" y="75"/><di:waypoint x="1053" y="75"/><di:waypoint x="1053" y="75"/><di:waypoint x="1065" y="75"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="1215" y="75"/><di:waypoint x="1233" y="75"/><di:waypoint x="1233" y="205"/><di:waypoint x="1250" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="750" y="205"/><di:waypoint x="820" y="205"/><di:waypoint x="820" y="190"/><di:waypoint x="890" y="190"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1040" y="190"/><di:waypoint x="1053" y="190"/><di:waypoint x="1053" y="190"/><di:waypoint x="1065" y="190"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1215" y="190"/><di:waypoint x="1233" y="190"/><di:waypoint x="1233" y="205"/><di:waypoint x="1250" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_10_di" bpmnElement="Flow_10"><di:waypoint x="750" y="205"/><di:waypoint x="820" y="205"/><di:waypoint x="820" y="305"/><di:waypoint x="890" y="305"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_11_di" bpmnElement="Flow_11"><di:waypoint x="1040" y="305"/><di:waypoint x="1053" y="305"/><di:waypoint x="1053" y="305"/><di:waypoint x="1065" y="305"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_12_di" bpmnElement="Flow_12"><di:waypoint x="1215" y="305"/><di:waypoint x="1233" y="305"/><di:waypoint x="1233" y="205"/><di:waypoint x="1250" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_13_di" bpmnElement="Flow_13"><di:waypoint x="750" y="205"/><di:waypoint x="820" y="205"/><di:waypoint x="820" y="420"/><di:waypoint x="890" y="420"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_14_di" bpmnElement="Flow_14"><di:waypoint x="1040" y="420"/><di:waypoint x="1053" y="420"/><di:waypoint x="1053" y="420"/><di:waypoint x="1065" y="420"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_15_di" bpmnElement="Flow_15"><di:waypoint x="1215" y="420"/><di:waypoint x="1233" y="420"/><di:waypoint x="1233" y="205"/><di:waypoint x="1250" y="205"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_16_di" bpmnElement="Flow_16"><di:waypoint x="1300" y="205"/><di:waypoint x="1340" y="205"/><di:waypoint x="1340" y="220"/><di:waypoint x="1380" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_17_di" bpmnElement="Flow_17"><di:waypoint x="1530" y="220"/><di:waypoint x="1550" y="220"/><di:waypoint x="1550" y="220"/><di:waypoint x="1570" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_18_di" bpmnElement="Flow_18"><di:waypoint x="1720" y="220"/><di:waypoint x="1740" y="220"/><di:waypoint x="1740" y="220"/><di:waypoint x="1760" y="220"/></bpmndi:BPMNEdge>
<bpmndi:BPMNEdge id="Flow_19_di" bpmnElement="Flow_19"><di:waypoint x="1910" y="220"/><di:waypoint x="1930" y="220"/><di:waypoint x="1930" y="198"/><di:waypoint x="1950" y="198"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>$bpmn_22$,NULL,'demo-software')
ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,version=EXCLUDED.version,content=EXCLUDED.content,"updatedBy"=EXCLUDED."updatedBy";

INSERT INTO project_processes (id,"createdBy","projectId","resourceId",usage,"sourceResourceId") VALUES
('a5000000-0000-4000-8000-000000000001','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','project-specific',NULL),
('a5000000-0000-4000-8000-000000000002','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','project-specific',NULL),
('a5000000-0000-4000-8000-000000000003','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','project-specific',NULL),
('a5000000-0000-4000-8000-000000000004','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','project-specific',NULL),
('a5000000-0000-4000-8000-000000000005','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','project-specific',NULL),
('a5000000-0000-4000-8000-000000000006','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','project-specific',NULL),
('a5000000-0000-4000-8000-000000000007','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','project-specific',NULL),
('a5000000-0000-4000-8000-000000000008','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','project-specific',NULL),
('a5000000-0000-4000-8000-000000000009','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','project-specific',NULL),
('a5000000-0000-4000-8000-000000000010','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','project-specific',NULL),
('a5000000-0000-4000-8000-000000000011','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','project-specific',NULL),
('a5000000-0000-4000-8000-000000000012','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','project-specific',NULL),
('a5000000-0000-4000-8000-000000000013','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','project-specific',NULL),
('a5000000-0000-4000-8000-000000000014','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','project-specific',NULL),
('a5000000-0000-4000-8000-000000000015','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','project-specific',NULL),
('a5000000-0000-4000-8000-000000000016','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','project-specific',NULL),
('a5000000-0000-4000-8000-000000000017','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','project-specific',NULL),
('a5000000-0000-4000-8000-000000000018','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','project-specific',NULL),
('a5000000-0000-4000-8000-000000000019','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','project-specific',NULL),
('a5000000-0000-4000-8000-000000000020','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','project-specific',NULL),
('a5000000-0000-4000-8000-000000000021','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','project-specific',NULL),
('a5000000-0000-4000-8000-000000000022','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','project-specific',NULL)
ON CONFLICT ("projectId","resourceId") DO UPDATE SET usage=EXCLUDED.usage,"sourceResourceId"=EXCLUDED."sourceResourceId";

INSERT INTO project_raci_actors (id,"createdBy","projectId",name,"normalizedName",active,origin) VALUES
('a6000000-0000-4000-8000-000000000001','demo-software','a1000000-0000-4000-8000-000000000001','Direction générale','direction générale',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000002','demo-software','a1000000-0000-4000-8000-000000000001','Directeur des opérations','directeur des opérations',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000003','demo-software','a1000000-0000-4000-8000-000000000001','Directeur technique','directeur technique',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000004','demo-software','a1000000-0000-4000-8000-000000000001','Chef de projet','chef de projet',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000005','demo-software','a1000000-0000-4000-8000-000000000001','Responsable produit et exigences','responsable produit et exigences',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000006','demo-software','a1000000-0000-4000-8000-000000000001','Architecte logiciel et système','architecte logiciel et système',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000007','demo-software','a1000000-0000-4000-8000-000000000001','Responsable développement','responsable développement',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000008','demo-software','a1000000-0000-4000-8000-000000000001','Ingénieur développement logiciel','ingénieur développement logiciel',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000009','demo-software','a1000000-0000-4000-8000-000000000001','Ingénieur IVV','ingénieur ivv',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000010','demo-software','a1000000-0000-4000-8000-000000000001','Responsable qualité logiciel','responsable qualité logiciel',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000011','demo-software','a1000000-0000-4000-8000-000000000001','Ingénieur DevOps','ingénieur devops',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000012','demo-software','a1000000-0000-4000-8000-000000000001','Ingénieur systèmes et intégration','ingénieur systèmes et intégration',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000013','demo-software','a1000000-0000-4000-8000-000000000001','Designer UX/UI','designer ux/ui',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000014','demo-software','a1000000-0000-4000-8000-000000000001','Ingénieur sécurité applicative','ingénieur sécurité applicative',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000015','demo-software','a1000000-0000-4000-8000-000000000001','Ingénieur données','ingénieur données',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000016','demo-software','a1000000-0000-4000-8000-000000000001','Facilitateur agile','facilitateur agile',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000017','demo-software','a1000000-0000-4000-8000-000000000001','Rédacteur technique','rédacteur technique',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000018','demo-software','a1000000-0000-4000-8000-000000000001','Support et maintenance applicative','support et maintenance applicative',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000019','demo-software','a1000000-0000-4000-8000-000000000001','Responsable RH','responsable rh',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000020','demo-software','a1000000-0000-4000-8000-000000000001','Manager','manager',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000021','demo-software','a1000000-0000-4000-8000-000000000001','Collaborateur','collaborateur',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000022','demo-software','a1000000-0000-4000-8000-000000000001','Tuteur / maître d''apprentissage','tuteur / maître d''apprentissage',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000023','demo-software','a1000000-0000-4000-8000-000000000001','Référent école','référent école',TRUE,'manual'),
('a6000000-0000-4000-8000-000000000024','demo-software','a1000000-0000-4000-8000-000000000001','Support informatique','support informatique',TRUE,'manual')
ON CONFLICT ("projectId","normalizedName") DO UPDATE SET name=EXCLUDED.name,active=TRUE;

INSERT INTO project_raci_entries (id,"createdBy","projectId","resourceId","taskId","taskName","actorName",role) VALUES
('a7000000-0000-4000-8000-000000000001','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_0','Gouverner et piloter le projet','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000002','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_1','Cadrer les besoins et exigences','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000003','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_1','Cadrer les besoins et exigences','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000004','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_2','Concevoir l''architecture et la solution','Architecte logiciel et système','R'),
('a7000000-0000-4000-8000-000000000005','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_2','Concevoir l''architecture et la solution','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000006','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_3','Concevoir l''expérience utilisateur','Designer UX/UI','R'),
('a7000000-0000-4000-8000-000000000007','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_3','Concevoir l''expérience utilisateur','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000008','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_4','Réaliser les incréments logiciels','Responsable développement','R'),
('a7000000-0000-4000-8000-000000000009','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_4','Réaliser les incréments logiciels','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000010','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_5','Assurer la qualité du projet','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000011','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_5','Assurer la qualité du projet','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000012','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_6','Maîtriser la sécurité applicative','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000013','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_6','Maîtriser la sécurité applicative','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000014','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_7','Intégrer, vérifier et valider','Ingénieur IVV','R'),
('a7000000-0000-4000-8000-000000000015','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_7','Intégrer, vérifier et valider','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000016','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_8','Livrer et mettre en production','Ingénieur DevOps','R'),
('a7000000-0000-4000-8000-000000000017','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_8','Livrer et mettre en production','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000018','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_9','Exploiter, maintenir et supporter','Support et maintenance applicative','R'),
('a7000000-0000-4000-8000-000000000019','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_9','Exploiter, maintenir et supporter','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000020','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_10','Gérer la documentation du projet','Rédacteur technique','R'),
('a7000000-0000-4000-8000-000000000021','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_10','Gérer la documentation du projet','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000022','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_11','Suivre les activités et rendre compte','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000023','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_0','Formaliser la charte et les objectifs','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000024','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_1','Définir le périmètre, les livrables et critères de succès','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000025','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_2','Construire le planning, les jalons et le budget','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000026','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_3','Affecter les ressources et responsabilités','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000027','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_4','Identifier les risques et plans de réponse','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000028','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_5','Valider les engagements et le lancement','Directeur des opérations','R'),
('a7000000-0000-4000-8000-000000000029','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_5','Valider les engagements et le lancement','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000030','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_6','Animer les revues de pilotage','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000031','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_7','Arbitrer les écarts majeurs','Directeur des opérations','R'),
('a7000000-0000-4000-8000-000000000032','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_7','Arbitrer les écarts majeurs','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000033','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_8','Prononcer la clôture et capitaliser','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000034','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_0','Identifier les parties prenantes et utilisateurs','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000035','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_0','Identifier les parties prenantes et utilisateurs','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000036','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_1','Recueillir les besoins et contraintes','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000037','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_1','Recueillir les besoins et contraintes','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000038','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_2','Conduire les ateliers et parcours utilisateurs','Designer UX/UI','R'),
('a7000000-0000-4000-8000-000000000039','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_2','Conduire les ateliers et parcours utilisateurs','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000040','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_3','Rédiger les exigences fonctionnelles et non fonctionnelles','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000041','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_3','Rédiger les exigences fonctionnelles et non fonctionnelles','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000042','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_4','Vérifier la cohérence technique','Architecte logiciel et système','R'),
('a7000000-0000-4000-8000-000000000043','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_4','Vérifier la cohérence technique','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000044','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_5','Qualifier les exigences de sécurité et données','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000045','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_5','Qualifier les exigences de sécurité et données','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000046','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_6','Définir les critères d''acceptation','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000047','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_6','Définir les critères d''acceptation','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000048','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_7','Prioriser et baseliner le backlog','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000049','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_7','Prioriser et baseliner le backlog','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000050','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Task_8','Faire valider le référentiel des exigences','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000051','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_0','Analyser les contraintes et exigences','Architecte logiciel et système','R'),
('a7000000-0000-4000-8000-000000000052','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_0','Analyser les contraintes et exigences','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000053','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_1','Définir l''architecture logique et physique','Architecte logiciel et système','R'),
('a7000000-0000-4000-8000-000000000054','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_1','Définir l''architecture logique et physique','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000055','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_2','Concevoir les modèles et flux de données','Ingénieur données','R'),
('a7000000-0000-4000-8000-000000000056','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_2','Concevoir les modèles et flux de données','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000057','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_3','Définir les interfaces et intégrations','Ingénieur systèmes et intégration','R'),
('a7000000-0000-4000-8000-000000000058','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_3','Définir les interfaces et intégrations','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000059','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_4','Réaliser l''analyse de risques de sécurité','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000060','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_4','Réaliser l''analyse de risques de sécurité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000061','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_5','Définir les environnements et principes de déploiement','Ingénieur DevOps','R'),
('a7000000-0000-4000-8000-000000000062','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_5','Définir les environnements et principes de déploiement','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000063','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_6','Produire les dossiers de conception','Architecte logiciel et système','R'),
('a7000000-0000-4000-8000-000000000064','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_6','Produire les dossiers de conception','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000065','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_7','Organiser la revue de conception','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000066','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_7','Organiser la revue de conception','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000067','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_8','Valider l''architecture cible','Directeur technique','R'),
('a7000000-0000-4000-8000-000000000068','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','Task_8','Valider l''architecture cible','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000069','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_0','Analyser les utilisateurs et contextes d''usage','Designer UX/UI','R'),
('a7000000-0000-4000-8000-000000000070','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_0','Analyser les utilisateurs et contextes d''usage','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000071','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_1','Définir les parcours et scénarios','Designer UX/UI','R'),
('a7000000-0000-4000-8000-000000000072','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_1','Définir les parcours et scénarios','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000073','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_2','Réaliser les wireframes et prototypes','Designer UX/UI','R'),
('a7000000-0000-4000-8000-000000000074','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_2','Réaliser les wireframes et prototypes','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000075','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_3','Valider l''adéquation aux besoins','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000076','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_3','Valider l''adéquation aux besoins','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000077','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_4','Décliner l''interface et le design system','Designer UX/UI','R'),
('a7000000-0000-4000-8000-000000000078','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_4','Décliner l''interface et le design system','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000079','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_5','Vérifier accessibilité et responsive','Designer UX/UI','R'),
('a7000000-0000-4000-8000-000000000080','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_5','Vérifier accessibilité et responsive','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000081','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_6','Organiser les tests utilisateurs','Designer UX/UI','R'),
('a7000000-0000-4000-8000-000000000082','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_6','Organiser les tests utilisateurs','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000083','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_7','Valider les maquettes et critères UX','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000084','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000005','Task_7','Valider les maquettes et critères UX','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000085','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_0','Préparer et planifier le sprint','Facilitateur agile','R'),
('a7000000-0000-4000-8000-000000000086','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_0','Préparer et planifier le sprint','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000087','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_1','Clarifier les éléments du backlog','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000088','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_1','Clarifier les éléments du backlog','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000089','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_2','Distribuer les travaux et définir les règles techniques','Responsable développement','R'),
('a7000000-0000-4000-8000-000000000090','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_2','Distribuer les travaux et définir les règles techniques','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000091','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_3','Développer les composants','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000092','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_3','Développer les composants','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000093','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_4','Réaliser les tests unitaires','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000094','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_4','Réaliser les tests unitaires','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000095','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_5','Effectuer les revues de code','Responsable développement','R'),
('a7000000-0000-4000-8000-000000000096','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_5','Effectuer les revues de code','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000097','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_6','Corriger les anomalies détectées','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000098','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_6','Corriger les anomalies détectées','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000099','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_7','Animer la revue et rétrospective','Facilitateur agile','R'),
('a7000000-0000-4000-8000-000000000100','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_7','Animer la revue et rétrospective','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000101','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_8','Accepter ou rejeter l''incrément','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000102','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000006','Task_8','Accepter ou rejeter l''incrément','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000103','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_0','Créer une branche et associer le ticket','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000104','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_0','Créer une branche et associer le ticket','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000105','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_1','Soumettre une pull request','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000106','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_1','Soumettre une pull request','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000107','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_2','Contrôler la conformité aux règles de codage','Responsable développement','R'),
('a7000000-0000-4000-8000-000000000108','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_2','Contrôler la conformité aux règles de codage','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000109','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_3','Vérifier les points de sécurité','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000110','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_3','Vérifier les points de sécurité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000111','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_4','Traiter les commentaires de revue','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000112','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_4','Traiter les commentaires de revue','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000113','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_5','Approuver et fusionner le changement','Responsable développement','R'),
('a7000000-0000-4000-8000-000000000114','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_5','Approuver et fusionner le changement','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000115','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_6','Tracer la version et les artefacts','Ingénieur DevOps','R'),
('a7000000-0000-4000-8000-000000000116','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000007','Task_6','Tracer la version et les artefacts','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000117','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_0','Pousser le changement dans le dépôt','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000118','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_0','Pousser le changement dans le dépôt','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000119','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_1','Déclencher le pipeline CI','Ingénieur DevOps','R'),
('a7000000-0000-4000-8000-000000000120','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_1','Déclencher le pipeline CI','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000121','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_2','Construire et compiler les composants','Ingénieur DevOps','R'),
('a7000000-0000-4000-8000-000000000122','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_2','Construire et compiler les composants','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000123','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_3','Exécuter les tests automatisés','Ingénieur IVV','R'),
('a7000000-0000-4000-8000-000000000124','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_3','Exécuter les tests automatisés','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000125','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_4','Contrôler couverture et qualité du code','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000126','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_4','Contrôler couverture et qualité du code','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000127','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_5','Exécuter les analyses de vulnérabilités','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000128','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_5','Exécuter les analyses de vulnérabilités','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000129','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_6','Publier les artefacts versionnés','Ingénieur DevOps','R'),
('a7000000-0000-4000-8000-000000000130','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_6','Publier les artefacts versionnés','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000131','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_7','Analyser et traiter les échecs du pipeline','Responsable développement','R'),
('a7000000-0000-4000-8000-000000000132','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000008','Task_7','Analyser et traiter les échecs du pipeline','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000133','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_0','Préparer l''environnement d''intégration','Ingénieur systèmes et intégration','R'),
('a7000000-0000-4000-8000-000000000134','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_0','Préparer l''environnement d''intégration','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000135','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_1','Livrer les composants vérifiés','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000136','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_1','Livrer les composants vérifiés','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000137','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_2','Assembler les composants et dépendances','Ingénieur systèmes et intégration','R'),
('a7000000-0000-4000-8000-000000000138','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_2','Assembler les composants et dépendances','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000139','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_3','Intégrer les schémas et migrations de données','Ingénieur données','R'),
('a7000000-0000-4000-8000-000000000140','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_3','Intégrer les schémas et migrations de données','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000141','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_4','Vérifier les interfaces et échanges','Ingénieur systèmes et intégration','R'),
('a7000000-0000-4000-8000-000000000142','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_4','Vérifier les interfaces et échanges','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000143','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_5','Exécuter les tests d''intégration','Ingénieur IVV','R'),
('a7000000-0000-4000-8000-000000000144','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_5','Exécuter les tests d''intégration','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000145','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_6','Traiter les écarts d''intégration','Ingénieur systèmes et intégration','R'),
('a7000000-0000-4000-8000-000000000146','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_6','Traiter les écarts d''intégration','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000147','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_7','Prononcer l''aptitude à la qualification','Ingénieur IVV','R'),
('a7000000-0000-4000-8000-000000000148','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000009','Task_7','Prononcer l''aptitude à la qualification','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000149','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_0','Établir le plan IVV et la matrice de traçabilité','Ingénieur IVV','R'),
('a7000000-0000-4000-8000-000000000150','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_0','Établir le plan IVV et la matrice de traçabilité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000151','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_1','Préparer les jeux de données et environnements','Ingénieur IVV','R'),
('a7000000-0000-4000-8000-000000000152','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_1','Préparer les jeux de données et environnements','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000153','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_2','Exécuter les tests système et non-régression','Ingénieur IVV','R'),
('a7000000-0000-4000-8000-000000000154','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_2','Exécuter les tests système et non-régression','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000155','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_3','Exécuter les tests de sécurité','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000156','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_3','Exécuter les tests de sécurité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000157','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_4','Vérifier la couverture des exigences','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000158','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_4','Vérifier la couverture des exigences','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000159','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_5','Enregistrer et qualifier les anomalies','Ingénieur IVV','R'),
('a7000000-0000-4000-8000-000000000160','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_5','Enregistrer et qualifier les anomalies','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000161','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_6','Corriger les anomalies bloquantes','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000162','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_6','Corriger les anomalies bloquantes','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000163','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_7','Rejouer les tests et consolider les preuves','Ingénieur IVV','R'),
('a7000000-0000-4000-8000-000000000164','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_7','Rejouer les tests et consolider les preuves','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000165','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_8','Organiser la recette métier','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000166','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_8','Organiser la recette métier','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000167','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_9','Prononcer l''acceptation ou le refus','Directeur des opérations','R'),
('a7000000-0000-4000-8000-000000000168','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_9','Prononcer l''acceptation ou le refus','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000169','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_0','Établir le plan qualité projet','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000170','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_0','Établir le plan qualité projet','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000171','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_1','Définir les revues et points de contrôle','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000172','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_1','Définir les revues et points de contrôle','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000173','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_2','Vérifier l''application des processus','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000174','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_2','Vérifier l''application des processus','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000175','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_3','Réaliser les audits et revues indépendantes','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000176','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_3','Réaliser les audits et revues indépendantes','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000177','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_4','Enregistrer les non-conformités','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000178','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_4','Enregistrer les non-conformités','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000179','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_5','Affecter les actions correctives','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000180','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_6','Vérifier l''efficacité des actions','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000181','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_6','Vérifier l''efficacité des actions','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000182','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_7','Valider le bilan qualité','Directeur des opérations','R'),
('a7000000-0000-4000-8000-000000000183','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_7','Valider le bilan qualité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000184','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_0','Identifier les actifs et données sensibles','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000185','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_0','Identifier les actifs et données sensibles','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000186','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_1','Analyser les menaces et risques','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000187','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_1','Analyser les menaces et risques','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000188','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_2','Définir les exigences et mesures de sécurité','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000189','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_2','Définir les exigences et mesures de sécurité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000190','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_3','Intégrer les mesures dans l''architecture','Architecte logiciel et système','R'),
('a7000000-0000-4000-8000-000000000191','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_3','Intégrer les mesures dans l''architecture','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000192','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_4','Appliquer les pratiques de développement sécurisé','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000193','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_4','Appliquer les pratiques de développement sécurisé','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000194','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_5','Réaliser les scans et tests de sécurité','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000195','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_5','Réaliser les scans et tests de sécurité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000196','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_6','Corriger les vulnérabilités','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000197','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_6','Corriger les vulnérabilités','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000198','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_7','Évaluer les risques résiduels et prononcer l''avis','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000199','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','Task_7','Évaluer les risques résiduels et prononcer l''avis','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000200','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_0','Vérifier les critères de sortie et livrables','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000201','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_1','Confirmer la clôture des tests','Ingénieur IVV','R'),
('a7000000-0000-4000-8000-000000000202','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_1','Confirmer la clôture des tests','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000203','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_2','Émettre l''avis qualité','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000204','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_2','Émettre l''avis qualité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000205','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_3','Émettre l''avis sécurité','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000206','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_3','Émettre l''avis sécurité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000207','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_4','Préparer le paquet et les notes de version','Ingénieur DevOps','R'),
('a7000000-0000-4000-8000-000000000208','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_4','Préparer le paquet et les notes de version','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000209','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_5','Décider le go/no-go','Directeur des opérations','R'),
('a7000000-0000-4000-8000-000000000210','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_5','Décider le go/no-go','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000211','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_6','Déployer en production','Ingénieur DevOps','R'),
('a7000000-0000-4000-8000-000000000212','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_6','Déployer en production','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000213','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_7','Vérifier le service après déploiement','Ingénieur systèmes et intégration','R'),
('a7000000-0000-4000-8000-000000000214','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_7','Vérifier le service après déploiement','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000215','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_8','Prononcer la livraison au client','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000216','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_0','Surveiller disponibilité et performance','Ingénieur DevOps','R'),
('a7000000-0000-4000-8000-000000000217','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_0','Surveiller disponibilité et performance','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000218','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_1','Qualifier les alertes et incidents','Support et maintenance applicative','R'),
('a7000000-0000-4000-8000-000000000219','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_1','Qualifier les alertes et incidents','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000220','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_2','Évaluer l''impact et prioriser','Support et maintenance applicative','R'),
('a7000000-0000-4000-8000-000000000221','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_2','Évaluer l''impact et prioriser','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000222','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_3','Rétablir le service ou appliquer un contournement','Ingénieur systèmes et intégration','R'),
('a7000000-0000-4000-8000-000000000223','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_3','Rétablir le service ou appliquer un contournement','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000224','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_4','Analyser la cause racine si nécessaire','Ingénieur développement logiciel','R'),
('a7000000-0000-4000-8000-000000000225','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_4','Analyser la cause racine si nécessaire','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000226','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_5','Valider le correctif','Responsable développement','R'),
('a7000000-0000-4000-8000-000000000227','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_5','Valider le correctif','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000228','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_6','Déployer le correctif','Ingénieur DevOps','R'),
('a7000000-0000-4000-8000-000000000229','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_6','Déployer le correctif','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000230','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_7','Informer les utilisateurs et clôturer','Support et maintenance applicative','R'),
('a7000000-0000-4000-8000-000000000231','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_7','Informer les utilisateurs et clôturer','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000232','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_8','Capitaliser le retour d''expérience','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000233','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000014','Task_8','Capitaliser le retour d''expérience','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000234','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_0','Déclarer une demande ou un incident','Collaborateur','R'),
('a7000000-0000-4000-8000-000000000235','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_0','Déclarer une demande ou un incident','Manager','A'),
('a7000000-0000-4000-8000-000000000236','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_1','Enregistrer et qualifier le ticket','Support informatique','R'),
('a7000000-0000-4000-8000-000000000237','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_1','Enregistrer et qualifier le ticket','Manager','A'),
('a7000000-0000-4000-8000-000000000238','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_2','Prioriser selon impact et urgence','Support informatique','R'),
('a7000000-0000-4000-8000-000000000239','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_2','Prioriser selon impact et urgence','Manager','A'),
('a7000000-0000-4000-8000-000000000240','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_3','Résoudre au niveau 1 ou 2','Ingénieur systèmes et intégration','R'),
('a7000000-0000-4000-8000-000000000241','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_3','Résoudre au niveau 1 ou 2','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000242','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_4','Arbitrer une escalade technique','Directeur technique','R'),
('a7000000-0000-4000-8000-000000000243','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_4','Arbitrer une escalade technique','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000244','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_5','Informer le demandeur','Support informatique','R'),
('a7000000-0000-4000-8000-000000000245','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_5','Informer le demandeur','Manager','A'),
('a7000000-0000-4000-8000-000000000246','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_6','Confirmer la résolution','Collaborateur','R'),
('a7000000-0000-4000-8000-000000000247','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_6','Confirmer la résolution','Manager','A'),
('a7000000-0000-4000-8000-000000000248','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_7','Clôturer et alimenter la base de connaissance','Support informatique','R'),
('a7000000-0000-4000-8000-000000000249','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000015','Task_7','Clôturer et alimenter la base de connaissance','Manager','A'),
('a7000000-0000-4000-8000-000000000250','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_0','Identifier les documents et propriétaires','Rédacteur technique','R'),
('a7000000-0000-4000-8000-000000000251','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_0','Identifier les documents et propriétaires','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000252','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_1','Définir les règles de gestion documentaire','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000253','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_2','Créer ou mettre à jour le document','Rédacteur technique','R'),
('a7000000-0000-4000-8000-000000000254','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_2','Créer ou mettre à jour le document','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000255','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_3','Vérifier le fond et la conformité','Responsable qualité logiciel','R'),
('a7000000-0000-4000-8000-000000000256','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_3','Vérifier le fond et la conformité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000257','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_4','Valider le document technique','Directeur technique','R'),
('a7000000-0000-4000-8000-000000000258','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_4','Valider le document technique','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000259','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_5','Publier la version approuvée','Rédacteur technique','R'),
('a7000000-0000-4000-8000-000000000260','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_5','Publier la version approuvée','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000261','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_6','Diffuser aux destinataires autorisés','Rédacteur technique','R'),
('a7000000-0000-4000-8000-000000000262','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_6','Diffuser aux destinataires autorisés','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000263','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_7','Archiver les versions remplacées','Rédacteur technique','R'),
('a7000000-0000-4000-8000-000000000264','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000016','Task_7','Archiver les versions remplacées','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000265','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_0','Déclarer les activités réalisées et le temps passé','Collaborateur','R'),
('a7000000-0000-4000-8000-000000000266','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_0','Déclarer les activités réalisées et le temps passé','Manager','A'),
('a7000000-0000-4000-8000-000000000267','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_1','Contrôler la cohérence des déclarations','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000268','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_2','Mettre à jour avancement et reste à faire','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000269','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_3','Comparer réalisé, prévu et capacité','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000270','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_4','Identifier les blocages et dépendances','Facilitateur agile','R'),
('a7000000-0000-4000-8000-000000000271','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_4','Identifier les blocages et dépendances','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000272','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_5','Proposer les actions de rattrapage','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000273','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_6','Arbitrer les écarts significatifs','Directeur des opérations','R'),
('a7000000-0000-4000-8000-000000000274','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_6','Arbitrer les écarts significatifs','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000275','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_7','Diffuser le tableau de bord','Chef de projet','R'),
('a7000000-0000-4000-8000-000000000276','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_0','Identifier les jeux et référentiels de données','Ingénieur données','R'),
('a7000000-0000-4000-8000-000000000277','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_0','Identifier les jeux et référentiels de données','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000278','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_1','Définir les règles métier et qualité','Responsable produit et exigences','R'),
('a7000000-0000-4000-8000-000000000279','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_1','Définir les règles métier et qualité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000280','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_2','Définir classification et habilitations','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000281','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_2','Définir classification et habilitations','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000282','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_3','Mettre en œuvre modèles et contrôles','Ingénieur données','R'),
('a7000000-0000-4000-8000-000000000283','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_3','Mettre en œuvre modèles et contrôles','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000284','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_4','Organiser sauvegardes et restauration','Ingénieur systèmes et intégration','R'),
('a7000000-0000-4000-8000-000000000285','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_4','Organiser sauvegardes et restauration','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000286','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_5','Contrôler qualité et intégrité','Ingénieur données','R'),
('a7000000-0000-4000-8000-000000000287','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_5','Contrôler qualité et intégrité','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000288','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_6','Vérifier conservation et purge','Ingénieur sécurité applicative','R'),
('a7000000-0000-4000-8000-000000000289','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_6','Vérifier conservation et purge','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000290','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_7','Tracer les évolutions du référentiel','Ingénieur données','R'),
('a7000000-0000-4000-8000-000000000291','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000018','Task_7','Tracer les évolutions du référentiel','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000292','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Before_0','Formaliser le besoin et la fiche de fonction','Manager','R'),
('a7000000-0000-4000-8000-000000000293','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Before_0','Formaliser le besoin et la fiche de fonction','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000294','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Before_1','Valider le budget et l''ouverture du poste','Directeur des opérations','R'),
('a7000000-0000-4000-8000-000000000295','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Before_1','Valider le budget et l''ouverture du poste','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000296','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Before_2','Publier l''offre et organiser les candidatures','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000297','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Before_3','Évaluer les candidatures et conduire les entretiens','Manager','R'),
('a7000000-0000-4000-8000-000000000298','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Before_3','Évaluer les candidatures et conduire les entretiens','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000299','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Before_4','Vérifier les références et préparer la proposition','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000300','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Branch_0_0','Préparer la proposition de CDI et les clauses applicables','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000301','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Branch_0_1','Constituer le dossier d''embauche CDI','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000302','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Branch_1_0','Justifier le motif et le terme du CDD','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000303','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Branch_1_1','Préparer le contrat et les échéances de renouvellement','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000304','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Branch_2_0','Valider la convention, les dates et le sujet de stage','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000305','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Branch_2_1','Désigner le tuteur et les objectifs pédagogiques','Tuteur / maître d''apprentissage','R'),
('a7000000-0000-4000-8000-000000000306','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Branch_2_1','Désigner le tuteur et les objectifs pédagogiques','Manager','A'),
('a7000000-0000-4000-8000-000000000307','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Branch_3_0','Valider le rythme et le contrat d''alternance','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000308','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Branch_3_1','Désigner le maître d''apprentissage et le parcours école','Tuteur / maître d''apprentissage','R'),
('a7000000-0000-4000-8000-000000000309','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Branch_3_1','Désigner le maître d''apprentissage et le parcours école','Manager','A'),
('a7000000-0000-4000-8000-000000000310','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','After_0','Faire signer les documents et enregistrer l''embauche','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000311','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','After_1','Transmettre le dossier au processus d''onboarding','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000312','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Before_0','Confirmer la date d''arrivée et le dossier administratif','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000313','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Before_1','Préparer le poste, les missions et le parcours d''accueil','Manager','R'),
('a7000000-0000-4000-8000-000000000314','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Before_1','Préparer le poste, les missions et le parcours d''accueil','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000315','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Before_2','Créer les comptes, habilitations et équipements','Support informatique','R'),
('a7000000-0000-4000-8000-000000000316','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Before_2','Créer les comptes, habilitations et équipements','Manager','A'),
('a7000000-0000-4000-8000-000000000317','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Before_3','Organiser l''accueil et les informations obligatoires','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000318','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_0_0','Définir les objectifs de prise de poste à 30/60/90 jours','Manager','R'),
('a7000000-0000-4000-8000-000000000319','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_0_0','Définir les objectifs de prise de poste à 30/60/90 jours','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000320','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_0_1','Planifier le suivi de période d''essai','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000321','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_1_0','Définir les objectifs liés à la durée du CDD','Manager','R'),
('a7000000-0000-4000-8000-000000000322','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_1_0','Définir les objectifs liés à la durée du CDD','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000323','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_1_1','Planifier les points avant échéance et renouvellement éventuel','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000324','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_2_0','Présenter le sujet, les livrables et le cadre pédagogique','Tuteur / maître d''apprentissage','R'),
('a7000000-0000-4000-8000-000000000325','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_2_0','Présenter le sujet, les livrables et le cadre pédagogique','Manager','A'),
('a7000000-0000-4000-8000-000000000326','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_2_1','Confirmer les modalités de suivi avec l''établissement','Référent école','R'),
('a7000000-0000-4000-8000-000000000327','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_2_1','Confirmer les modalités de suivi avec l''établissement','Manager','A'),
('a7000000-0000-4000-8000-000000000328','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_3_0','Construire le parcours de progression en entreprise','Tuteur / maître d''apprentissage','R'),
('a7000000-0000-4000-8000-000000000329','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_3_0','Construire le parcours de progression en entreprise','Manager','A'),
('a7000000-0000-4000-8000-000000000330','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_3_1','Synchroniser calendrier, compétences et évaluations école','Référent école','R'),
('a7000000-0000-4000-8000-000000000331','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','Branch_3_1','Synchroniser calendrier, compétences et évaluations école','Manager','A'),
('a7000000-0000-4000-8000-000000000332','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','After_0','Prendre connaissance des règles et outils','Collaborateur','R'),
('a7000000-0000-4000-8000-000000000333','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','After_0','Prendre connaissance des règles et outils','Manager','A'),
('a7000000-0000-4000-8000-000000000334','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','After_1','Réaliser le point de démarrage et confirmer l''intégration','Manager','R'),
('a7000000-0000-4000-8000-000000000335','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000020','After_1','Réaliser le point de démarrage et confirmer l''intégration','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000336','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Before_0','Déclencher la campagne et communiquer le calendrier','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000337','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Before_1','Préparer le bilan et l''autoévaluation','Collaborateur','R'),
('a7000000-0000-4000-8000-000000000338','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Before_1','Préparer le bilan et l''autoévaluation','Manager','A'),
('a7000000-0000-4000-8000-000000000339','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Before_2','Collecter les faits et préparer l''entretien','Manager','R'),
('a7000000-0000-4000-8000-000000000340','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Before_2','Collecter les faits et préparer l''entretien','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000341','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_0_0','Réaliser l''entretien annuel et revoir les objectifs','Manager','R'),
('a7000000-0000-4000-8000-000000000342','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_0_0','Réaliser l''entretien annuel et revoir les objectifs','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000343','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_0_1','Examiner évolution, mobilité et formation','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000344','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_1_0','Réaliser le point périodique et préparer la fin de contrat','Manager','R'),
('a7000000-0000-4000-8000-000000000345','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_1_0','Réaliser le point périodique et préparer la fin de contrat','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000346','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_1_1','Évaluer les perspectives de renouvellement ou de sortie','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000347','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_2_0','Réaliser le bilan intermédiaire et final du stage','Tuteur / maître d''apprentissage','R'),
('a7000000-0000-4000-8000-000000000348','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_2_0','Réaliser le bilan intermédiaire et final du stage','Manager','A'),
('a7000000-0000-4000-8000-000000000349','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_2_1','Recueillir l''évaluation pédagogique de l''établissement','Référent école','R'),
('a7000000-0000-4000-8000-000000000350','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_2_1','Recueillir l''évaluation pédagogique de l''établissement','Manager','A'),
('a7000000-0000-4000-8000-000000000351','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_3_0','Évaluer les compétences acquises en entreprise','Tuteur / maître d''apprentissage','R'),
('a7000000-0000-4000-8000-000000000352','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_3_0','Évaluer les compétences acquises en entreprise','Manager','A'),
('a7000000-0000-4000-8000-000000000353','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_3_1','Réaliser le bilan tripartite entreprise-école-alternant','Référent école','R'),
('a7000000-0000-4000-8000-000000000354','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','Branch_3_1','Réaliser le bilan tripartite entreprise-école-alternant','Manager','A'),
('a7000000-0000-4000-8000-000000000355','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','After_0','Formaliser les résultats et objectifs de progrès','Manager','R'),
('a7000000-0000-4000-8000-000000000356','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','After_0','Formaliser les résultats et objectifs de progrès','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000357','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000021','After_1','Mettre à jour les compétences et le plan de formation','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000358','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Before_0','Déclencher le départ et vérifier les dates/obligations','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000359','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Before_1','Organiser la passation et le transfert de connaissances','Manager','R'),
('a7000000-0000-4000-8000-000000000360','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Before_1','Organiser la passation et le transfert de connaissances','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000361','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Before_2','Mettre à jour les dossiers et documents de référence','Rédacteur technique','R'),
('a7000000-0000-4000-8000-000000000362','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Before_2','Mettre à jour les dossiers et documents de référence','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000363','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Branch_0_0','Traiter la procédure de départ et les documents de fin de contrat','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000364','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Branch_0_1','Planifier les obligations et échéances de sortie','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000365','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Branch_1_0','Vérifier le terme, renouvellement ou fin anticipée','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000366','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Branch_1_1','Préparer les documents de fin de CDD','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000367','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Branch_2_0','Évaluer le stage et valider le rapport ou livrable','Tuteur / maître d''apprentissage','R'),
('a7000000-0000-4000-8000-000000000368','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Branch_2_0','Évaluer le stage et valider le rapport ou livrable','Manager','A'),
('a7000000-0000-4000-8000-000000000369','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Branch_2_1','Clôturer la convention et remettre les attestations','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000370','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Branch_3_0','Faire le bilan final des compétences et livrables','Tuteur / maître d''apprentissage','R'),
('a7000000-0000-4000-8000-000000000371','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Branch_3_0','Faire le bilan final des compétences et livrables','Manager','A'),
('a7000000-0000-4000-8000-000000000372','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','Branch_3_1','Clôturer le contrat et informer l''établissement','Responsable RH','R'),
('a7000000-0000-4000-8000-000000000373','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','After_0','Désactiver les comptes et récupérer les équipements','Support informatique','R'),
('a7000000-0000-4000-8000-000000000374','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','After_0','Désactiver les comptes et récupérer les équipements','Manager','A'),
('a7000000-0000-4000-8000-000000000375','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','After_1','Valider la restitution et la passation','Manager','R'),
('a7000000-0000-4000-8000-000000000376','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','After_1','Valider la restitution et la passation','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000377','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000022','After_2','Clôturer le dossier et archiver les pièces','Responsable RH','R')
('a7000000-0000-4000-8000-000000000378','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_12','Revoir le code et gérer la configuration','Responsable développement','R'),
('a7000000-0000-4000-8000-000000000379','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_12','Revoir le code et gérer la configuration','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000380','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_13','Construire et contrôler le pipeline CI/CD','Ingénieur DevOps','R'),
('a7000000-0000-4000-8000-000000000381','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_13','Construire et contrôler le pipeline CI/CD','Chef de projet','A'),
('a7000000-0000-4000-8000-000000000382','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_14','Intégrer les composants et systèmes','Ingénieur systèmes et intégration','R'),
('a7000000-0000-4000-8000-000000000383','demo-software','a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Call_14','Intégrer les composants et systèmes','Chef de projet','A')
ON CONFLICT ("projectId","resourceId","taskId","actorName") DO UPDATE SET "taskName"=EXCLUDED."taskName",role=EXCLUDED.role;

INSERT INTO project_job_positions (id,"createdBy","projectId","functionId",title,description,active) VALUES
('a8000000-0000-4000-8000-000000000001','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','Directeur des opérations','Rôle projet de démonstration : Directeur des opérations',TRUE),
('a8000000-0000-4000-8000-000000000002','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000002','Directeur technique','Rôle projet de démonstration : Directeur technique',TRUE),
('a8000000-0000-4000-8000-000000000003','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000003','Chef de projet','Rôle projet de démonstration : Chef de projet',TRUE),
('a8000000-0000-4000-8000-000000000004','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000004','Responsable produit et exigences','Rôle projet de démonstration : Responsable produit et exigences',TRUE),
('a8000000-0000-4000-8000-000000000005','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000005','Architecte logiciel et système','Rôle projet de démonstration : Architecte logiciel et système',TRUE),
('a8000000-0000-4000-8000-000000000006','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000006','Responsable développement','Rôle projet de démonstration : Responsable développement',TRUE),
('a8000000-0000-4000-8000-000000000007','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000007','Ingénieur développement logiciel','Rôle projet de démonstration : Ingénieur développement logiciel',TRUE),
('a8000000-0000-4000-8000-000000000008','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000008','Ingénieur IVV','Rôle projet de démonstration : Ingénieur IVV',TRUE),
('a8000000-0000-4000-8000-000000000009','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000009','Responsable qualité logiciel','Rôle projet de démonstration : Responsable qualité logiciel',TRUE),
('a8000000-0000-4000-8000-000000000010','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000010','Ingénieur DevOps','Rôle projet de démonstration : Ingénieur DevOps',TRUE),
('a8000000-0000-4000-8000-000000000011','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000011','Ingénieur systèmes et intégration','Rôle projet de démonstration : Ingénieur systèmes et intégration',TRUE),
('a8000000-0000-4000-8000-000000000012','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000012','Designer UX/UI','Rôle projet de démonstration : Designer UX/UI',TRUE),
('a8000000-0000-4000-8000-000000000013','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000013','Ingénieur sécurité applicative','Rôle projet de démonstration : Ingénieur sécurité applicative',TRUE),
('a8000000-0000-4000-8000-000000000014','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000014','Ingénieur données','Rôle projet de démonstration : Ingénieur données',TRUE),
('a8000000-0000-4000-8000-000000000015','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000015','Facilitateur agile','Rôle projet de démonstration : Facilitateur agile',TRUE),
('a8000000-0000-4000-8000-000000000016','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000016','Rédacteur technique','Rôle projet de démonstration : Rédacteur technique',TRUE),
('a8000000-0000-4000-8000-000000000017','demo-software','a1000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000017','Support et maintenance applicative','Rôle projet de démonstration : Support et maintenance applicative',TRUE)
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,active=TRUE;

INSERT INTO position_competency_blocks (id,"createdBy","positionId","blockId",applicability,"requiredLevel") VALUES
('a9000000-0000-4000-8000-000000000001','demo-software','a8000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','required',3),
('a9000000-0000-4000-8000-000000000002','demo-software','a8000000-0000-4000-8000-000000000002','85000000-0000-4000-8000-000000000003','required',3),
('a9000000-0000-4000-8000-000000000003','demo-software','a8000000-0000-4000-8000-000000000003','85000000-0000-4000-8000-000000000001','required',3),
('a9000000-0000-4000-8000-000000000004','demo-software','a8000000-0000-4000-8000-000000000004','85000000-0000-4000-8000-000000000002','required',3),
('a9000000-0000-4000-8000-000000000005','demo-software','a8000000-0000-4000-8000-000000000005','85000000-0000-4000-8000-000000000003','required',3),
('a9000000-0000-4000-8000-000000000006','demo-software','a8000000-0000-4000-8000-000000000006','85000000-0000-4000-8000-000000000004','required',3),
('a9000000-0000-4000-8000-000000000007','demo-software','a8000000-0000-4000-8000-000000000007','85000000-0000-4000-8000-000000000004','required',3),
('a9000000-0000-4000-8000-000000000008','demo-software','a8000000-0000-4000-8000-000000000008','85000000-0000-4000-8000-000000000005','required',3),
('a9000000-0000-4000-8000-000000000009','demo-software','a8000000-0000-4000-8000-000000000009','85000000-0000-4000-8000-000000000006','required',3),
('a9000000-0000-4000-8000-000000000010','demo-software','a8000000-0000-4000-8000-000000000010','85000000-0000-4000-8000-000000000007','required',3),
('a9000000-0000-4000-8000-000000000011','demo-software','a8000000-0000-4000-8000-000000000011','85000000-0000-4000-8000-000000000007','required',3),
('a9000000-0000-4000-8000-000000000012','demo-software','a8000000-0000-4000-8000-000000000012','85000000-0000-4000-8000-000000000002','required',3),
('a9000000-0000-4000-8000-000000000013','demo-software','a8000000-0000-4000-8000-000000000013','85000000-0000-4000-8000-000000000008','required',3),
('a9000000-0000-4000-8000-000000000014','demo-software','a8000000-0000-4000-8000-000000000014','85000000-0000-4000-8000-000000000009','required',3),
('a9000000-0000-4000-8000-000000000015','demo-software','a8000000-0000-4000-8000-000000000015','85000000-0000-4000-8000-000000000010','required',3),
('a9000000-0000-4000-8000-000000000016','demo-software','a8000000-0000-4000-8000-000000000016','85000000-0000-4000-8000-000000000010','required',3),
('a9000000-0000-4000-8000-000000000017','demo-software','a8000000-0000-4000-8000-000000000017','85000000-0000-4000-8000-000000000007','required',3)
ON CONFLICT ("positionId","blockId") DO UPDATE SET applicability=EXCLUDED.applicability,"requiredLevel"=EXCLUDED."requiredLevel";

INSERT INTO position_raci_actor_mappings (id,"createdBy","projectId","positionId","raciActorId") VALUES
('aa000000-0000-4000-8000-000000000100','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000101','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000002','a6000000-0000-4000-8000-000000000003'),
('aa000000-0000-4000-8000-000000000102','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a6000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000103','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a6000000-0000-4000-8000-000000000005'),
('aa000000-0000-4000-8000-000000000104','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000005','a6000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000105','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','a6000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000106','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a6000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000107','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000008','a6000000-0000-4000-8000-000000000009'),
('aa000000-0000-4000-8000-000000000108','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a6000000-0000-4000-8000-000000000010'),
('aa000000-0000-4000-8000-000000000109','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a6000000-0000-4000-8000-000000000011'),
('aa000000-0000-4000-8000-000000000110','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000011','a6000000-0000-4000-8000-000000000012'),
('aa000000-0000-4000-8000-000000000111','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000012','a6000000-0000-4000-8000-000000000013'),
('aa000000-0000-4000-8000-000000000112','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a6000000-0000-4000-8000-000000000014'),
('aa000000-0000-4000-8000-000000000113','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000014','a6000000-0000-4000-8000-000000000015'),
('aa000000-0000-4000-8000-000000000114','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000015','a6000000-0000-4000-8000-000000000016'),
('aa000000-0000-4000-8000-000000000115','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000016','a6000000-0000-4000-8000-000000000017'),
('aa000000-0000-4000-8000-000000000116','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000017','a6000000-0000-4000-8000-000000000018')
ON CONFLICT ("positionId","raciActorId") DO NOTHING;

INSERT INTO position_activity_mappings (id,"createdBy","projectId","positionId","resourceId","taskId","blockId") VALUES
('aa000000-0000-4000-8000-000000000001','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000001','Call_0','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000002','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000001','Call_1','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000003','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000005','a3000000-0000-4000-8000-000000000001','Call_2','85000000-0000-4000-8000-000000000003'),
('aa000000-0000-4000-8000-000000000004','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000012','a3000000-0000-4000-8000-000000000001','Call_3','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000005','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','a3000000-0000-4000-8000-000000000001','Call_4','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000006','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000001','Call_5','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000007','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000001','Call_6','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000008','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000008','a3000000-0000-4000-8000-000000000001','Call_7','85000000-0000-4000-8000-000000000005'),
('aa000000-0000-4000-8000-000000000009','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a3000000-0000-4000-8000-000000000001','Call_8','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000010','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000017','a3000000-0000-4000-8000-000000000001','Call_9','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000011','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000016','a3000000-0000-4000-8000-000000000001','Call_10','85000000-0000-4000-8000-000000000010'),
('aa000000-0000-4000-8000-000000000012','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000001','Call_11','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000013','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000002','Task_0','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000014','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000002','Task_1','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000015','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000002','Task_2','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000016','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000002','Task_3','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000017','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000002','Task_4','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000018','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_5','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000019','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000002','Task_6','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000020','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','Task_7','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000021','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000002','Task_8','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000022','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000003','Task_0','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000023','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000003','Task_1','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000024','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000012','a3000000-0000-4000-8000-000000000003','Task_2','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000025','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000003','Task_3','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000026','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000005','a3000000-0000-4000-8000-000000000003','Task_4','85000000-0000-4000-8000-000000000003'),
('aa000000-0000-4000-8000-000000000027','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000003','Task_5','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000028','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000003','Task_6','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000029','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000003','Task_7','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000030','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000003','Task_8','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000031','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000005','a3000000-0000-4000-8000-000000000004','Task_0','85000000-0000-4000-8000-000000000003'),
('aa000000-0000-4000-8000-000000000032','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000005','a3000000-0000-4000-8000-000000000004','Task_1','85000000-0000-4000-8000-000000000003'),
('aa000000-0000-4000-8000-000000000033','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000014','a3000000-0000-4000-8000-000000000004','Task_2','85000000-0000-4000-8000-000000000009'),
('aa000000-0000-4000-8000-000000000034','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000004','Task_3','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000035','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000004','Task_4','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000036','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a3000000-0000-4000-8000-000000000004','Task_5','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000037','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000005','a3000000-0000-4000-8000-000000000004','Task_6','85000000-0000-4000-8000-000000000003'),
('aa000000-0000-4000-8000-000000000038','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000004','Task_7','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000039','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000004','Task_8','85000000-0000-4000-8000-000000000003'),
('aa000000-0000-4000-8000-000000000040','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000012','a3000000-0000-4000-8000-000000000005','Task_0','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000041','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000012','a3000000-0000-4000-8000-000000000005','Task_1','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000042','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000012','a3000000-0000-4000-8000-000000000005','Task_2','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000043','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000005','Task_3','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000044','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000012','a3000000-0000-4000-8000-000000000005','Task_4','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000045','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000012','a3000000-0000-4000-8000-000000000005','Task_5','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000046','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000012','a3000000-0000-4000-8000-000000000005','Task_6','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000047','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000005','Task_7','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000048','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000015','a3000000-0000-4000-8000-000000000006','Task_0','85000000-0000-4000-8000-000000000010'),
('aa000000-0000-4000-8000-000000000049','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000006','Task_1','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000050','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','a3000000-0000-4000-8000-000000000006','Task_2','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000051','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000006','Task_3','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000052','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000006','Task_4','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000053','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','a3000000-0000-4000-8000-000000000006','Task_5','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000054','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000006','Task_6','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000055','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000015','a3000000-0000-4000-8000-000000000006','Task_7','85000000-0000-4000-8000-000000000010'),
('aa000000-0000-4000-8000-000000000056','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000006','Task_8','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000057','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000007','Task_0','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000058','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000007','Task_1','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000059','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','a3000000-0000-4000-8000-000000000007','Task_2','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000060','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000007','Task_3','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000061','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000007','Task_4','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000062','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','a3000000-0000-4000-8000-000000000007','Task_5','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000063','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a3000000-0000-4000-8000-000000000007','Task_6','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000064','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000008','Task_0','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000065','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a3000000-0000-4000-8000-000000000008','Task_1','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000066','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a3000000-0000-4000-8000-000000000008','Task_2','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000067','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000008','a3000000-0000-4000-8000-000000000008','Task_3','85000000-0000-4000-8000-000000000005'),
('aa000000-0000-4000-8000-000000000068','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000008','Task_4','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000069','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000008','Task_5','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000070','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a3000000-0000-4000-8000-000000000008','Task_6','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000071','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','a3000000-0000-4000-8000-000000000008','Task_7','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000072','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000009','Task_0','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000073','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000009','Task_1','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000074','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000009','Task_2','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000075','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000014','a3000000-0000-4000-8000-000000000009','Task_3','85000000-0000-4000-8000-000000000009'),
('aa000000-0000-4000-8000-000000000076','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000009','Task_4','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000077','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000008','a3000000-0000-4000-8000-000000000009','Task_5','85000000-0000-4000-8000-000000000005'),
('aa000000-0000-4000-8000-000000000078','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000009','Task_6','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000079','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000008','a3000000-0000-4000-8000-000000000009','Task_7','85000000-0000-4000-8000-000000000005'),
('aa000000-0000-4000-8000-000000000080','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000008','a3000000-0000-4000-8000-000000000010','Task_0','85000000-0000-4000-8000-000000000005'),
('aa000000-0000-4000-8000-000000000081','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000008','a3000000-0000-4000-8000-000000000010','Task_1','85000000-0000-4000-8000-000000000005'),
('aa000000-0000-4000-8000-000000000082','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000008','a3000000-0000-4000-8000-000000000010','Task_2','85000000-0000-4000-8000-000000000005'),
('aa000000-0000-4000-8000-000000000083','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000010','Task_3','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000084','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000010','Task_4','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000085','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000008','a3000000-0000-4000-8000-000000000010','Task_5','85000000-0000-4000-8000-000000000005'),
('aa000000-0000-4000-8000-000000000086','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000010','Task_6','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000087','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000008','a3000000-0000-4000-8000-000000000010','Task_7','85000000-0000-4000-8000-000000000005'),
('aa000000-0000-4000-8000-000000000088','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000010','Task_8','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000089','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000010','Task_9','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000090','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000011','Task_0','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000091','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000011','Task_1','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000092','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000011','Task_2','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000093','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000011','Task_3','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000094','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000011','Task_4','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000095','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000011','Task_5','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000096','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000011','Task_6','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000097','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000011','Task_7','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000098','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000012','Task_0','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000099','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000012','Task_1','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000100','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000012','Task_2','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000101','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000005','a3000000-0000-4000-8000-000000000012','Task_3','85000000-0000-4000-8000-000000000003'),
('aa000000-0000-4000-8000-000000000102','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000012','Task_4','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000103','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000012','Task_5','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000104','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000012','Task_6','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000105','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000012','Task_7','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000106','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000013','Task_0','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000107','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000008','a3000000-0000-4000-8000-000000000013','Task_1','85000000-0000-4000-8000-000000000005'),
('aa000000-0000-4000-8000-000000000108','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000013','Task_2','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000109','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000013','Task_3','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000110','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a3000000-0000-4000-8000-000000000013','Task_4','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000111','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000013','Task_5','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000112','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a3000000-0000-4000-8000-000000000013','Task_6','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000113','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000013','Task_7','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000114','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000013','Task_8','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000115','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a3000000-0000-4000-8000-000000000014','Task_0','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000116','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000017','a3000000-0000-4000-8000-000000000014','Task_1','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000117','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000017','a3000000-0000-4000-8000-000000000014','Task_2','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000118','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000014','Task_3','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000119','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000007','a3000000-0000-4000-8000-000000000014','Task_4','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000120','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','a3000000-0000-4000-8000-000000000014','Task_5','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000121','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a3000000-0000-4000-8000-000000000014','Task_6','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000122','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000017','a3000000-0000-4000-8000-000000000014','Task_7','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000123','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000014','Task_8','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000124','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000015','Task_3','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000125','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000015','Task_4','85000000-0000-4000-8000-000000000003'),
('aa000000-0000-4000-8000-000000000126','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000016','a3000000-0000-4000-8000-000000000016','Task_0','85000000-0000-4000-8000-000000000010'),
('aa000000-0000-4000-8000-000000000127','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000016','Task_1','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000128','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000016','a3000000-0000-4000-8000-000000000016','Task_2','85000000-0000-4000-8000-000000000010'),
('aa000000-0000-4000-8000-000000000129','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000016','Task_3','85000000-0000-4000-8000-000000000006'),
('aa000000-0000-4000-8000-000000000130','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000016','Task_4','85000000-0000-4000-8000-000000000003'),
('aa000000-0000-4000-8000-000000000131','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000016','a3000000-0000-4000-8000-000000000016','Task_5','85000000-0000-4000-8000-000000000010'),
('aa000000-0000-4000-8000-000000000132','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000016','a3000000-0000-4000-8000-000000000016','Task_6','85000000-0000-4000-8000-000000000010'),
('aa000000-0000-4000-8000-000000000133','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000016','a3000000-0000-4000-8000-000000000016','Task_7','85000000-0000-4000-8000-000000000010'),
('aa000000-0000-4000-8000-000000000134','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000017','Task_1','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000135','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000017','Task_2','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000136','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000017','Task_3','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000137','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000015','a3000000-0000-4000-8000-000000000017','Task_4','85000000-0000-4000-8000-000000000010'),
('aa000000-0000-4000-8000-000000000138','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000017','Task_5','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000139','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000017','Task_6','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000140','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000017','Task_7','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000141','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000014','a3000000-0000-4000-8000-000000000018','Task_0','85000000-0000-4000-8000-000000000009'),
('aa000000-0000-4000-8000-000000000142','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000004','a3000000-0000-4000-8000-000000000018','Task_1','85000000-0000-4000-8000-000000000002'),
('aa000000-0000-4000-8000-000000000143','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000018','Task_2','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000144','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000014','a3000000-0000-4000-8000-000000000018','Task_3','85000000-0000-4000-8000-000000000009'),
('aa000000-0000-4000-8000-000000000145','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000018','Task_4','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000146','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000014','a3000000-0000-4000-8000-000000000018','Task_5','85000000-0000-4000-8000-000000000009'),
('aa000000-0000-4000-8000-000000000147','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000013','a3000000-0000-4000-8000-000000000018','Task_6','85000000-0000-4000-8000-000000000008'),
('aa000000-0000-4000-8000-000000000148','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000014','a3000000-0000-4000-8000-000000000018','Task_7','85000000-0000-4000-8000-000000000009'),
('aa000000-0000-4000-8000-000000000149','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000019','Before_1','85000000-0000-4000-8000-000000000001'),
('aa000000-0000-4000-8000-000000000150','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000016','a3000000-0000-4000-8000-000000000022','Before_2','85000000-0000-4000-8000-000000000010')
('aa000000-0000-4000-8000-000000000151','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000006','a3000000-0000-4000-8000-000000000001','Call_12','85000000-0000-4000-8000-000000000004'),
('aa000000-0000-4000-8000-000000000152','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000010','a3000000-0000-4000-8000-000000000001','Call_13','85000000-0000-4000-8000-000000000007'),
('aa000000-0000-4000-8000-000000000153','demo-software','a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000011','a3000000-0000-4000-8000-000000000001','Call_14','85000000-0000-4000-8000-000000000007')
ON CONFLICT ("positionId","resourceId","taskId","blockId") DO NOTHING;

COMMIT;

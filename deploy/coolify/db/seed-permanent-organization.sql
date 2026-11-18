-- Idempotent permanent-organization demo fixture.
-- Run only in a dedicated demo/test database after 20261118_v3_permanent_organization.sql.
-- The authenticated demo user is injected by psql; no real employee identities are embedded.

INSERT INTO organization_positions (id, "createdBy", code, title, description, "functionId", active) VALUES
 ('81000000-0000-4000-8000-000000000001','demo-seed','ORG-DG','Direction générale','Définit les orientations, arbitre les priorités et valide les capacités.',NULL,TRUE),
 ('81000000-0000-4000-8000-000000000002','demo-seed','ORG-DO','Direction des opérations','Pilote les opérations, les ressources et la livraison.',(SELECT id FROM job_functions WHERE code='DO'),TRUE),
 ('81000000-0000-4000-8000-000000000003','demo-seed','ORG-DT','Direction technique','Garantit les choix techniques, les compétences et la qualité.',(SELECT id FROM job_functions WHERE code='DT'),TRUE),
 ('81000000-0000-4000-8000-000000000004','demo-seed','ORG-CDP','Chef de projet','Coordonne les projets, les engagements et les arbitrages opérationnels.',(SELECT id FROM job_functions WHERE code='CDP'),TRUE),
 ('81000000-0000-4000-8000-000000000005','demo-seed','ORG-RH','Responsable ressources humaines','Coordonne le recrutement, les compétences et le développement des personnes.',NULL,TRUE),
 ('81000000-0000-4000-8000-000000000006','demo-seed','ORG-DEVLEAD','Responsable développement','Organise la réalisation logicielle et accompagne les développeurs.',(SELECT id FROM job_functions WHERE code='TL'),TRUE),
 ('81000000-0000-4000-8000-000000000007','demo-seed','ORG-DEV','Ingénieur développement','Conçoit, réalise et maintient les composants logiciels.',(SELECT id FROM job_functions WHERE code='DEV'),TRUE),
 ('81000000-0000-4000-8000-000000000008','demo-seed','ORG-QA','Responsable qualité','Organise les contrôles et la validation des livrables.',(SELECT id FROM job_functions WHERE code='QUAL'),TRUE),
 ('81000000-0000-4000-8000-000000000009','demo-seed','ORG-POBA','Responsable produit et exigences','Porte les besoins métier, les exigences et la priorisation du produit.',(SELECT id FROM job_functions WHERE code='POBA'),TRUE),
 ('81000000-0000-4000-8000-000000000010','demo-seed','ORG-ARCH','Architecte logiciel et système','Définit l''architecture, les interfaces et les exigences non fonctionnelles.',(SELECT id FROM job_functions WHERE code='ARCH'),TRUE),
 ('81000000-0000-4000-8000-000000000011','demo-seed','ORG-IVV','Ingénieur intégration, vérification et validation','Intègre la solution et démontre sa conformité aux exigences.',(SELECT id FROM job_functions WHERE code='IVV'),TRUE),
 ('81000000-0000-4000-8000-000000000012','demo-seed','ORG-DEVOPS','Ingénieur DevOps et mise en production','Industrialise la chaîne CI/CD, les environnements et les déploiements.',(SELECT id FROM job_functions WHERE code='DEVOPS'),TRUE),
 ('81000000-0000-4000-8000-000000000013','demo-seed','ORG-SYS','Ingénieur systèmes et intégration','Assure l''interopérabilité et l''intégration dans l''environnement cible.',(SELECT id FROM job_functions WHERE code='SYS'),TRUE),
 ('81000000-0000-4000-8000-000000000014','demo-seed','ORG-UX','Designer UX/UI','Conçoit les parcours et interfaces centrés sur les utilisateurs.',(SELECT id FROM job_functions WHERE code='UX'),TRUE),
 ('81000000-0000-4000-8000-000000000015','demo-seed','ORG-SEC','Ingénieur sécurité applicative','Intègre la sécurité dans la conception et le cycle de développement.',(SELECT id FROM job_functions WHERE code='SEC'),TRUE),
 ('81000000-0000-4000-8000-000000000016','demo-seed','ORG-DATA','Ingénieur données et bases de données','Conçoit et maintient les modèles, traitements et stockages de données.',(SELECT id FROM job_functions WHERE code='DATA'),TRUE),
 ('81000000-0000-4000-8000-000000000017','demo-seed','ORG-SM','Facilitateur agile','Facilite la collaboration, les rituels et l''amélioration continue.',(SELECT id FROM job_functions WHERE code='SM'),TRUE)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code,title=EXCLUDED.title,description=EXCLUDED.description,"functionId"=EXCLUDED."functionId",active=TRUE;

-- One active assignment gives the demo login a personal organization context.
INSERT INTO organization_assignments (id, "createdBy", "positionId", "userId", "startDate", "endDate", note) VALUES
 ('82000000-0000-4000-8000-000000000001','demo-seed','81000000-0000-4000-8000-000000000001',:'demo_user',DATE '2026-01-01',NULL,'Affectation de démonstration — utilisateur connecté'),
 ('82000000-0000-4000-8000-000000000002','demo-seed','81000000-0000-4000-8000-000000000004',:'demo_user',DATE '2024-01-01',DATE '2025-12-31','Affectation historique de démonstration')
ON CONFLICT (id) DO UPDATE SET
 "positionId"=EXCLUDED."positionId", "userId"=EXCLUDED."userId",
 "startDate"=EXCLUDED."startDate", "endDate"=EXCLUDED."endDate", note=EXCLUDED.note;

INSERT INTO organization_position_relations (id, "createdBy", "parentPositionId", "childPositionId", "sortOrder") VALUES
 ('83000000-0000-4000-8000-000000000001','demo-seed','81000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000002',1),
 ('83000000-0000-4000-8000-000000000002','demo-seed','81000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000003',2),
 ('83000000-0000-4000-8000-000000000003','demo-seed','81000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000004',1),
 ('83000000-0000-4000-8000-000000000004','demo-seed','81000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000005',2),
 ('83000000-0000-4000-8000-000000000005','demo-seed','81000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000006',1),
 ('83000000-0000-4000-8000-000000000006','demo-seed','81000000-0000-4000-8000-000000000006','81000000-0000-4000-8000-000000000007',1),
 ('83000000-0000-4000-8000-000000000007','demo-seed','81000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000008',2),
 ('83000000-0000-4000-8000-000000000008','demo-seed','81000000-0000-4000-8000-000000000004','81000000-0000-4000-8000-000000000009',1),
 ('83000000-0000-4000-8000-000000000009','demo-seed','81000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000010',3),
 ('83000000-0000-4000-8000-000000000010','demo-seed','81000000-0000-4000-8000-000000000008','81000000-0000-4000-8000-000000000011',1),
 ('83000000-0000-4000-8000-000000000011','demo-seed','81000000-0000-4000-8000-000000000006','81000000-0000-4000-8000-000000000012',2),
 ('83000000-0000-4000-8000-000000000012','demo-seed','81000000-0000-4000-8000-000000000010','81000000-0000-4000-8000-000000000013',1),
 ('83000000-0000-4000-8000-000000000013','demo-seed','81000000-0000-4000-8000-000000000009','81000000-0000-4000-8000-000000000014',1),
 ('83000000-0000-4000-8000-000000000014','demo-seed','81000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000015',4),
 ('83000000-0000-4000-8000-000000000015','demo-seed','81000000-0000-4000-8000-000000000010','81000000-0000-4000-8000-000000000016',2),
 ('83000000-0000-4000-8000-000000000016','demo-seed','81000000-0000-4000-8000-000000000004','81000000-0000-4000-8000-000000000017',2)
ON CONFLICT (id) DO UPDATE SET "parentPositionId"=EXCLUDED."parentPositionId","childPositionId"=EXCLUDED."childPositionId","sortOrder"=EXCLUDED."sortOrder";

-- Sanity checks fail the deployment migration step rather than silently leaving a partial fixture.
SELECT set_config('demo.demo_user', :'demo_user', false);

DO $seed$
BEGIN
  IF (SELECT count(*) FROM organization_positions WHERE id BETWEEN
      '81000000-0000-4000-8000-000000000001'::uuid AND
      '81000000-0000-4000-8000-000000000017'::uuid) <> 17 THEN
    RAISE EXCEPTION 'Organization demo fixture: expected 17 permanent positions';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM organization_assignments
    WHERE id='82000000-0000-4000-8000-000000000001'::uuid
      AND "userId"=current_setting('demo.demo_user') AND "endDate" IS NULL) THEN
    RAISE EXCEPTION 'Organization demo fixture: active demo assignment missing';
  END IF;
END $seed$;

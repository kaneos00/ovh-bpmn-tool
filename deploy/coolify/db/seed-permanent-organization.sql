-- Idempotent permanent-organization demo fixture.
-- Run only in a dedicated demo/test database after 20261118_v3_permanent_organization.sql.
-- The authenticated demo user is injected by psql; no real employee identities are embedded.

INSERT INTO organization_positions (id, "createdBy", code, title, description, "functionId", active) VALUES
 ('81000000-0000-4000-8000-000000000001','demo-seed','ORG-DG','Direction générale','Définit les orientations, arbitre les priorités et valide les capacités.',NULL,TRUE),
 ('81000000-0000-4000-8000-000000000002','demo-seed','ORG-DO','Direction des opérations','Pilote les opérations, les ressources et la livraison.',NULL,TRUE),
 ('81000000-0000-4000-8000-000000000003','demo-seed','ORG-DT','Direction technique','Garantit les choix techniques, les compétences et la qualité.',NULL,TRUE),
 ('81000000-0000-4000-8000-000000000004','demo-seed','ORG-CDP','Chef de projet','Coordonne les projets, les engagements et les arbitrages opérationnels.',NULL,TRUE),
 ('81000000-0000-4000-8000-000000000005','demo-seed','ORG-RH','Responsable ressources humaines','Coordonne le recrutement, les compétences et le développement des personnes.',NULL,TRUE),
 ('81000000-0000-4000-8000-000000000006','demo-seed','ORG-DEVLEAD','Responsable développement','Organise la réalisation logicielle et accompagne les développeurs.',NULL,TRUE),
 ('81000000-0000-4000-8000-000000000007','demo-seed','ORG-DEV','Développeur','Conçoit, réalise et maintient les composants logiciels.',NULL,TRUE),
 ('81000000-0000-4000-8000-000000000008','demo-seed','ORG-QA','Responsable qualité','Organise les contrôles et la validation des livrables.',NULL,TRUE)
ON CONFLICT (id) DO UPDATE SET
 code=EXCLUDED.code, title=EXCLUDED.title, description=EXCLUDED.description, active=EXCLUDED.active;

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
 ('83000000-0000-4000-8000-000000000007','demo-seed','81000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000008',2)
ON CONFLICT (id) DO UPDATE SET
 "parentPositionId"=EXCLUDED."parentPositionId",
 "childPositionId"=EXCLUDED."childPositionId", "sortOrder"=EXCLUDED."sortOrder";

-- Sanity checks fail the deployment migration step rather than silently leaving a partial fixture.
DO $$
BEGIN
  IF (SELECT count(*) FROM organization_positions WHERE id BETWEEN
      '81000000-0000-4000-8000-000000000001'::uuid AND
      '81000000-0000-4000-8000-000000000008'::uuid) <> 8 THEN
    RAISE EXCEPTION 'Organization demo fixture: expected 8 permanent positions';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM organization_assignments
    WHERE id='82000000-0000-4000-8000-000000000001'::uuid
      AND "userId"=:'demo_user' AND "endDate" IS NULL) THEN
    RAISE EXCEPTION 'Organization demo fixture: active demo assignment missing';
  END IF;
END $$;

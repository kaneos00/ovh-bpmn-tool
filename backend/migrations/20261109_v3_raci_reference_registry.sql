-- RACI Governance Lot 1: reference actors, local mappings and append-only events.
-- This migration is additive. It does not modify existing RACI actor or matrix rows.
-- The current application instance is the organizational boundary; there is no
-- organization/tenant identifier in the V3 data model.

CREATE TABLE IF NOT EXISTS raci_reference_actors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  name varchar(255) NOT NULL,
  "normalizedName" varchar(255) NOT NULL,
  "actorType" varchar(32) NOT NULL
    CHECK ("actorType" IN ('person', 'function', 'service', 'external_organization', 'unknown')),
  description text NULL,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT raci_reference_actors_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT raci_reference_actors_normalized_name_not_blank CHECK (btrim("normalizedName") <> '')
);

CREATE INDEX IF NOT EXISTS raci_reference_actors_normalized_name_idx
  ON raci_reference_actors ("normalizedName");
CREATE INDEX IF NOT EXISTS raci_reference_actors_type_active_idx
  ON raci_reference_actors ("actorType", active);

CREATE TABLE IF NOT EXISTS raci_actor_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "localActorId" uuid NOT NULL
    REFERENCES project_raci_actors(id) ON DELETE RESTRICT,
  "referenceActorId" uuid NOT NULL
    REFERENCES raci_reference_actors(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS raci_actor_mappings_one_active_local_idx
  ON raci_actor_mappings ("localActorId")
  WHERE active = true;
CREATE INDEX IF NOT EXISTS raci_actor_mappings_reference_active_idx
  ON raci_actor_mappings ("referenceActorId", active);

CREATE TABLE IF NOT EXISTS raci_actor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdBy" varchar(64) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "eventType" varchar(40) NOT NULL
    CHECK ("eventType" IN (
      'reference_actor.created',
      'reference_actor.updated',
      'actor_mapping.created'
    )),
  "referenceActorId" uuid NULL
    REFERENCES raci_reference_actors(id) ON DELETE RESTRICT,
  "localActorId" uuid NULL
    REFERENCES project_raci_actors(id) ON DELETE RESTRICT,
  "mappingId" uuid NULL
    REFERENCES raci_actor_mappings(id) ON DELETE RESTRICT,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS raci_actor_events_reference_created_idx
  ON raci_actor_events ("referenceActorId", "createdAt");
CREATE INDEX IF NOT EXISTS raci_actor_events_mapping_created_idx
  ON raci_actor_events ("mappingId", "createdAt");

-- Deliberately no backfill: identical labels are candidates, not proof of identity.
-- Existing project_raci_actors and project_raci_entries remain unchanged.

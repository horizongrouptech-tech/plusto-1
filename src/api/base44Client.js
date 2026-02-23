import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import * as entities from './entities';

const { appId, serverUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});

// Step 4 — Replace the entity layer.
// Override base44.entities with Supabase-backed implementations.
// All call sites (base44.entities.X.filter/list/get/create/update/delete/bulkCreate)
// continue to work with zero changes. base44.auth is intentionally left untouched
// until Step 3 (auth migration) is complete.
base44.entities = entities;

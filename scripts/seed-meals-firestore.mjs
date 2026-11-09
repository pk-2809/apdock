#!/usr/bin/env node
/**
 * Seed Meals to Firestore
 * ───────────────────────
 * Reads a JSON file containing an array of MealDocument objects
 * and writes each to /meals/{id} in Firestore using the Google/Firebase credentials.
 *
 * Usage:
 *   node scripts/seed-meals-firestore.mjs [path-to-meals.json]
 *   npm run seed:meals
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { execSync } from 'node:child_process';

const DEFAULT_JSON_PATH = 'meals.json';

function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
  // 1. Try Firebase CLI configstore
  try {
    if (fs.existsSync(configPath)) {
      let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const isExpired = !config.tokens?.expires_at || config.tokens.expires_at < Date.now() + 60000;
      if (isExpired && config.tokens?.refresh_token) {
        try {
          execSync('npx -y firebase-tools projects:list', { stdio: 'ignore' });
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch {}
      }
      if (config.tokens && config.tokens.access_token) {
        return config.tokens.access_token;
      }
    }
  } catch {}

  // 2. Try GOOGLE_OAUTH_ACCESS_TOKEN env var
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) {
    return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  }

  return null;
}

async function main() {
  const targetFile = process.argv[2] || DEFAULT_JSON_PATH;
  const fullPath = path.resolve(process.cwd(), targetFile);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Meals JSON file not found at: ${fullPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(fullPath, 'utf8');
  const mealsData = JSON.parse(raw);

  if (!Array.isArray(mealsData) || mealsData.length === 0) {
    console.error('❌ Meals JSON must contain a non-empty array of meals.');
    process.exit(1);
  }

  console.log(`\n📋 Loaded ${mealsData.length} meals from ${path.basename(fullPath)}`);

  const token = getAccessToken();
  if (!token) {
    console.error('❌ Could not locate Firebase CLI credentials. Please run `npx firebase-tools login`.');
    process.exit(1);
  }

  console.log('🚀 Syncing meals to Firestore collection /meals on project apdock...');

  let successCount = 0;
  for (const meal of mealsData) {
    if (!meal.id) {
      console.warn('⚠️ Skipping meal without id:', meal);
      continue;
    }

    const fields = {
      id: { stringValue: meal.id },
      name: { stringValue: meal.name },
      category: { stringValue: meal.category || 'breakfast' },
      mealRole: { stringValue: meal.mealRole || 'main' },
      dietType: { stringValue: meal.dietType || 'vegetarian' },
      goals: {
        arrayValue: (Array.isArray(meal.goals) && meal.goals.length > 0)
          ? { values: meal.goals.map(g => ({ stringValue: String(g) })) }
          : {}
      },
      ingredients: {
        arrayValue: (Array.isArray(meal.ingredients) && meal.ingredients.length > 0)
          ? { values: meal.ingredients.map(i => ({ stringValue: String(i) })) }
          : {}
      },
      day: {
        arrayValue: (Array.isArray(meal.day) && meal.day.length > 0)
          ? { values: meal.day.map(d => ({ stringValue: String(d) })) }
          : {}
      }
    };

    const body = JSON.stringify({ fields });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'firestore.googleapis.com',
        path: `/v1/projects/apdock/databases/(default)/documents/meals/${encodeURIComponent(meal.id)}`,
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, res => {
        let respData = '';
        res.on('data', chunk => respData += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: respData }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (result.status === 200) {
      successCount++;
      process.stdout.write(`✔ [${successCount}/${mealsData.length}] /meals/${meal.id}\n`);
    } else {
      console.error(`❌ Failed to upsert ${meal.id}, HTTP status: ${result.status}, response: ${result.data}`);
    }
  }

  console.log(`\n🎉 Successfully synced all ${successCount}/${mealsData.length} meals to Firestore!\n`);
}

main().catch(err => {
  console.error('Fatal error during sync:', err);
  process.exit(1);
});

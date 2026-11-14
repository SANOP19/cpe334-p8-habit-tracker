/**
 * verify-nfr04-restart.cjs
 *
 * Verifies NFR-04: Data survives an application restart.
 * 1. Checks and builds server/dist if missing.
 * 2. Uses dedicated account nfr04-restart@example.test (demo data untouched).
 * 3. Uses today's date in Asia/Bangkok dynamically (always valid in back-dating window).
 * 4. Spawns an isolated server process on PORT=3009.
 * 5. Signs in via POST /api/auth/login and creates an activity entry via HTTP POST.
 * 6. Gracefully kills the server process and verifies it has terminated (connection refused).
 * 7. Spawns a new server process on PORT=3009.
 * 8. Reads the activity entry back via HTTP GET /api/goals/:id/entries.
 * 9. Asserts exact data match (value, note, date) and cleans up dedicated test account.
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const repoRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(repoRoot, 'server', '.env') });

const PORT = 3009;
const PASSWORD = process.env.SEED_PARTICIPANT_PASSWORD;
if (!PASSWORD) {
  console.error('ERROR: SEED_PARTICIPANT_PASSWORD is not set in server/.env');
  process.exit(1);
}

// Ensure server/dist/index.js is built
const distIndex = path.join(repoRoot, 'server', 'dist', 'index.js');
if (!fs.existsSync(distIndex)) {
  console.log('[Setup] Compiling server TypeScript (server/dist/index.js not found)...');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execSync(`${npmCmd} run build:server`, { cwd: repoRoot, stdio: 'inherit' });
}

const { PrismaClient } = require(path.join(repoRoot, 'server', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

const NFR04_EMAIL = 'nfr04-restart@example.test';
const NFR04_NAME = 'NFR04 Student';

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json || data
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function waitForHealth(maxWaitMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await httpRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/health',
        method: 'GET',
        timeout: 1000
      });
      if (res.statusCode === 200) return true;
    } catch (_) {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Server on port ${PORT} failed to start within ${maxWaitMs}ms`);
}

function killProcess(proc) {
  if (!proc || proc.killed) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } catch (_) {}
  } else {
    proc.kill('SIGKILL');
  }
}

async function run() {
  console.log('================================================================');
  console.log('NFR-04 Verification: Application Restart & Data Persistence');
  console.log('================================================================');

  let server1 = null;
  let server2 = null;
  let nfr04UserId = null;

  try {
    // -------------------------------------------------------------------------
    // Phase 0: Provision dedicated test account (preserves seeded participant demo data)
    // -------------------------------------------------------------------------
    console.log('[Phase 0] Setting up dedicated test account ' + NFR04_EMAIL + '...');
    const seedUser = await prisma.user.findUnique({ where: { email: 'participant@example.test' } });
    if (!seedUser) {
      throw new Error('Base seed user participant@example.test not found. Run "npm run seed" first.');
    }

    const user = await prisma.user.upsert({
      where: { email: NFR04_EMAIL },
      update: {
        passwordHash: seedUser.passwordHash,
        displayName: NFR04_NAME
      },
      create: {
        email: NFR04_EMAIL,
        passwordHash: seedUser.passwordHash,
        displayName: NFR04_NAME,
        role: seedUser.role
      }
    });
    nfr04UserId = user.id;

    // Clean up any prior goals/entries for this dedicated account only
    await prisma.activityEntry.deleteMany({ where: { goal: { participantId: nfr04UserId } } });
    await prisma.goal.deleteMany({ where: { participantId: nfr04UserId } });
    await prisma.session.deleteMany({ where: { userId: nfr04UserId } });

    // -------------------------------------------------------------------------
    // Phase 1: Start initial server instance on port 3009
    // -------------------------------------------------------------------------
    console.log(`[Phase 1] Starting initial backend server on port ${PORT}...`);
    const serverEnv = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'test'
    };

    server1 = spawn('node', ['server/dist/index.js'], {
      cwd: repoRoot,
      env: serverEnv,
      stdio: 'pipe'
    });

    await waitForHealth();
    console.log('[Phase 1] Initial server is UP and responding to /api/health.');

    // -------------------------------------------------------------------------
    // Phase 2: Sign in as dedicated test account
    // -------------------------------------------------------------------------
    console.log(`[Phase 2] Signing in as ${NFR04_EMAIL}...`);
    const loginRes = await httpRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: NFR04_EMAIL,
      password: PASSWORD
    });

    if (loginRes.statusCode !== 200) {
      throw new Error(`Sign in failed with status ${loginRes.statusCode}: ${JSON.stringify(loginRes.body)}`);
    }

    const cookieHeader = loginRes.headers['set-cookie'];
    if (!cookieHeader || cookieHeader.length === 0) {
      throw new Error('No session cookie returned in sign-in response');
    }
    const sessionCookie = cookieHeader[0].split(';')[0];
    console.log('[Phase 2] Signed in successfully. Session cookie obtained.');

    // -------------------------------------------------------------------------
    // Phase 3: Create active goal on Daily Reading
    // -------------------------------------------------------------------------
    console.log('[Phase 3] Setting up goal for dedicated test account...');
    const tmplRes = await httpRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/templates',
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });

    const template = tmplRes.body.templates.find(t => t.name === 'Daily Reading');
    if (!template) {
      throw new Error('Daily Reading template not found. Ensure templates are seeded.');
    }

    const createGoalRes = await httpRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/goals',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, {
      templateId: template.id,
      dailyTarget: 20
    });

    if (createGoalRes.statusCode !== 201) {
      throw new Error(`Failed to create goal: status ${createGoalRes.statusCode}: ${JSON.stringify(createGoalRes.body)}`);
    }
    const goalId = createGoalRes.body.goal.id;
    console.log(`[Phase 3] Created goal id ${goalId} for ${NFR04_EMAIL}.`);

    // -------------------------------------------------------------------------
    // Phase 4: Create activity entry using today's Bangkok date dynamically
    // -------------------------------------------------------------------------
    const testDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
    const testValue = 48;
    const testNote = `NFR-04 Restart Proof [${Date.now()}]`;

    console.log(`[Phase 4] Recording activity entry (date: ${testDate} Asia/Bangkok, value: ${testValue}, note: "${testNote}")...`);
    const postRes = await httpRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/goals/${goalId}/entries`,
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, {
      entryDate: testDate,
      value: testValue,
      note: testNote
    });

    if (postRes.statusCode !== 201) {
      throw new Error(`Failed to create entry: status ${postRes.statusCode}: ${JSON.stringify(postRes.body)}`);
    }
    console.log('[Phase 4] Activity entry created successfully (HTTP 201 Created).');

    // -------------------------------------------------------------------------
    // Phase 5: Stop the server process (simulate crash / reboot)
    // -------------------------------------------------------------------------
    console.log(`[Phase 5] Stopping server process (PID: ${server1.pid})...`);
    killProcess(server1);
    server1 = null;

    // Verify server is dead
    await new Promise(r => setTimeout(r, 1200));
    let serverDead = false;
    try {
      await httpRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/health',
        method: 'GET',
        timeout: 1000
      });
    } catch (_) {
      serverDead = true;
    }
    if (!serverDead) {
      throw new Error('Server process was expected to be stopped, but port is still open.');
    }
    console.log('[Phase 5] Confirmed: Server process is completely DOWN (connection refused).');

    // -------------------------------------------------------------------------
    // Phase 6: Start a brand-new server process instance
    // -------------------------------------------------------------------------
    console.log(`[Phase 6] Starting a NEW backend server process on port ${PORT}...`);
    server2 = spawn('node', ['server/dist/index.js'], {
      cwd: repoRoot,
      env: serverEnv,
      stdio: 'pipe'
    });

    await waitForHealth();
    console.log(`[Phase 6] New server process is UP and healthy (PID: ${server2.pid}).`);

    // -------------------------------------------------------------------------
    // Phase 7: Read back the persisted entry via HTTP GET
    // -------------------------------------------------------------------------
    console.log('[Phase 7] Reading back entries from the new server process...');
    const readRes = await httpRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/goals/${goalId}/entries`,
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });

    if (readRes.statusCode !== 200) {
      throw new Error(`Failed to read entries after restart: status ${readRes.statusCode}`);
    }

    const entries = readRes.body.entries;
    const matched = entries.find(e => e.note === testNote);

    if (!matched) {
      throw new Error(`Persisted entry with note "${testNote}" not found after application restart!`);
    }

    if (matched.value !== testValue || matched.entryDate !== testDate) {
      throw new Error(`Data mismatch: expected value ${testValue} on ${testDate}, got ${matched.value} on ${matched.entryDate}`);
    }

    console.log('[Phase 7] SUCCESS: Found persisted entry in PostgreSQL after complete server reboot:');
    console.log('         id:        ' + matched.id);
    console.log('         entryDate: ' + matched.entryDate);
    console.log('         value:     ' + matched.value);
    console.log('         note:      ' + matched.note);

    console.log('================================================================');
    console.log('NFR-04 VERIFIED: Data survives application shutdown and restart.');
    console.log('================================================================');
  } finally {
    if (server1) killProcess(server1);
    if (server2) killProcess(server2);
    if (nfr04UserId) {
      await prisma.activityEntry.deleteMany({ where: { goal: { participantId: nfr04UserId } } }).catch(() => {});
      await prisma.goal.deleteMany({ where: { participantId: nfr04UserId } }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId: nfr04UserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: nfr04UserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

run().catch(err => {
  console.error('\nNFR-04 VERIFICATION FAILED:', err);
  process.exit(1);
});

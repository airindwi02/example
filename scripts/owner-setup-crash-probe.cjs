/* eslint-disable @typescript-eslint/no-require-imports -- Test-only abrupt-exit probe, no source URL fallback. */
if (process.env.ALANA_OWNER_CRASH_PROBE !== 'isolated-test' || new URL(process.env.DATABASE_URL).pathname !== '/alana_owner_setup_test') process.exit(2);
const { prisma }=require('../lib/prisma.ts');
const { registerFirstOwner }=require('../lib/owner-setup-service.ts');
const trust=JSON.parse(process.env.ALANA_OWNER_TEST_TRUST);
const input=JSON.parse(process.env.ALANA_OWNER_TEST_INPUT);
registerFirstOwner(prisma,trust,trust.database,process.env.ALANA_OWNER_TEST_TOKEN,input,()=>process.exit(71)).catch(()=>process.exit(72));

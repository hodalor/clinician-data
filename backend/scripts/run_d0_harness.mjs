import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { spawn } from 'child_process';

const backendDir = resolve(process.cwd());
const repoDir = resolve(backendDir, '..');
const adminDir = join(repoDir, 'admin');
const mobileDir = join(repoDir, 'mobile');
const docsDir = join(repoDir, 'docs');
const backendReportPath = join(
  backendDir,
  'test-reports',
  'd0-backend-scenarios-report.md',
);
const fullReportPath = join(docsDir, 'd0-harness-report.md');

const results = [];

try {
  await runStep('Backend build', 'npm', ['run', 'build'], backendDir);
  await runStep('Admin build', 'npm', ['run', 'build'], adminDir);
  await runStep(
    'Mobile analyze',
    'bash',
    ['-lc', 'source ./use_local_flutter.sh && flutter analyze lib'],
    mobileDir,
  );
  await runStep(
    'Backend D0 harness',
    'node',
    [
      '--experimental-vm-modules',
      './node_modules/jest/bin/jest.js',
      '--config',
      './test/jest-e2e.json',
      '--runTestsByPath',
      './test/d0-pilot-harness.e2e-spec.ts',
      '--runInBand',
    ],
    backendDir,
  );

  const backendReport = await readFile(backendReportPath, 'utf8');
  await mkdir(docsDir, { recursive: true });
  await writeFile(
    fullReportPath,
    [
      '# D0 Full-Stack Harness Report',
      '',
      'Overall: PASS',
      '',
      ...results.map((entry) => `- PASS - ${entry}`),
      '',
      '## Backend Scenarios',
      '',
      backendReport.trim(),
      '',
    ].join('\n'),
    'utf8',
  );
} catch (error) {
  await mkdir(docsDir, { recursive: true });
  await writeFile(
    fullReportPath,
    [
      '# D0 Full-Stack Harness Report',
      '',
      'Overall: FAIL',
      '',
      ...results.map((entry) => `- PASS - ${entry}`),
      `- FAIL - ${error instanceof Error ? error.message : String(error)}`,
      '',
    ].join('\n'),
    'utf8',
  );
  process.exitCode = 1;
}

async function runStep(label, command, args, cwd) {
  await new Promise((resolveStep, rejectStep) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        results.push(label);
        resolveStep();
        return;
      }

      rejectStep(new Error(`${label} failed with exit code ${code ?? 1}`));
    });
    child.on('error', rejectStep);
  });
}

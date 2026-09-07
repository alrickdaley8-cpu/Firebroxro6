// Read-only preflight: never change or bypass repository/environment protections.
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function matchesBranchPolicy(branch, pattern) {
  // GitHub environment policies use slash-sensitive wildcard matching.
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const expression = escaped.replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${expression}$`).test(branch);
}

export function pagesBlockers(site, environment, policies, branch, protectedRef = false) {
  const blockers = [];
  if (site.build_type !== 'workflow') blockers.push('In Settings → Pages → Build and deployment, change Source to GitHub Actions.');
  const policy = environment?.deployment_branch_policy;
  if (policy?.protected_branches && !protectedRef) blockers.push(`The github-pages environment only allows protected branches; ${branch} is not protected.`);
  if (policy?.custom_branch_policies && !policies.some(rule => rule.type !== 'tag' && matchesBranchPolicy(branch, rule.name))) {
    blockers.push(`In Settings → Environments → github-pages → Deployment branches and tags, allow the branch ${branch}.`);
  }
  return blockers;
}

function github(path) {
  const result = spawnSync('gh', ['api', path], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'GitHub API could not be reached.');
  return JSON.parse(result.stdout);
}

function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const branch = process.env.GITHUB_REF_NAME;
  if (!repository || !branch) throw new Error('This preflight requires GITHUB_REPOSITORY and GITHUB_REF_NAME.');
  let blockers = [];
  const notes = [];
  let site;
  try { site = github(`repos/${repository}/pages`); }
  catch (error) { blockers.push(`The Pages configuration is unavailable. Enable GitHub Pages with GitHub Actions as its source, or restore the connection's Pages access. ${error.message}`); }
  if (site) {
    let environment = null;
    let policies = [];
    try {
      environment = github(`repos/${repository}/environments/github-pages`);
      if (environment.deployment_branch_policy?.custom_branch_policies) {
        policies = github(`repos/${repository}/environments/github-pages/deployment-branch-policies?per_page=100`).branch_policies;
      }
    } catch (error) {
      // Missing environments can be created by the standard deployment job. If an API
      // cannot be read, GitHub itself still enforces every configured protection rule.
      environment = null;
      notes.push(`Environment preflight unavailable; GitHub will enforce deployment protections: ${error.message}`);
    }
    blockers = pagesBlockers(site, environment, policies, branch, process.env.GITHUB_REF_PROTECTED === 'true');
  }
  const configured = blockers.length === 0;
  const result = configured ? 'Ready to deploy the verified production build.' : '**Not deployed: repository-owner setup is required.** The code build and browser tests passed; the published site has not been changed.';
  const summary = [
    '## GitHub Pages deployment', result, '',
    ...blockers.map(message => `- ${message}`),
    ...notes.map(message => `- ${message}`), '',
    `[Pages settings](https://github.com/${repository}/settings/pages) · [Environment settings](https://github.com/${repository}/settings/environments)`,
    configured ? '' : 'After updating both settings, re-run this workflow. No code changes or access tokens in the app are needed.',
  ].join('\n');
  console.log(summary);
  if (!configured) console.log('::warning title=GitHub Pages not published::Repository Pages/source or environment settings require owner action. See the job summary.');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `configured=${configured}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

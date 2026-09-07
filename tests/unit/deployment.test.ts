import { describe, expect, it } from 'vitest';
import { matchesBranchPolicy, pagesBlockers } from '../../scripts/check-pages.mjs';

const branch = 'arena/01a07d35-firebroxro6';
const restricted = { deployment_branch_policy: { custom_branch_policies: true, protected_branches: false } };

describe('GitHub Pages preflight', () => {
  it('does not publish raw Vite sources from a legacy branch deployment', () => {
    expect(pagesBlockers({ build_type: 'legacy' }, null, [], branch)).toEqual([
      'In Settings → Pages → Build and deployment, change Source to GitHub Actions.',
    ]);
  });
  it('does not bypass an environment restricted to a different branch', () => {
    const errors = pagesBlockers({ build_type: 'workflow' }, restricted, [{ type: 'branch', name: 'arena/older-session' }], branch);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(branch);
  });
  it('allows deployment only when source and branch permissions match', () => {
    expect(pagesBlockers({ build_type: 'workflow' }, restricted, [{ type: 'branch', name: branch }], branch)).toEqual([]);
  });
  it('does not treat a matching tag policy as branch permission', () => {
    expect(pagesBlockers({ build_type: 'workflow' }, restricted, [{ type: 'tag', name: branch }], branch)).toHaveLength(1);
  });
  it('respects protected-branch-only environments', () => {
    const environment = { deployment_branch_policy: { protected_branches: true, custom_branch_policies: false } };
    expect(pagesBlockers({ build_type: 'workflow' }, environment, [], branch, false)).toHaveLength(1);
    expect(pagesBlockers({ build_type: 'workflow' }, environment, [], branch, true)).toEqual([]);
  });
  it('matches simple policies without letting wildcards cross slashes', () => {
    expect(matchesBranchPolicy(branch, 'arena/*')).toBe(true);
    expect(matchesBranchPolicy(branch, '*')).toBe(false);
    expect(matchesBranchPolicy('release/v1.0', 'release/v1.0')).toBe(true);
    expect(matchesBranchPolicy('release/v110', 'release/v1.0')).toBe(false);
    expect(matchesBranchPolicy('main-extra', 'main')).toBe(false);
  });
});

import { execSync } from 'child_process';

try {
  // Get all unique hashes from reflog of origin/main
  const reflogOutput = execSync('git reflog show origin/main --format="%h"').toString();
  const hashes = Array.from(new Set(reflogOutput.split('\n').map(h => h.trim()).filter(Boolean)));
  
  console.log(`Found ${hashes.length} unique commit hashes in the origin/main push logs.`);
  
  const danglingHashes = [];
  for (const hash of hashes) {
    try {
      execSync(`git merge-base --is-ancestor ${hash} main`);
    } catch (e) {
      // If it returns non-zero, it is NOT an ancestor of main
      danglingHashes.push(hash);
    }
  }
  
  if (danglingHashes.length === 0) {
    console.log('All pushed commits are ancestors of the current HEAD. No commits/updates are missing!');
  } else {
    console.log('WARNING: Found dangling commits in origin/main reflog that are not in current main branch history:');
    for (const hash of danglingHashes) {
      try {
        const commitInfo = execSync(`git log -1 --oneline ${hash}`).toString().trim();
        console.log(` - ${commitInfo}`);
      } catch (e) {
        console.log(` - ${hash} (Failed to get commit info - might be pruned or unreachable)`);
      }
    }
  }
} catch (error) {
  console.error('Error executing check:', error);
}

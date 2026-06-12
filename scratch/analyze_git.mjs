import { execSync } from 'child_process';

const logOutput = execSync('git log --date=short --pretty=format:"%ad|%h|%s|%an"', { encoding: 'utf-8' });
const lines = logOutput.split('\n').filter(Boolean);

const days = {};

for (const line of lines) {
  const [date, hash, subject, author] = line.split('|');
  if (!days[date]) {
    days[date] = [];
  }
  days[date].push({ hash, subject, author });
}

// Print summary
console.log('--- GIT COMMIT SUMMARY BY DATE ---');
const sortedDates = Object.keys(days).sort((a, b) => new Date(b) - new Date(a));

for (const date of sortedDates) {
  console.log(`\nDate: ${date} (${days[date].length} commits)`);
  days[date].slice(0, 50).forEach(c => {
    console.log(`  [${c.hash}] ${c.subject} (${c.author})`);
  });
}

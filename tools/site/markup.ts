export function renderMarkup(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    if (!(key in vars)) {
      throw new Error(`Unknown placeholder: {{${key}}}`);
    }
    return vars[key];
  });
}

export function findPlaceholders(html: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const regex = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const key = match[1];
    if (!seen.has(key)) {
      seen.add(key);
      result.push(key);
    }
  }
  return result;
}

export function collectHrefs(html: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const regex = /href="([^"]*)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    if (!seen.has(href)) {
      seen.add(href);
      result.push(href);
    }
  }
  return result;
}

export function checkMarkup(html: string): string[] {
  const problems: string[] = [];

  // Check for placeholders still present
  const placeholders = findPlaceholders(html);
  for (const ph of placeholders) {
    problems.push(`placeholder {{${ph}}}`);
  }

  // Strip script and style blocks, then tags, to get visible text only
  const visibleText = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  // Find invented numbers: \d[\d,.]* followed within 3 words by users/achievements/tasks
  const numberRegex = /\d[\d,.]*/g;
  const reportedNumbers = new Set<string>();
  let numberMatch;
  while ((numberMatch = numberRegex.exec(visibleText)) !== null) {
    const number = numberMatch[0];
    if (reportedNumbers.has(number)) continue;

    const afterNumber = visibleText.substring(numberMatch.index + number.length);
    const words = afterNumber.match(/\b\w+\b/g) || [];
    const nextThreeWords = words.slice(0, 3).join(' ').toLowerCase();
    if (/\b(users|achievements|tasks)\b/.test(nextThreeWords)) {
      problems.push(`invented number: "${number}"`);
      reportedNumbers.add(number);
    }
  }

  // Check for relative hrefs
  const hrefs = collectHrefs(html);
  for (const href of hrefs) {
    if (!/^https?:\/\//.test(href) && !/^\//.test(href) && !/^#/.test(href)) {
      problems.push(`relative href: ${href}`);
    }
  }

  // Check for img without alt
  const imgRegex = /<img\s+([^>]*?)>/g;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const attrs = imgMatch[1];
    const srcMatch = /src="([^"]*)"/.exec(attrs);
    const src = srcMatch ? srcMatch[1] : '';
    const altMatch = /alt="([^"]*)"/i.exec(attrs);
    if (!altMatch || altMatch[1] === '') {
      problems.push(`img without alt: ${src}`);
    }
  }

  return problems;
}

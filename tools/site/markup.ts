export function renderMarkup(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const keyMissing = !(key in vars);
    if (keyMissing) {
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
    const keyNotSeen = !seen.has(key);
    if (keyNotSeen) {
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
    const hrefNotSeen = !seen.has(href);
    if (hrefNotSeen) {
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

  // Find invented numbers in single pass: number followed within 3 words by users/achievements/tasks
  const numberRegex = /(\d+(?:[,.]\d+)*)(?=\W+(?:\w+\W+){0,2}(?:users|achievements|tasks)\b)/gi;
  const reportedNumbers = new Set<string>();
  for (const match of visibleText.matchAll(numberRegex)) {
    const number = match[1];
    const numberNotReported = !reportedNumbers.has(number);
    if (numberNotReported) {
      problems.push(`invented number: "${number}"`);
      reportedNumbers.add(number);
    }
  }

  // Check for relative hrefs
  const hrefs = collectHrefs(html);
  for (const href of hrefs) {
    const isRelativeHref = !/^https?:\/\//.test(href) && !/^\//.test(href) && !/^#/.test(href);
    if (isRelativeHref) {
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
    const hasNoAlt = !altMatch || altMatch[1] === '';
    if (hasNoAlt) {
      problems.push(`img without alt: ${src}`);
    }
  }

  return problems;
}

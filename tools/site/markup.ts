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

  // Check for invented numbers (digit run followed within 3 words by users/achievements/tasks)
  const numberRegex = /\d+/g;
  let numberMatch;
  while ((numberMatch = numberRegex.exec(html)) !== null) {
    const afterNumber = html.substring(numberMatch.index + numberMatch[0].length);
    const words = afterNumber.match(/\b\w+\b/g) || [];
    const nextThreeWords = words.slice(0, 3).join(' ').toLowerCase();
    if (/\b(users|achievements|tasks)\b/.test(nextThreeWords)) {
      problems.push(`invented number: "${numberMatch[0]}"`);
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

export type SourceLanguage =
  | 'plain'
  | 'python'
  | 'markdown'
  | 'json'
  | 'javascript'
  | 'jsx'
  | 'typescript'
  | 'tsx';

export function getSourceLanguage(path: string): SourceLanguage {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith('.json')) {
    return 'json';
  }

  if (lowerPath.endsWith('.py')) {
    return 'python';
  }

  if (lowerPath.endsWith('.tsx')) {
    return 'tsx';
  }

  if (lowerPath.endsWith('.ts') || lowerPath.endsWith('.mts') || lowerPath.endsWith('.cts')) {
    return 'typescript';
  }

  if (lowerPath.endsWith('.jsx')) {
    return 'jsx';
  }

  if (lowerPath.endsWith('.js') || lowerPath.endsWith('.mjs') || lowerPath.endsWith('.cjs')) {
    return 'javascript';
  }

  if (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) {
    return 'markdown';
  }

  return 'plain';
}

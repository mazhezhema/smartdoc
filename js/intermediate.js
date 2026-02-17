/**
 * 中间表示：所有格式的转换都经过这个结构
 * { title: string, sections: { type: 'heading'|'paragraph', text: string }[] }
 */

/** 从纯文本生成中间表示（简单规则：短行当标题） */
export function textToIntermediate(text, title = '') {
  const lines = text.split(/\n/);
  const sections = [];
  let firstHeading = '';

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.length < 40 && !t.endsWith('。') && !t.endsWith('.') && !t.endsWith('，')) {
      sections.push({ type: 'heading', text: t });
      if (!firstHeading) firstHeading = t;
    } else {
      sections.push({ type: 'paragraph', text: t });
    }
  }

  return { title: title || firstHeading || 'Untitled', sections };
}

/** 中间表示 → 纯文本 */
export function intermediateToText(intermediate) {
  return intermediate.sections
    .map(s => {
      if (s.type === 'heading') return '\n' + s.text + '\n';
      return s.text;
    })
    .join('\n')
    .trim();
}

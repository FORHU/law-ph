export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    // Remove excessive or standalone quotation marks only
    .replace(/"{2,}/g, '')
    .replace(/^"(.+)"$/gm, '$1')
    .trim();
}

export function FormattedLegalText({ text }: { text: string }) {
  const rawBlocks = cleanText(text)
    .split(/\n{2,}/)
    .flatMap(block => {
      const trimmed = block.trim();
      if (!trimmed) return [];
      if (!trimmed.includes('\n') && trimmed.length > 300) {
        return trimmed
          .split(/(?<=[.?!])\s+(?=[A-Z"(])/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
      return [trimmed];
    });

  // Merge surname onto name ending with middle initial (e.g. "FERDINAND E." + "MARCOS ...")
  const blocks: string[] = [];
  for (let i = 0; i < rawBlocks.length; i++) {
    const current = rawBlocks[i];
    const next = rawBlocks[i + 1];
    if (next && /\b[A-Z]\.\s*$/.test(current)) {
      const surnameMatch = next.match(/^([A-Z]{2,})\b/);
      if (surnameMatch) {
        const surname = surnameMatch[1];
        const remainder = next.slice(surname.length).trim();
        blocks.push(current + ' ' + surname);
        if (remainder) blocks.push(remainder);
        i++;
        continue;
      }
    }
    blocks.push(current);
  }

  return (
    <>
      {blocks.map((block, i) => {
        const wordCount = block.trim().split(/\s+/).length;
        const isAllCaps = block === block.toUpperCase()
          && block.length >= 6
          && block.length < 120
          && wordCount >= 3
          && /[A-Z]/.test(block)
          && !/\b[A-Z]\.\s*$/.test(block);
        const isSectionHeader = /^(section|article|whereas|now therefore|be it enacted|republic act|resolved|ordered)\b/i.test(block);

        if (isAllCaps) {
          return (
            <h3 key={i} className="text-[#e9c176] font-bold text-sm uppercase tracking-widest pt-4 pb-1 border-b border-white/5">
              {block}
            </h3>
          );
        }
        if (isSectionHeader) {
          return (
            <p key={i} className="text-white font-semibold text-sm leading-relaxed">
              {block}
            </p>
          );
        }
        return (
          <p key={i} className="text-gray-400 text-sm leading-relaxed">
            {block}
          </p>
        );
      })}
    </>
  );
}

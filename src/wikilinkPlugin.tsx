
// Custom wikilinks plugin - browser compatible
const wikilinksPlugin = (md: any) => {
  // Regex to match [[link]] patterns
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;

  // Replace wikilinks in text
  md.core.ruler.push('wikilinks', (state: any) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'inline') {
        const inlineTokens = token.children || [];

        for (let j = 0; j < inlineTokens.length; j++) {
          const inlineToken = inlineTokens[j];

          if (inlineToken.type === 'text' && inlineToken.content) {
            const content = inlineToken.content;
            const matches = [...content.matchAll(wikilinkRegex)];

            if (matches.length > 0) {
              // Replace the text token with multiple tokens
              const newTokens = [];
              let lastIndex = 0;

              for (const match of matches) {
                // Add text before the wikilink
                if (match.index > lastIndex) {
                  const textToken = new state.Token('text', '', 0);
                  textToken.content = content.slice(lastIndex, match.index);
                  newTokens.push(textToken);
                }

                // Add the wikilink as a link
                const linkText = match[1];
                const linkOpen = new state.Token('link_open', 'a', 1);
                linkOpen.attrSet('href', '#');
                linkOpen.attrSet('data-wikilink', linkText);
                linkOpen.attrSet('class', 'eagle-wikilink');
                linkOpen.attrSet('title', `Search for "${linkText}" in Eagle`);

                const textToken = new state.Token('text', '', 0);
                textToken.content = linkText;

                const linkClose = new state.Token('link_close', 'a', -1);

                newTokens.push(linkOpen, textToken, linkClose);
                lastIndex = match.index + match[0].length;
              }

              // Add remaining text
              if (lastIndex < content.length) {
                const textToken = new state.Token('text', '', 0);
                textToken.content = content.slice(lastIndex);
                newTokens.push(textToken);
              }

              // Replace the original token with new tokens
              inlineTokens.splice(j, 1, ...newTokens);
              j += newTokens.length - 1;
            }
          }
        }
      }
    }
  });
};

export default wikilinksPlugin;
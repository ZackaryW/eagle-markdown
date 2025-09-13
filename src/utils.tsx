import MarkdownIt from "markdown-it";
import wikilinksPlugin from "./wikilinkPlugin";
import taskLists from "markdown-it-task-lists";

// MarkdownIt configuration and utilities
export const createMarkdownInstance = () => {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true
  });

  // Use the custom wikilinks plugin
  md.use(wikilinksPlugin);

  // Add task list support
  md.use(taskLists, { enabled: true });

  // Configure link rendering to handle relative URLs safely
  md.renderer.rules.link_open = function(tokens, idx, options) {
    const token = tokens[idx];

    if (token && token.attrGet) {
      const href = token.attrGet('href');
      const wikilink = token.attrGet('data-wikilink');

      if (href) {
        if (href === '/url' || href.startsWith('/url')) {
          // Replace placeholder URLs with empty href to prevent 404 errors
          token.attrSet('href', '#');
          token.attrSet('title', 'Replace with actual URL');
        } else if (wikilink) {
          // Handle wikilinks
          token.attrSet('href', '#');
          token.attrSet('data-wikilink-text', wikilink);
          token.attrSet('class', 'eagle-wikilink');
          token.attrSet('title', `Click to search for "${wikilink}" in Eagle`);
        }
      }
    }

    return md.renderer.renderToken(tokens, idx, options);
  };

  md.renderer.rules.image = function(tokens, idx, options) {
    const token = tokens[idx];
    const src = token.attrGet('src');
    if (src) {
      if (src === '/url' || src.startsWith('/url')) {
        // Replace placeholder image URLs with a placeholder
        token.attrSet('src', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNSAxMEwxMSAxNFYxMEgxNVoiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTE3IDhIMTdWMThIMTdWMjRIMTUuNVYyMEgxOFYxOEgxN1Y4Wk0xNSA4VjEySDEzVjgiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+');
        token.attrSet('alt', 'Replace with actual image URL');
      } else if (src.includes('localhost') && src.includes('/item?id=')) {
        // Handle Eagle localhost URLs by extracting item ID and using Eagle API
        try {
          const url = new URL(src);
          const itemId = url.searchParams.get('id');
          if (itemId) {
            // Mark this as an Eagle image that needs special handling
            token.attrSet('data-eagle-item-id', itemId);
            token.attrSet('class', 'eagle-image');
            // Set a placeholder initially - will be replaced by JavaScript
            token.attrSet('src', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNSAxMEwxMSAxNFYxMEgxNVoiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTE3IDhIMTdWMThIMTdWMjRIMTUuNVYyMEgxOFYxOEgxN1Y4Wk0xNSA4VjEySDEzVjgiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+');
          }
        } catch (error) {
          console.error('Error parsing Eagle image URL:', error);
          // Keep original src if parsing fails
        }
      }
    }
    return md.renderer.renderToken(tokens, idx, options);
  };

  return md;
};

// File operations utilities
export const loadFileContent = async (path: string): Promise<string> => {
  try {
    const response = await fetch(path);
    return await response.text();
  } catch (error) {
    console.error("Error loading file:", error);
    return "";
  }
};

export const saveFileContent = (filePath: string, content: string): Promise<void> => {
  return new Promise((resolve) => {
    // @ts-ignore
    if (window.require) {
      try {
        // @ts-ignore
        const fs = window.require("fs");
        fs.writeFile(filePath, content, (err: any) => {
          if (err) console.error("Error saving file:", err);
          resolve();
        });
      } catch (e) {
        console.error("Error saving file:", e);
        resolve();
      }
    } else {
      resolve();
    }
  });
};

// Debounced file writing utility
export const createDebouncedWriter = (filePath: string, delay: number = 500) => {
  let timeoutId: number | null = null;
  let writeLock = Promise.resolve();

  return (content: string) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (filePath) {
        // @ts-ignore
        if (window.require) {
          try {
            // @ts-ignore
            const fs = window.require("fs");
            // Chain writes using the lock
            writeLock = writeLock.then(() =>
              new Promise<void>((resolve) => {
                fs.readFile(filePath, 'utf8', (err: any, data: string) => {
                  if (!err && data === content) return resolve();
                  fs.writeFile(filePath, content, (err: any) => {
                    if (err) console.error("Error writing file:", err);
                    resolve();
                  });
                });
              })
            );
          } catch (e) {
            // fallback: do nothing
          }
        }
      }
    }, delay);
  };
};

// Storage utilities
export const loadThemePreference = (): "light" | "dark" => {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return (savedTheme === "dark" || savedTheme === "light")
    ? savedTheme as "light" | "dark"
    : (systemPrefersDark ? "dark" : "light");
};

export const saveThemePreference = (theme: "light" | "dark") => {
  localStorage.setItem("theme", theme);
};

export const loadViewPreference = (): "editor" | "preview" => {
  const savedView = localStorage.getItem("view");
  return (savedView === "editor" || savedView === "preview")
    ? savedView as "editor" | "preview"
    : "editor";
};

export const saveViewPreference = (view: "editor" | "preview") => {
  localStorage.setItem("view", view);
};

// Wikilink utilities
export const handleWikilinkClick = async (wikilinkText: string) => {
  console.log('Searching for wikilink:', wikilinkText);
  try {
    // @ts-ignore
    if (window.eagle && window.eagle.item) {
      // @ts-ignore
      const items = await window.eagle.item.get({
        keywords: [wikilinkText.trim()],
        limit: 1
      });
      console.log('Search results:', items);

      if (items && items.length > 0) {
        const item = items[0];
        console.log('Opening item:', item.id);
        // @ts-ignore
        await window.eagle.item.open(item.id, { window: true });
      } else {
        console.log(`No items found for "${wikilinkText}"`);
      }
    } else {
      console.log('Eagle API not available');
    }
  } catch (error) {
    console.error('Error handling wikilink click:', error);
  }
};

// Theme management utilities
export const applyTheme = (theme: "light" | "dark") => {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};
import React, { useState, useEffect, useRef } from "react";
import MarkdownIt from "markdown-it";
import wikilinksPlugin from "./wikilinkPlugin";
import taskLists from "markdown-it-task-lists";

interface MarkdownEditorProps {
  initialValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void | Promise<void>;
  showPreview?: boolean;
}

// Configure MarkdownIt with common options
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

const toolbarButtons = [
  { name: "bold", label: "B", action: (text: string, sel: [number, number]) => wrap(text, sel, "**", "**") },
  { name: "italic", label: "I", action: (text: string, sel: [number, number]) => wrap(text, sel, "*", "*") },
  { name: "heading", label: "H", action: (text: string, sel: [number, number]) => prepend(text, sel, "# ") },
  { name: "quote", label: ">", action: (text: string, sel: [number, number]) => prepend(text, sel, "> ") },
  { name: "ul", label: "•", action: (text: string, sel: [number, number]) => prepend(text, sel, "- ") },
  { name: "ol", label: "1.", action: (text: string, sel: [number, number]) => prepend(text, sel, "1. ") },
  { name: "link", label: "🔗", action: (text: string, sel: [number, number]) => wrap(text, sel, "[", "](https://example.com)") },
  { name: "image", label: "🖼️", action: (text: string, sel: [number, number]) => wrap(text, sel, "![", "](https://example.com/image.jpg)") },
  { name: "wikilink", label: "[[ ]]", action: (text: string, sel: [number, number]) => wrap(text, sel, "[[", "]]") },
];

function wrap(text: string, sel: [number, number], before: string, after: string) {
  return (
    text.slice(0, sel[0]) +
    before +
    text.slice(sel[0], sel[1]) +
    after +
    text.slice(sel[1])
  );
}
function prepend(text: string, sel: [number, number], prefix: string) {
  const lines = text.split("\n");
  const start = text.slice(0, sel[0]).split("\n").length - 1;
  const end = text.slice(0, sel[1]).split("\n").length - 1;
  for (let i = start; i <= end; i++) {
    lines[i] = prefix + lines[i];
  }
  return lines.join("\n");
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ initialValue = "", onChange, onBlur, showPreview = true }) => {
  const [value, setValue] = useState(initialValue);
  const [preview, setPreview] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPreview(md.render(value));
    if (onChange) onChange(value);
  }, [value, onChange]);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Handle clicks in preview (only wikilinks)
  useEffect(() => {
    if (previewRef.current) {
      const handleClick = (e: Event) => {
        const target = e.target as HTMLElement;

        // Handle wikilinks only
        if (target.classList.contains('eagle-wikilink')) {
          const wikilinkText = target.getAttribute('data-wikilink-text');
          if (wikilinkText) {
            e.preventDefault();
            handleWikilinkClick(wikilinkText);
          }
        }
      };

      const previewDiv = previewRef.current;
      previewDiv.addEventListener('click', handleClick);

      return () => {
        previewDiv.removeEventListener('click', handleClick);
      };
    }
  }, [value, onChange]);

  // Handle loading Eagle images after preview updates
  useEffect(() => {
    if (previewRef.current) {
      const eagleImages = previewRef.current.querySelectorAll('.eagle-image');
      eagleImages.forEach(async (img) => {
        const imgElement = img as HTMLImageElement;
        const itemId = imgElement.getAttribute('data-eagle-item-id');
        if (itemId && imgElement.src.includes('data:image/svg+xml')) {
          try {
            // @ts-ignore
            if (window.eagle && window.eagle.item) {
              // @ts-ignore
              const item = await window.eagle.item.getById(itemId);
              if (item && item.thumbnailURL) {
                imgElement.src = item.thumbnailURL;
              } else if (item && item.fileURL) {
                // Fallback to file URL if thumbnail not available
                imgElement.src = item.fileURL;
              }
            }
          } catch (error) {
            console.error('Error loading Eagle image:', error);
            // Keep the placeholder if loading fails
          }
        }
      });
    }
  }, [preview]);

  const handleToolbar = (action: (text: string, sel: [number, number]) => string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const sel: [number, number] = [el.selectionStart, el.selectionEnd];
    setValue(action(value, sel));
    setTimeout(() => {
      el.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Ctrl+Z (undo) and Ctrl+Y (redo) to work normally
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
      return; // Let browser handle it
    }

    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const indent = '    '; // 4 spaces for markdown

      if (e.shiftKey) {
        // Shift+Tab: unindent
        const lines = value.split('\n');
        const startLine = value.substring(0, start).split('\n').length - 1;
        const endLine = value.substring(0, end).split('\n').length - 1;

        for (let i = startLine; i <= endLine; i++) {
          if (lines[i].startsWith(indent)) {
            lines[i] = lines[i].substring(indent.length);
          } else if (lines[i].startsWith(' ')) {
            // Remove at least one space if no full indent
            lines[i] = lines[i].substring(1);
          }
        }

        const newValue = lines.join('\n');
        setValue(newValue);

        // Adjust selection
        const newStart = Math.max(0, start - (startLine === endLine ? indent.length : 0));
        const newEnd = Math.max(0, end - ((endLine - startLine + 1) * indent.length));
        setTimeout(() => {
          textarea.selectionStart = newStart;
          textarea.selectionEnd = newEnd;
          textarea.focus();
        }, 0);
      } else {
        // Tab: indent
        if (start === end) {
          // No selection: insert indent at cursor
          const newValue = value.substring(0, start) + indent + value.substring(end);
          setValue(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + indent.length;
            textarea.focus();
          }, 0);
        } else {
          // Selection: indent all selected lines
          const lines = value.split('\n');
          const startLine = value.substring(0, start).split('\n').length - 1;
          const endLine = value.substring(0, end).split('\n').length - 1;

          for (let i = startLine; i <= endLine; i++) {
            lines[i] = indent + lines[i];
          }

          const newValue = lines.join('\n');
          setValue(newValue);

          // Adjust selection to include the added indentation
          setTimeout(() => {
            textarea.selectionStart = start + indent.length;
            textarea.selectionEnd = end + ((endLine - startLine + 1) * indent.length);
            textarea.focus();
          }, 0);
        }
      }
      return;
    }

    // Handle other keys normally
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const newValue = (e.target as HTMLTextAreaElement).value;
    setValue(newValue);
  };

  const handleWikilinkClick = async (wikilinkText: string) => {
    try {
      // @ts-ignore
      if (window.eagle && window.eagle.item) {
        // @ts-ignore
        const items = await window.eagle.item.get({
          keywords: [wikilinkText.trim()],
          limit: 1
        });

        if (items && items.length > 0) {
          const item = items[0];
          // @ts-ignore
          await window.eagle.item.open(item.id);
        } else {
          console.log(`No items found for "${wikilinkText}"`);
        }
      }
    } catch (error) {
      console.error('Error handling wikilink click:', error);
    }
  };

  return (
    <div className="markdown-editor transition-all duration-300 h-full flex flex-col">
      <div className="toolbar flex gap-2 mb-2 flex-shrink-0">
        {toolbarButtons.map((btn) => (
          <button
            key={btn.name}
            type="button"
            className="btn btn-xs btn-outline"
            title={btn.name}
            onClick={() => handleToolbar(btn.action)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <div className="flex gap-4 h-full">
            <textarea
              ref={textareaRef}
              className="textarea textarea-bordered w-1/2 h-full bg-white text-black dark:bg-gray-800 dark:text-white dark:border-gray-600 resize-none"
              value={value}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              onBlur={onBlur}
            />
            <div
              ref={previewRef}
              className="preview w-1/2 h-full overflow-auto p-2 border rounded bg-white text-black dark:bg-gray-800 dark:text-white dark:border-gray-600 transition-all duration-300 markdown-preview"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="textarea textarea-bordered w-full h-full bg-white text-black dark:bg-gray-800 dark:text-white dark:border-gray-600 resize-none"
            value={value}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onBlur={onBlur}
          />
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;

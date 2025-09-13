import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import MarkdownEditor from "./MarkdownEditor";
import {
  createMarkdownInstance,
  loadFileContent,
  saveFileContent,
  createDebouncedWriter,
  loadThemePreference,
  saveThemePreference,
  loadViewPreference,
  saveViewPreference,
  handleWikilinkClick,
  applyTheme,
  loadFontSizePreference,
  saveFontSizePreference
} from "./utils";

// Create MarkdownIt instance using utility
const md = createMarkdownInstance();

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fileContent, setFileContent] = useState("");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'editor' | 'preview'>('editor');
  const [showSideBySide, setShowSideBySide] = useState(false);
  // Font size preference
  const [fontSize, setFontSize] = useState<number>(() => loadFontSizePreference());

  // Simulate Eagle API for theme and file loading
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get("path");
    setFilePath(path);

    // Initialize theme using utility
    const initialTheme = loadThemePreference();
    setTheme(initialTheme);

    // Initialize view mode using utility
    const initialView = loadViewPreference();
    setView(initialView);

    // Load locale data
    const loadLocale = async () => {
      try {
        // @ts-expect-error
        const currentLocale = window.eagle?.app?.locale || 'en';
        // i18next is already initialized by Eagle with our locale files
        // No need to manually load - just use the current locale
      } catch (error) {
        console.error('Error setting up locale:', error);
      }
    };
    loadLocale();

    if (path) {
      loadFileContent(path)
        .then((text) => {
          setFileContent(text);
          setIsLoading(false);
        })
        .catch(() => {
          setFileContent("");
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  // Apply and save font size preference
  useEffect(() => {
    saveFontSizePreference(fontSize);
  }, [fontSize]);

  // Handle plugin exit to save current content
  useEffect(() => {
    const handleExit = async () => {
      if (filePath && fileContent) {
        await saveFileContent(filePath, fileContent);
      }
    };

    // @ts-ignore
    if (window.eagle && window.eagle.event) {
      // @ts-ignore
      window.eagle.event.onPluginBeforeExit(handleExit);
    }

    // Note: Eagle API doesn't provide a way to remove listeners, so no cleanup needed
  }, [filePath, fileContent]);

  // Handle theme changes
  useEffect(() => {
    saveThemePreference(theme);
    applyTheme(theme);
  }, [theme]);

  // Handle view changes
  useEffect(() => {
    saveViewPreference(view);
  }, [view]);

  // Only write if content changed, and not on initial mount
  const didMount = useRef(false);

  // Create debounced writer using utility
  const debouncedWrite = useMemo(() => {
    if (filePath) {
      return createDebouncedWriter(filePath);
    }
    return () => {};
  }, [filePath]);

  // Immediate save function for manual saves
  const saveNow = useCallback(async (content: string) => {
    if (!filePath) return;
    await saveFileContent(filePath, content);
  }, [filePath]);

  const handleChange = (val: string) => {
    setFileContent((prev) => {
      if (prev === val) return prev;
      // Prevent write on initial mount
      if (!didMount.current) {
        didMount.current = true;
        return val;
      }
      debouncedWrite(val);
      return val;
    });
  };

  // Handle view switching with save
  const handleViewSwitch = async () => {
    // Save current content before switching views
    await saveNow(fileContent);
    const newView = view === 'editor' ? 'preview' : 'editor';
    setView(newView);
    // Reset side-by-side when switching to preview mode
    if (newView === 'preview') {
      setShowSideBySide(false);
    }
  };

  // Handle blur (clicking away) with save
  const handleEditorBlur = async () => {
    await saveNow(fileContent);
  };

  return (
    <div
      className="w-full h-screen p-4 bg-white text-black dark:bg-gray-900 dark:text-white transition-colors duration-300 flex flex-col"
    >
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex gap-2">
          {/* Font size controls */}
          <button
            className="btn btn-sm btn-outline"
            title="Decrease font size"
            onClick={() => setFontSize((s) => Math.max(10, s - 1))}
          >-
          </button>
          {/* Font size toggle */}
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setFontSize(fontSize === 16 ? 20 : 16)}
          >
            {`Font ${fontSize}px`}
          </button>
          <button
            className="btn btn-sm btn-outline"
            title="Increase font size"
            onClick={() => setFontSize((s) => s + 1)}
          >+
          </button>
          {/* Theme toggle */}
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {/* @ts-expect-error */}
            {theme === "light" ? (window.i18next?.t('app.darkMode') || 'Dark Mode') : (window.i18next?.t('app.lightMode') || 'Light Mode')}
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={handleViewSwitch}
          >
            {/* @ts-expect-error */}
            {view === 'editor' ? (window.i18next?.t('app.showPreview') || 'Show Preview') : (window.i18next?.t('app.showEditor') || 'Show Editor')}
          </button>
          {view === 'editor' && (
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowSideBySide(!showSideBySide)}
            >
              {/* @ts-expect-error */}
              {showSideBySide ? (window.i18next?.t('app.hidePreview') || 'Hide Preview') : (window.i18next?.t('app.showSideBySide') || 'Show Side-by-Side')}
            </button>
          )}
          
        </div>
      </div>

  <div className="flex-1 overflow-hidden" style={{ fontSize: `${fontSize}px` }}>
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-black dark:text-white">
              {/* @ts-expect-error */}
              {window.i18next?.t('app.loading') || 'Loading...'}
            </p>
          </div>
        ) : view === 'editor' ? (
          <div className="w-full h-full">
            <MarkdownEditor
              initialValue={fileContent}
              onChange={handleChange}
              onBlur={handleEditorBlur}
              showPreview={showSideBySide}
              fontSize={fontSize}
            />
          </div>
        ) : (
          <div className="w-full h-full">
            <MarkdownPreview content={fileContent} onChange={handleChange} />
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal preview component using markdown-it
type MarkdownPreviewProps = { content: string; onChange?: (value: string) => void };
const MarkdownPreview = React.memo(({ content, onChange }: MarkdownPreviewProps) => {
  const html = useMemo(() => {
    return md.render(content);
  }, [content]);

  const previewRef = useRef<HTMLDivElement>(null);

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
  }, [content, onChange]);

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
  }, [html]);

  return (
    <div
      ref={previewRef}
      className="w-full h-full overflow-auto p-4 border rounded bg-white text-black dark:bg-gray-800 dark:text-white dark:border-gray-600 transition-all duration-300 markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export default App;

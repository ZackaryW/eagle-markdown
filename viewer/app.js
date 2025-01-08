
let currentTheme = "DARK";

function setTheme(toggle) {
	const simplemdeCSS = document.getElementById("simplemde-css");
	if (toggle) {
		simplemdeCSS.setAttribute("href", `simplemde-theme-bootstrap-dark.min.css?v=${Date.now()}`);
	} else {
		simplemdeCSS.setAttribute("href", `simplemde.min.css?v=${Date.now()}`);
	}
}
async function getCurrentTheme() {
	await new Promise(resolve => setTimeout(resolve, 10)); 
	let theme = eagle.app.theme.toUpperCase();
	console.log("current theme", theme);
	if (theme === "AUTO") {
		theme = eagle.app.isDarkColors() ? "LIGHT" : "DARK";
	} else if (["LIGHT", "DARK"].includes(theme)) {
		;
	} else if (["LIGHTGRAY", "GRAY"].includes(theme)) {
		theme = "LIGHT";
	} else {
		theme = "DARK";
	}
	return theme;	
}

async function updateTheme() {
	const theme = await getCurrentTheme();
	currentTheme = theme;
	setTheme(theme === "DARK");
	
}

eagle.onPluginCreate(async (plugin) => {
	console.log("eagle.onPluginCreate");
	await updateTheme();
	// hijack all outsource links to open in default browser
	document.querySelectorAll(`a[href^="http"]`).forEach((element) => {
		element.addEventListener("click", (event) => {
			event.preventDefault();
			eagle.shell.openExternal(event.target.href);
		});
	});

});

eagle.onThemeChanged(() => {
	updateTheme();
});

eagle.onPluginRun(() => {
	console.log("eagle.onPluginRun");
	updateTheme();

	const urlParams = new URLSearchParams(window.location.search);
	const filePath = urlParams.get("path");

	if (!filePath) {
		console.error("File path not provided in URL parameters.");
		return;
	}

	fetch(filePath)
		.then((response) => {
			if (!response.ok) {
				throw new Error(
					`Network response was not ok: ${response.statusText}`
				);
			}
			return response.text();
		})
		.then(async (text) => {
			const simplemde = new SimpleMDE({
				element: document.getElementById("editor"),
				toolbar: [
					// Default buttons
					"bold", "italic", "heading", "|",
					"quote", "unordered-list", "ordered-list", "|",
					"link", "image", "|",
					"preview", "side-by-side", "fullscreen", "|",
					// Theme toggle button
					{
						name: "theme-toggle",
						action: async function(editor) {
							
							setTheme(currentTheme != "DARK");
							currentTheme = currentTheme === "DARK" ? "LIGHT" : "DARK";
							// updateTheme() will be called automatically via the onThemeChanged event
						},
						className: "fa fa-adjust", // moon/sun toggle icon
						title: "Toggle Theme"
					}
				],
			});
			simplemde.value(text);

			// Add autosave on change
			simplemde.codemirror.on("change", function () {
				const fs = require("fs");
				const markdowncontent = simplemde.value();
				//! WARN still contain errors, need time to fix
				fs.writeFile(filePath, markdowncontent, function (err) {
					if (err) {
						console.error("Error writing file:", err);
					}
				});
			});
		})
		.catch((error) => {
			console.error("Error loading the markdown file:", error);
		});
});

eagle.onPluginShow(() => {
	console.log("eagle.onPluginShow");
});

eagle.onPluginHide(() => {
	console.log("eagle.onPluginHide");
});

eagle.onPluginBeforeExit((event) => {
	console.log("eagle.onPluginBeforeExit");
});

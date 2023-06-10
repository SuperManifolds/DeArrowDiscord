/**
 * @name DeArrow
 * @description Alters the titles and thumbnails of YouTube link previews with crowdsourced replacements that are more descriptive and less sensationalized.
 * @version 1.0.0
 * @author SuperManifolds
 * @authorId 385879184276193290
 * @invite SponsorBlock
 * @source https://github.com/SuperManifolds/DeArrowDiscord/
 * @updateUrl https://raw.githubusercontent.com/ttps://github.com/SuperManifolds/DeArrowDiscord/main/DeArrowDiscord.plugin.js
 */

const config = {
	main: "index.js",
	id: "",
	name: "DeArrow",
	author: "SuperManifolds",
	authorId: "385879184276193290",
	authorLink: "https://github.com/SuperManifolds/",
	version: "1.0.0",
	description: "Alters the titles and thumbnails of YouTube link previews with crowdsourced replacements that are more descriptive and less sensationalized.",
	website: "",
	source: "https://github.com/SuperManifolds/DeArrowDiscord/",
	changelog: [],
};
class Dummy {
	constructor() { this._config = config; }
	start() { }
	stop() { }
}

if (!global.ZeresPluginLibrary) {
	BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.name ?? config.info.name} is missing. Please click Download Now to install it.`, {
		confirmText: "Download Now",
		cancelText: "Cancel",
		onConfirm: () => {
			require("request").get("https://betterdiscord.app/gh-redirect?id=9", async (err, resp, body) => {
				if (err) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
				if (resp.statusCode === 302) {
					require("request").get(resp.headers.location, async (error, response, content) => {
						if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
						await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), content, r));
					});
				}
				else {
					await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
				}
			});
		}
	});
}

module.exports = !global.ZeresPluginLibrary ? Dummy : (([Plugin, Api]) => {
	const plugin = (Plugin, Library) => {
		const { Patcher, DOMTools, WebpackModules, Settings, DiscordModules: { React } } = Library
		const Embed = WebpackModules.find(m => m.prototype?.constructor?.toString().includes('renderSuppressButton'), { searchExports: true });

		function getBrandingInfo(videoId) {
			return new Promise((resolve, reject) => {
				require("request").get("https://sponsor.ajay.app/api/branding?videoID=" + videoId, async (err, response, body) => {
					if (err) {
						return reject(err);
					}
					if (response.statusCode === 200) {
						return resolve(JSON.parse(body));
					}
					return reject(response);
				});
			});
		}

		// Original title formatting code from https://github.com/ajayyy/DeArrow/ licensed LGPL 3.0
		const titleCaseNotCapitalized = [
			"a",
			"an",
			"the",
			"and",
			"but",
			"or",
			"nor",
			"for",
			"yet",
			"so",
			"as",
			"in",
			"of",
			"on",
			"to",
			"from",
			"into",
			"like",
			"over",
			"with",
			"upon",
			"at",
			"by",
			"via",
			"to",
			"vs",
			"v.s.",
			"vs.",
			"ft",
			"ft.",
			"feat",
			"etc.",
			"etc"
		];

		function toSentenceCase(str, isCustom) {
			const words = str.split(" ");
			const inTitleCase = isInTitleCase(words);
			const mostlyAllCaps = isMostlyAllCaps(words);

			let result = "";
			let index = 0;
			for (const word of words) {
				const trustCaps = !mostlyAllCaps &&
					!(isAllCaps(words[index - 1]) || isAllCaps(words[index + 1]));

				if (word.match(/^[Ii]$|^[Ii]['’][a-zA-Z]{1,3}$/)) {
					result += capitalizeFirstLetter(word) + " ";
				} else if (forceKeepFormatting(word)
					|| isAcronymStrict(word)
					|| ((!inTitleCase || !isWordCaptialCase(word)) && trustCaps && isAcronym(word))
					|| (!inTitleCase && isWordCaptialCase(word))
					|| (isCustom && isWordCustomCaptialization(word))
					|| (!isAllCaps(word) && isWordCustomCaptialization(word))) {
					// For custom titles, allow any not just first capital
					// For non-custom, allow any that isn't all caps
					// Trust it with capitalization
					result += word + " ";
				} else {
					if (startOfSentence(index, words)) {
						result += capitalizeFirstLetter(word) + " ";
					} else {
						result += word.toLowerCase() + " ";
					}
				}

				index++;
			}

			return cleanResultingTitle(result);
		}

		function toTitleCase(str, isCustom) {
			const words = str.split(" ");
			const mostlyAllCaps = isMostlyAllCaps(words);

			let result = "";
			let index = 0;
			for (const word of words) {
				const trustCaps = !mostlyAllCaps &&
					!(isAllCaps(words[index - 1]) || isAllCaps(words[index + 1]));

				if (forceKeepFormatting(word)
					|| (isCustom && isWordCustomCaptialization(word))
					|| (!isAllCaps(word) && isWordCustomCaptialization(word))
					|| isYear(word)) {
					// For custom titles, allow any not just first capital
					// For non-custom, allow any that isn't all caps
					result += word + " ";
				} else if (!startOfSentence(index, words) && titleCaseNotCapitalized.includes(word.toLowerCase())) {
					// Skip lowercase check for the first word
					result += word.toLowerCase() + " ";
				} else if (isFirstLetterCaptial(word) &&
					((trustCaps && isAcronym(word)) || isAcronymStrict(word))) {
					// Trust it with capitalization
					result += word + " ";
				} else {
					result += capitalizeFirstLetter(word) + " ";
				}

				index++;
			}

			return cleanResultingTitle(result);
		}

		function toCapitalizeCase(str, isCustom) {
			const words = str.split(" ");
			const mostlyAllCaps = isMostlyAllCaps(words);

			let result = "";
			for (const word of words) {
				if (forceKeepFormatting(word)
					|| (isCustom && isWordCustomCaptialization(word))
					|| (!isAllCaps(word) && isWordCustomCaptialization(word))
					|| (isFirstLetterCaptial(word) &&
						((!mostlyAllCaps && isAcronym(word)) || isAcronymStrict(word)))
					|| isYear(word)) {
					// For custom titles, allow any not just first capital
					// For non-custom, allow any that isn't all caps
					// Trust it with capitalization
					result += word + " ";
				} else {
					result += capitalizeFirstLetter(word) + " ";
				}
			}

			return cleanResultingTitle(result);
		}

		function isInTitleCase(words) {
			let count = 0;
			let ignored = 0;
			for (const word of words) {
				if (isWordCaptialCase(word)) {
					count++;
				} else if (!isWordAllLower(word) ||
					titleCaseNotCapitalized.includes(word.toLowerCase())) {
					ignored++;
				}
			}

			const length = words.length - ignored;
			return (length > 4 && count > length * 0.8) || count >= length;
		}

		function isMostlyAllCaps(words) {
			let count = 0;
			for (const word of words) {
				// Has at least one char and is upper case
				if (isAllCaps(word)) {
					count++;
				}
			}

			return count > words.length * 0.5;
		}

		/**
		 * Has at least one char and is upper case
		 */
		function isAllCaps(word) {
			return !!word && !!word.match(/[a-zA-Z]/)
				&& word.toUpperCase() === word
				&& !isAcronymStrict(word)
				&& !word.match(/^[a-zA-Z]+[-~—]/); // USB-C not all caps
		}

		function capitalizeFirstLetter(word) {
			let result = "";

			for (const char of word) {
				if (char.match(/[a-zA-Z]/)) {
					result += char.toUpperCase() + word.substring(result.length + 1).toLowerCase();
					break;
				} else {
					result += char;
				}
			}

			return result;
		}

		function isWordCaptialCase(word) {
			return !!word.match(/^[^a-zA-Z]*[A-Z][^A-Z]+$/);
		}

		/**
		 * Not just capital at start
		 */
		function isWordCustomCaptialization(word) {
			const capitalMatch = word.match(/[A-Z]/g);
			if (!capitalMatch) return false;

			const capitalNumber = capitalMatch.length;
			return capitalNumber > 1 || (capitalNumber === 1 && !isFirstLetterCaptial(word));
		}

		function isYear(word) {
			return !!word.match(/^[0-9]{2,4}s$/);
		}

		function isWordAllLower(word) {
			return !!word.match(/^[a-z]+$/);
		}

		function isFirstLetterCaptial(word) {
			return !!word.match(/^[^a-zA-Z]*[A-Z]/);
		}

		function forceKeepFormatting(word) {
			return !!word.match(/^>/);
		}

		function isAcronym(word) {
			// 2 - 3 chars, or has dots after each letter except last word
			// U.S.A allowed
			// US allowed
			return (word.length <= 3 && word.length > 1 && isAllCaps(word)) || isAcronymStrict(word);
		}

		function isAcronymStrict(word) {
			// U.S.A allowed
			return !!word.match(/^[^a-zA-Z]*(\S\.)+(\S)?$/);
		}

		function startOfSentence(index, words) {
			return index === 0 || isDelimeter(words[index - 1]);
		}

		function isDelimeter(char) {
			return char.match(/^[-:;~—|]$/) !== null;
		}

		function cleanResultingTitle(title) {
			return cleanPunctuation(title.replace(/>/g, "").trim());
		}

		function cleanPunctuation(title) {
			let toTrim = 0;
			let questionMarkCount = 0;
			for (let i = title.length - 1; i >= 0; i--) {
				toTrim = i;

				if (title[i] === "?") {
					questionMarkCount++;
				} else if (title[i] !== "!" && title[i] !== "." && title[i] !== " ") {
					break;
				}
			}

			let cleanTitle = toTrim === title.length ? title : title.substring(0, toTrim + 1);
			if (questionMarkCount > 0) {
				cleanTitle += "?";
			}

			return cleanTitle;
		}

		return class extends Plugin {
			constructor(meta) {

				super(meta)
				this.meta = meta
				this.defaultSettings = {};
				this.defaultSettings = {};
				this.defaultSettings.titleFormatting = "titleCase";
			}

			onStart() {
				this.patchEmbed()
				DOMTools.addStyle(this.meta.id, `
        .deArrowIcon {
			height: 25px;
			width: 25px;
			position: absolute;
			top: 5px;
			right: 5px;
		}
		.deArrowIcon:hover {
			opacity: 0.7;
		}
		.deArrowIcon.original {
			filter: grayscale(1);
		}
      `)
			}

			onStop() {
				DOMTools.removeStyle(this.meta.id)
				Patcher.unpatchAll()
			}

			formatTitle(title, isCustom) {
				switch (this.settings.titleFormatting) {
					case "capitalizeWords":
						return toCapitalizeCase(title, isCustom);
					case "titleCase":
						return toTitleCase(title, isCustom);
					case "sentenceCase":
						return toSentenceCase(title, isCustom);
					default:
						return cleanResultingTitle(title);
				}
			}

			getSettingsPanel() {
				return Settings.SettingPanel.build(this.saveSettings.bind(this),
					new Settings.Dropdown("Title format", "Title format", this.settings.titleFormatting, [
						{ label: "Title Case", value: "titleCase" },
						{ label: "Sentence case", value: "sentenceCase" },
						{ label: "Capitalize Words", value: "capitalizeWords" },
					], (e) => { this.settings.titleFormatting = e; })
				);
			}

			patchEmbed() {
				Patcher.after(Embed.prototype, 'render', (that, _args, ret) => {
					if (!that.props.embed.provider) { return }
					if (!(that.props.embed.provider.name === "YouTube")) {
						return;
					}
					const videoId = that.props.embed.video.url.split("/embed/")[1];
					ret.props._embedid = that.props.embed.id;
					let originalTitle = ret.props.children.props.children.props.children[3].props.children.props.children || "";
					ret.props._origtitle = originalTitle;
					ret.props.children.props.children.props.children[3].props.children.props.children = this.formatTitle(originalTitle, false);

					getBrandingInfo(videoId).then((response) => {
						let embed = document.querySelector('.embedWrapper-1MtIDg[_embedid="' + that.props.embed.id + '"]')
						if (!embed) {
							return
						}
						if (response.titles.length > 0) {
							let title = response.titles[0].title;
							let formatTitle = this.formatTitle(title, true);
							embed.setAttribute("_brandtitle", formatTitle);
							embed.querySelectorAll('a.embedTitle-2n1pEb').forEach((el) => {
								el.innerText = formatTitle;
							});
						}
						if (response.thumbnails.length > 0) {
							let timestamp = response.thumbnails[0].timestamp;
							let src = "https://dearrow-thumb.ajay.app/api/v1/getThumbnail?videoID=" + videoId + "&time=" + timestamp;
							embed.querySelectorAll('img.embedVideoImageComponentInner-1UCVh2').forEach((el) => {
								embed.setAttribute("_origsrc", el.src);
								embed.setAttribute("_brandsrc", src)
								el.src = src
							});
						} else if (response.videoDuration) {
							let timestamp = response.videoDuration * response.randomTime;
							let src = "https://dearrow-thumb.ajay.app/api/v1/getThumbnail?videoID=" + videoId + "&time=" + timestamp;
							embed.querySelectorAll('img.embedVideoImageComponentInner-1UCVh2').forEach((el) => {
								embed.setAttribute("_origsrc", el.src);
								embed.setAttribute("_brandsrc", src)
								el.src = src;
							});
						}


						const icon = document.createElement('img');
						icon.src = "https://github.com/ajayyy/DeArrow/raw/master/public/icons/logo-128.png";
						icon.className = "deArrowIcon";
						icon.addEventListener("click", this.onBadgeClick.bind(this));

						document.querySelector('.embedWrapper-1MtIDg[_embedid="' + that.props.embed.id + '"]')
							.appendChild(icon);

					}).catch((err) => {
						if (err.statusCode && err.statusCode === 404) {
							return;
						}

						console.error(err);
					});
				});
			}

			onBadgeClick(e) {
				let embed = e.target.parentNode;
				if (e.target.classList.contains("original")) {
					e.target.classList.remove("original");
					embed.querySelector('a.embedTitle-2n1pEb').innerText = embed.getAttribute("_brandtitle");
					embed.querySelector('img.embedVideoImageComponentInner-1UCVh2').src = embed.getAttribute("_brandsrc");
				} else {
					e.target.classList.add("original");
					embed.querySelector('a.embedTitle-2n1pEb').innerText = embed.getAttribute("_origtitle");
					embed.querySelector('img.embedVideoImageComponentInner-1UCVh2').src = embed.getAttribute("_origsrc");
				}
			}
		}
	};
	return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/

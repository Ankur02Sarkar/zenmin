var searchbar = require("searchbar/searchbar.js");
var searchbarPlugins = require("searchbar/searchbarPlugins.js");
var searchbarUtils = require("searchbar/searchbarUtils.js");
var bangsPlugin = require("searchbar/bangsPlugin.js");
var places = require("places/places.js");
var urlParser = require("util/urlParser.js");
var formatRelativeDate = require("util/relativeDate.js");

var tabEditor = require("navbar/tabEditor.js");
var bookmarkEditor = require("searchbar/bookmarkEditor.js");

const maxTagSuggestions = 12;

function parseBookmarkSearch(text) {
    var tags = text
        .split(/\s/g)
        .filter((word) => word.startsWith("#") && word.length > 1)
        .map((t) => t.substring(1));

    var newText = text;
    tags.forEach((word) => {
        newText = newText.replace("#" + word, "");
    });
    newText = newText.trim();
    return {
        tags,
        text: newText,
    };
}

function itemMatchesTags(item, tags) {
    for (var i = 0; i < tags.length; i++) {
        if (!item.tags.filter((t) => t.startsWith(tags[i])).length) {
            return false;
        }
    }
    return true;
}

function showBookmarkEditor(url, item) {
    bookmarkEditor.show(url, item, (newBookmark) => {
        if (newBookmark) {
            if (item.parentNode) {
                // item could be detached from the DOM if the searchbar is closed
                item.parentNode.replaceChild(
                    searchbarUtils.createItem(
                        getBookmarkListItemData(newBookmark),
                    ),
                    item,
                );
            }
        } else {
            places.deleteHistory(url);
            item.remove();
        }
    });
}

function getBookmarkListItemData(result, focus) {
    return {
        title: result.title,
        secondaryText: urlParser.basicURL(urlParser.getSourceURL(result.url)),
        fakeFocus: focus,
        click: (e) => {
            searchbar.openURL(result.url, e);
        },
        classList: ["bookmark-item"],
        delete: () => {
            places.deleteHistory(result.url);
        },
        button: {
            icon: "carbon:edit",
            fn: (el) => {
                showBookmarkEditor(result.url, el.parentNode);
            },
        },
    };
}

const bookmarkManager = {
    showBookmarks: async (text, input, event) => {
        var container = searchbarPlugins.getContainer("bangs");

        var lazyList = searchbarUtils.createLazyList(container.parentNode);

        var parsedText = parseBookmarkSearch(text);

        var displayedURLset = [];

        const results = await places.searchPlaces(parsedText.text, {
            searchBookmarks: true,
            limit: Infinity,
        });
        const suggestedTags = await places.autocompleteTags(parsedText.tags);

        searchbarPlugins.reset("bangs");

        var tagBar = document.createElement("div");
        tagBar.id = "bookmark-tag-bar";
        container.appendChild(tagBar);

        parsedText.tags.forEach((tag) => {
            tagBar.appendChild(
                bookmarkEditor.getTagElement(
                    tag,
                    true,
                    () => {
                        tabEditor.show(
                            tabs.getSelected(),
                            "!bookmarks " + text.replace("#" + tag, "").trim(),
                        );
                    },
                    {
                        autoRemove: false,
                        onModify: () =>
                            bookmarkManager.showBookmarks(text, input, event),
                    },
                ),
            );
        });
        // it doesn't make sense to display tag suggestions if there's a search, since the suggestions are generated without taking the search into account
        if (!parsedText.text) {
            suggestedTags.forEach((suggestion, index) => {
                var el = bookmarkEditor.getTagElement(
                    suggestion,
                    false,
                    () => {
                        var needsSpace =
                            text.slice(-1) !== " " && text.slice(-1) !== "";
                        tabEditor.show(
                            tabs.getSelected(),
                            "!bookmarks " +
                                text +
                                (needsSpace ? " #" : "#") +
                                suggestion +
                                " ",
                        );
                    },
                    {
                        onModify: () =>
                            bookmarkManager.showBookmarks(text, input, event),
                    },
                );
                if (index >= maxTagSuggestions) {
                    el.classList.add("overflowing");
                }
                tagBar.appendChild(el);
            });

            if (suggestedTags.length > maxTagSuggestions) {
                var expandEl = bookmarkEditor.getTagElement(
                    "\u2026",
                    false,
                    () => {
                        tagBar.classList.add("expanded");
                        expandEl.remove();
                    },
                );
                tagBar.appendChild(expandEl);
            }
        }

        var lastRelativeDate = ""; // used to generate headings

        results
            .filter((result) => {
                if (itemMatchesTags(result, parsedText.tags)) {
                    return true;
                } else {
                    return false;
                }
            })
            .sort((a, b) => {
                // order by last visit
                return b.lastVisit - a.lastVisit;
            })
            .forEach((result, index) => {
                displayedURLset.push(result.url);

                var thisRelativeDate = formatRelativeDate(result.lastVisit);
                if (thisRelativeDate !== lastRelativeDate) {
                    searchbarPlugins.addHeading("bangs", {
                        text: thisRelativeDate,
                    });
                    lastRelativeDate = thisRelativeDate;
                }

                var itemData = getBookmarkListItemData(
                    result,
                    index === 0 && parsedText.text,
                );
                var placeholder = lazyList.createPlaceholder();
                container.appendChild(placeholder);
                lazyList.lazyRenderItem(placeholder, itemData);
            });

        if (text === "" && results.length < 3) {
            container.appendChild(
                searchbarUtils.createItem({
                    title: l("importBookmarks"),
                    icon: "carbon:upload",
                    click: () => {
                        searchbar.openURL("!importbookmarks", null);
                    },
                }),
            );
        }

        if (parsedText.tags.length > 0) {
            let suggestedResults = await places.getSuggestedItemsForTags(
                parsedText.tags,
            );

            suggestedResults = suggestedResults.filter(
                (res) => !displayedURLset.includes(res.url),
            );
            if (suggestedResults.length === 0) {
                return;
            }
            searchbarPlugins.addHeading("bangs", {
                text: l("bookmarksSimilarItems"),
            });
            suggestedResults.forEach((result, index) => {
                var item = searchbarUtils.createItem(
                    getBookmarkListItemData(result, false),
                );
                container.appendChild(item);
            });
        }
    },
    initialize: () => {
        bangsPlugin.registerCustomBang({
            phrase: "!bookmarks",
            snippet: l("searchBookmarks"),
            isAction: false,
            showSuggestions: bookmarkManager.showBookmarks,
            fn: (text) => {
                var parsedText = parseBookmarkSearch(text);
                if (!parsedText.text) {
                    return;
                }
                places
                    .searchPlaces(parsedText.text, { searchBookmarks: true })
                    .then((results) => {
                        results = results
                            .filter((r) => itemMatchesTags(r, parsedText.tags))
                            .sort((a, b) => b.lastVisit - a.lastVisit);
                        if (results.length !== 0) {
                            searchbar.openURL(results[0].url, null);
                        }
                    });
            },
        });
    },
};

module.exports = bookmarkManager;

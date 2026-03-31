/* global tabs */

var webviews = require("webviews.js");
const searchEngine = require("util/searchEngine.js");
const urlParser = require("util/urlParser.js");

const places = {
    messagePort: null,
    sendMessage: (data) => {
        places.messagePort.postMessage(data);
    },
    pendingPromises: {},
    invokeWithPromise: (data) => {
        const callbackId = Math.random();
        const { promise, resolve, reject } = Promise.withResolvers();
        places.pendingPromises[callbackId] = { promise, resolve, reject };
        places.messagePort.postMessage({
            ...data,
            callbackId,
        });
        return promise;
    },
    replyToPromise: (callbackId, result) => {
        if (places.pendingPromises[callbackId]) {
            places.pendingPromises[callbackId].resolve(result);
            delete places.pendingPromises[callbackId];
        } else {
            throw new Error("places is missing callbackId");
        }
    },
    savePage: (tabId, extractedText) => {
        /* this prevents pages that are immediately left from being saved to history, and also gives the page-favicon-updated event time to fire (so the colors saved to history are correct). */
        setTimeout(() => {
            const tab = tabs.get(tabId);
            if (tab) {
                const data = {
                    url: urlParser.removeTextFragment(
                        urlParser.getSourceURL(tab.url),
                    ), // for PDF viewer and reader mode, save the original page URL and not the viewer URL
                    title: tab.title,
                    color: tab.backgroundColor,
                    extractedText: extractedText,
                };

                places.sendMessage({
                    action: "updatePlace",
                    pageData: data,
                    flags: {
                        isNewVisit: true,
                    },
                });
            }
        }, 500);
    },
    receiveHistoryData: (tabId, args) => {
        // called when js/preload/textExtractor.js returns the page's text content

        var tab = tabs.get(tabId);
        var data = args[0];

        if (tab.url.startsWith("data:") || tab.url.length > 5000) {
            /*
      very large URLs cause performance issues. In particular:
      * they can cause the database to grow abnormally large, which increases memory usage and startup time
      * they can cause the browser to hang when they are displayed in search results
      To avoid this, don't save them to history
      */
            return;
        }

        /* if the page is an internal page, it normally shouldn't be saved,
     unless the page represents another page (such as the PDF viewer or reader view) */
        var isNonIndexableInternalPage =
            urlParser.isInternalURL(tab.url) &&
            urlParser.getSourceURL(tab.url) === tab.url;
        var isSearchPage = !!searchEngine.getSearch(tab.url);

        // full-text data from search results isn't useful
        if (isSearchPage) {
            data.extractedText = "";
        }

        // don't save to history if in private mode, or the page is a browser page (unless it contains the content of a normal page)
        if (tab.private === false && !isNonIndexableInternalPage) {
            places.savePage(tabId, data.extractedText);
        }
    },
    deleteHistory: (url) => {
        places.sendMessage({
            action: "deleteHistory",
            pageData: {
                url: url,
            },
        });
    },
    deleteAllHistory: () => {
        places.sendMessage({
            action: "deleteAllHistory",
        });
    },
    searchPlaces: (text, options) =>
        places.invokeWithPromise({
            action: "searchPlaces",
            text: text,
            options: options,
        }),
    searchPlacesFullText: (text) =>
        places.invokeWithPromise({
            action: "searchPlacesFullText",
            text: text,
        }),
    getPlaceSuggestions: (url) =>
        places.invokeWithPromise({
            action: "getPlaceSuggestions",
            text: url,
        }),
    onMessage: (e) => {
        if (e.data.callbackId) {
            places.replyToPromise(e.data.callbackId, e.data.result);
        }
    },
    getItem: (url) =>
        places.invokeWithPromise({
            action: "getPlace",
            pageData: {
                url: url,
            },
        }),
    getAllItems: () =>
        places.invokeWithPromise({
            action: "getAllPlaces",
        }),
    updateItem: (url, fields) =>
        places.invokeWithPromise({
            action: "updatePlace",
            pageData: {
                url: url,
                ...fields,
            },
        }),
    toggleTag: (url, tag) =>
        places.getItem(url).then((item) => {
            if (!item) {
                return;
            }
            if (item.tags.includes(tag)) {
                item.tags = item.tags.filter((t) => t !== tag);
            } else {
                item.tags.push(tag);
            }
            places.sendMessage({
                action: "updatePlace",
                pageData: {
                    url: url,
                    tags: item.tags,
                },
            });
        }),
    getSuggestedTags: (url) =>
        places.invokeWithPromise({
            action: "getSuggestedTags",
            pageData: {
                url: url,
            },
        }),
    getAllTagsRanked: (url) =>
        places.invokeWithPromise({
            action: "getAllTagsRanked",
            pageData: {
                url: url,
            },
        }),
    getSuggestedItemsForTags: (tags) =>
        places.invokeWithPromise({
            action: "getSuggestedItemsForTags",
            pageData: {
                tags: tags,
            },
        }),
    autocompleteTags: (tags) =>
        places.invokeWithPromise({
            action: "autocompleteTags",
            pageData: {
                tags: tags,
            },
        }),
    getHistory: () =>
        places.invokeWithPromise({
            action: "getAllPlaces",
        }),
    initialize: () => {
        const { port1, port2 } = new MessageChannel();

        ipc.postMessage("places-connect", null, [port1]);
        places.messagePort = port2;
        port2.addEventListener("message", places.onMessage);
        port2.start();

        webviews.bindIPC("pageData", places.receiveHistoryData);
    },
};

places.initialize();
module.exports = places;

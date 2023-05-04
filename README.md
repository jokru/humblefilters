# Humblefilters
This is a browser extension (currently) for firefox, which enabled different filters for items available on the humbldebundle website and humble store. Filters include:
- Steam owned games marking
- Steam wishlisted games highlighting
- Marking all but selected platform


#  TODO:
- Improve options css
- Make different filters optional
- Make chrome version with polyfill (See below)
- Some games may have different names on humlbe and steam

# Current issues
- Games on a wrong platform, but wishlisted on steam show both css styles (no picture, strikethrough text, but highlighted color)
- Getting DLC data is not possible (for some DLC at least, like the skyrim anniversary edition)


# The Chrome problem
- As of version something, Chrome doesn't let frontend extension code make CORS requests (such as the ones needed to get Steam data)
- A background script, may be able to make the request, so I could move the request to background and call the background from the front
- However, chrome no longer allows new extensions with manifest V2 on their store
- Chrome Manifest V3 replaces background scripts with service workers
- Firefox Manifest V3 doesn't (at least yet)

So I would need two separate manifests for the browsers, I'll get to it if I get to it someday.

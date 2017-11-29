serve:
	firebase serve --only hosting,functions

update-videos:
	curl http://a1.phobos.apple.com/us/r1000/000/Features/atv/AutumnResources/videos/entries.json > public/videos.json

.PHONY: serve update-videos

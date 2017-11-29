serve:
	firebase serve --only hosting,functions

update-videos:
	curl http://a1.phobos.apple.com/us/r1000/000/Features/atv/AutumnResources/videos/entries.json > public/videos.json
	curl https://sylvan.apple.com/Aerials/2x/entries.json > public/videos4k.json
	@echo "TODO: remove trailing commas in public/videos4k.json"
	
.PHONY: serve update-videos

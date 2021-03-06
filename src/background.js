/* global chrome */
function generateHeaders(auth) {
	if (!auth) {
		return {};
	}
	const hash = btoa(`${auth.username}:${auth.password}`);
	return {
		Accept: 'application/json',
		Authorization: `Basic ${hash}`,
	};
}

// At this point you might want to think, WHY would you want to do
// these requests in a background page instead of the content script?
// This is because Movieo is served over HTTPS, so it won't accept requests to
// HTTP servers. Unfortunately, many people use Radarr over HTTP.
function viewRadarr(request, sendResponse) {
	fetch(`${request.url}?id=${request.imdbId}`, {
		headers: generateHeaders(request.basicAuth),
	})
	.then(res => res.json())
	.then((res) => {
		const success = res.success;
		sendResponse({ success, status: success ? res.media.status : null });
	})
	.catch((err) => {
		sendResponse({ err: String(err) });
	});
}

function addRadarr(request, sendResponse) {
	fetch(request.url, {
		method: 'post',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'X-Api-Key': request.radarrToken,
		},
		body: JSON.stringify({
			title: request.itemOptions.title,
			year: request.itemOptions.year,
			profileId: '6',
			monitored: true,
			minimumAvailability: 'preDB',
			tmdbId: request.itemOptions.tmdbId,
			titleSlug: request.itemOptions.title,
			qualityProfileId: 0,
			rootFolderPath: '/storage/Movies/',
			addOptions: {
				searchForMovie: true,
			},
			images: [{
				coverType: 'poster',
				url: 'http://image.tmdb.org/t/p/original',
			}],
		}),
	})
	.then(res => res.json())
	.then((res) => {
		if (res && res[0] && res[0].errorMessage) {
			sendResponse({ err: res[0].errorMessage });
		} else if (res && res.path) {
			sendResponse({ success: 'Added to ' + res.path });
		} else {
			sendResponse({ err: 'unknown error' });
		}
	})
	.catch((err) => {
		sendResponse({ err: String(err) });
	});
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === 'VIEW_RADARR') {
		viewRadarr(request, sendResponse);
		return true;
	}

	if (request.type === 'ADD_RADARR') {
		addRadarr(request, sendResponse);
		return true;
	}

	return false;
});

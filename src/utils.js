/* eslint-disable no-unused-vars */
/* global config */
function wait(check, then) {
	if (check()) {
		then();
	} else {
		setTimeout(() => wait(check, then), 50);
	}
}

function getPlexMediaRequest(options) {
	const type = options.type || 'movie';

	const headers = {
		'X-Plex-Token': config.server.token,
		Accept: 'application/json',
	};
	const url = `${config.server.url}/hubs/search`;

	// i.e. Letterboxd can contain special white-space characters. Plex doesn't like this.
	const title = encodeURIComponent(options.title.replace(/\s/g, ' '));
	return fetch(`${url}?query=title:${title}`, {
		headers,
	})
	.then(res => res.json())
	.then((data) => {
		const hub = data.MediaContainer.Hub.find(myHub => myHub.type === type);
		if (!hub || !hub.Metadata) {
			return { found: false };
		}

		// This is fucked up, but Plex' definition of a year is year when it was available,
		// not when it was released (which is Movieo's definition).
		// For examples, see Bone Tomahawk, The Big Short, The Hateful Eight.
		// So we'll first try to find the movie with the given year, and then + 1 it.
		let media = hub.Metadata.find(meta => meta.year === options.year);
		if (!media) {
			media = hub.Metadata.find(meta => meta.year === options.year + 1);
		}
		let key = null;
		if (media) {
			key = media.key.replace('/children', '');
		}

		return { found: !!media, key };
	});
}

function _getOptions() {
	const storage = chrome.storage.sync || chrome.storage.local;

	return new Promise((resolve, reject) => {
		function handleOptions(items) {
			if (!items.plexToken || !items.servers) {
				reject(new Error('Unset options.'));
				return;
			}

			// For now we support only one Plex server, but the options already
			// allow multiple for easy migration in the future.
			const options = {
				server: items.servers[0],
				tmdbToken: items.tmdbToken,
			};
			if (items.radarrBasicAuthUsername) {
				options.radarrBasicAuth = {
					username: items.radarrBasicAuthUsername,
					password: items.radarrBasicAuthPassword,
				};
			}
			if (items.radarrUrlRoot && items.radarrToken) {
				options.radarrUrl = items.radarrUrlRoot;
				options.radarrToken = items.radarrToken;
			}

			resolve(options);
		}
		storage.get(null, (items) => {
			if (chrome.runtime.lastError) {
				chrome.storage.local.get(null, handleOptions);
			} else {
				handleOptions(items);
			}
		});
	});
}

let config;
function parseOptions() {
	return _getOptions().then((options) => {
		config = options;
	}, (err) => {
		showNotification(
			'warning',
			'Not all options for the Web to Plex extension are filled in.',
			15000
		);
		throw err;
	});
}

function getPlexMediaUrl(plexMachineId, key) {
	return `https://app.plex.tv/web/app#!/server/${plexMachineId}/details?key=${encodeURIComponent(key)}`;
}

let notificationTimeout;
function showNotification(state, text, timeout) {
	if (notificationTimeout) {
		clearTimeout(notificationTimeout);
		notificationTimeout = null;
	}
	const existingEl = document.querySelector('.web-to-plex-notification');
	if (existingEl) {
		document.body.removeChild(existingEl);
	}

	const el = document.createElement('div');
	el.classList.add('web-to-plex-notification');
	if (state === 'warning') {
		el.classList.add('web-to-plex-warning');
	}
	el.textContent = text;
	document.body.appendChild(el);
	notificationTimeout = setTimeout(() => {
		document.body.removeChild(el);
	}, timeout || 5000);
}

function _maybeAddToRadarr(options) {
	if (!options.tmdbId) {
		console.log('Cancelled adding to Radarr since there is no IMDB ID');
		return;
	}
	chrome.runtime.sendMessage({
		type: 'VIEW_RADARR',
		url: `${config.radarrUrl}/api/movie`,
		itemOptions: options,
		basicAuth: config.radarrBasicAuth,
	}, (res) => {
		const movieExists = res.success;
		if (res.err) {
			showNotification('warning', 'Radarr request failed (look in DevTools for more info)');
			console.error('Error with viewing on Radarr:', res.err);
			return;
		}
		if (!movieExists) {
			_addToRadarrRequest(options);
			return;
		}
		showNotification('info', `Movie is already in Radarr (status: ${res.status})`);
	});
}

function _addToRadarrRequest(options) {
	chrome.runtime.sendMessage({
		type: 'ADD_RADARR',
		url: `${config.radarrUrl}/api/movie`,
		itemOptions: options,
		basicAuth: config.radarrBasicAuth,
	}, (res) => {
		if (res.err) {
			showNotification('warning', 'Could not add to Radarr.' + res.err);
			console.error('Error with adding on Radarr:', res.err);
			return;
		} else if (res.success) {
			showNotification('info', 'Added movie on Radarr.');
		} else {
			showNotification('warning', 'Could not add to Radarr. Unknown Error');
		}
	});
}

function modifyPlexButton(el, action, title, options) {
	el.style.removeProperty('display');
	if (action === 'found') {
		el.href = getPlexMediaUrl(config.server.id, options.key);
		el.textContent = 'On Plex';
		el.classList.add('web-to-plex-button--found');
	}
	if (action === 'notfound' || action === 'error') {
		el.removeAttribute('href');
		el.textContent = action === 'notfound' ? 'Not on Plex' : 'Plex error';
		el.classList.remove('web-to-plex-button--found');
	}
	if (action === 'radarr') {
		el.href = '#';
		el.textContent = 'Download';
		el.classList.add('web-to-plex-button--radarr');
		el.addEventListener('click', (e) => {
			e.preventDefault();
			// _maybeAddToRadarr(options);
			_addToRadarrRequest(options)
		});
	}

	if (title) {
		el.title = title;
	}
}

function findPlexMedia(options) {
	getPlexMediaRequest(options)
	.then(({ found, key }) => {
		if (found) {
			modifyPlexButton(options.button, 'found', 'Found on Plex', {key});
		} else {
			const showRadarr = config.radarrUrl && options.type !== 'show';
			const action = showRadarr ? 'radarr' : 'notfound';
			const title = showRadarr ? 'Could not find, add on Radarr?' : 'Could not find on Plex';
			modifyPlexButton(options.button, action, title, options);
		}
	})
	.catch((err) => {
		modifyPlexButton(options.button, 'error', 'Request to your Plex Media Server failed.');
		console.error('Request to Plex failed', err);
	});
}

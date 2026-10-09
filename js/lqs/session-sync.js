/**
 * Syncs local LQS.change events with the Node session server and applies
 * remote events (e.g. from MCP) onto the open canvas.
 */
class LQS_SessionSync {
	/**
	 * @param {LQS} lqs
	 * @param {{ sessionId?: string, clientId?: string, baseUrl?: string }} [opts]
	 */
	constructor(lqs, opts) {
		this.lqs = lqs;
		this.sessionId = (opts && opts.sessionId) || this._param('session') || 'default';
		this.clientId = (opts && opts.clientId) || ('browser-' + Math.random().toString(36).slice(2));
		this.baseUrl = (opts && opts.baseUrl) || '';
		this.ws = null;
		this._applyingRemote = false;
		this._seq = 0;
	}

	/**
	 * Load layout from the server, open the WebSocket, and hook change events.
	 * @returns {Promise<void>}
	 */
	async start() {
		const data = await this._fetchJson('/api/sessions/' + encodeURIComponent(this.sessionId));
		this._seq = data.eventCount || 0;
		if (data.layout) {
			this.lqs.setLayout(data.layout);
		}

		this.lqs.eventListeners.push((event) => this._onLocalEvent(event));
		this._connectWs();
	}

	/**
	 * @param {object} event
	 */
	_onLocalEvent(event) {
		if (this._applyingRemote) {
			return;
		}
		const payload = Object.assign({}, event, { clientId: this.clientId });
		this._fetchJson('/api/sessions/' + encodeURIComponent(this.sessionId) + '/events', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		}).then((result) => {
			if (result && typeof result.seq === 'number') {
				this._seq = result.seq;
			}
		}).catch((err) => {
			console.warn('session sync failed', err);
		});
	}

	_connectWs() {
		const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
		const url = proto + '//' + location.host + '/ws?session=' +
			encodeURIComponent(this.sessionId) +
			'&clientId=' + encodeURIComponent(this.clientId);
		this.ws = new WebSocket(url);
		this.ws.onmessage = (msg) => {
			let data;
			try {
				data = JSON.parse(msg.data);
			} catch (e) {
				return;
			}
			if (data.type === 'event' && data.event) {
				if (data.seq && data.seq <= this._seq) {
					return;
				}
				if (data.seq) {
					this._seq = data.seq;
				}
				this._applyRemote(data.event);
			} else if (data.type === 'layout' && data.layout) {
				this._applyingRemote = true;
				try {
					this.lqs.setLayout(data.layout);
				} finally {
					this._applyingRemote = false;
				}
			}
		};
		this.ws.onclose = () => {
			setTimeout(() => this._connectWs(), 1500);
		};
	}

	/**
	 * @param {object} event
	 */
	_applyRemote(event) {
		this._applyingRemote = true;
		try {
			this.lqs.change(event);
		} finally {
			this._applyingRemote = false;
		}
	}

	/**
	 * @param {string} pathname
	 * @param {RequestInit} [init]
	 */
	async _fetchJson(pathname, init) {
		const response = await fetch(this.baseUrl + pathname, init);
		const body = await response.json();
		if (!response.ok && response.status !== 409) {
			throw new Error((body && body.error) || response.statusText);
		}
		return body;
	}

	/**
	 * @param {string} name
	 */
	_param(name) {
		return new URLSearchParams(location.search).get(name);
	}
}

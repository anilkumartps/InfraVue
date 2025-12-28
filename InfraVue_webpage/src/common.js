// Use the current window origin in the browser so frontend can connect
// to the server that served the page. Falls back to localhost for SSR/tests.
const SERVER_IP = (typeof window !== 'undefined' && window.location && window.location.origin)
	? window.location.origin
	: 'http://localhost:3000';

export default SERVER_IP;

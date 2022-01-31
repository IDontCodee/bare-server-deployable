import { v1 } from './V1.mjs';
import { Response } from './Response.mjs';

export class Server {
	versions = {
		v1,
	};
	prefix = '/';
	fof = this.json(404, { message: 'Not found.' });
	constructor(directory){
		if(typeof directory != 'string'){
			throw new Error('Directory must be specified.')
		}

		if(!directory.startsWith('/') || !directory.endsWith('/')){
			throw new RangeError('Directory must start and end with /');
		}

		this.directory = directory;
	}
	json(status, json){
		const send = Buffer.from(JSON.stringify(json, null, '\t'));

		return new Response(send, status, {
			'content-type': 'application/json',
			'content-length': send.byteLength,
		});
	}
	route_request(request, response){
		if(request.url.startsWith(this.directory)){
			this.request(request, response);
			return true;
		}else{
			return false;
		}
	}
	route_upgrade(request, socket, head){
		if(request.url.startsWith(this.directory)){
			this.upgrade(request, socket, head);
			return true;
		}else{
			return false;
		}
	}
	get instance_info(){
		return {
			versions: Object.keys(this.versions),
			language: 'NodeJS',
			memoryUsage: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
			requestReceived: Date.now(),
		};
	}
	async upgrade(request, socket, head){
		try{
			await SendSocket(this, request, socket, head);
		}catch(err){
			console.error(err);
			socket.end();
		}
	}
	async request(server_request, server_response){
		const service = server_request.url.slice(this.directory.length - 1);
		let response;

		try{
			switch(service){
				case'/':

					if(server_request.method != 'GET')response = this.json(405, { message: 'This route only accepts the GET method.' });
					else response = this.json(200, this.instance_info);

					break;
				case'/v1/':

					response = await this.versions.v1(server_request);

					break;
				default:

					response = this.fof;

			}
		}catch(err){
			console.error(err);
			
			response = this.json(400, {
				message: `TOMPServer encountered an exception while handling your request. Contact this server's administrator.`,
			});
		}

		if(!(response instanceof Response)){
			console.error('Response to', server_request.url, 'was not a response.');
			response = this.fof;
		}
		
		response.send(server_response);
	}
};